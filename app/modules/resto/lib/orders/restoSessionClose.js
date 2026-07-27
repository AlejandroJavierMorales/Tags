function numeric(value) {
    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}

function closeValidationError(
    message,
    status = 409
) {
    const error =
        new Error(message);

    error.status =
        status;

    return error;
}

export async function getRestoSessionCloseState(
    connection,
    sessionId
) {
    const [rows] =
        await connection.query(
            `
            SELECT
                s.id,
                s.status,
                s.service_mode,
                COALESCE(s.total, 0) AS total,
                COALESCE(s.paid_total, 0) AS paid_total,
                (
                    SELECT COUNT(*)
                    FROM tags_resto_session_items i
                    WHERE i.session_id = s.id
                    AND i.preparation_status IN (
                        'pending',
                        'sent',
                        'ready'
                    )
                ) AS blocking_items,
                (
                    SELECT COUNT(*)
                    FROM tags_resto_service_requests sr
                    WHERE sr.session_id = s.id
                    AND sr.status IN (
                        'pending',
                        'acknowledged'
                    )
                ) AS pending_requests
            FROM tags_resto_sessions s
            WHERE s.id = ?
            LIMIT 1
            `,
            [sessionId]
        );

    const row =
        rows[0];

    if (!row) {
        return null;
    }

    const total =
        numeric(row.total);
    const paidTotal =
        numeric(row.paid_total);
    const pendingAmount =
        Math.max(
            total - paidTotal,
            0
        );
    const blockingItems =
        Number(
            row.blocking_items ||
            0
        );
    const pendingRequests =
        Number(
            row.pending_requests ||
            0
        );

    return {
        ...row,
        total,
        paidTotal,
        pendingAmount,
        blockingItems,
        pendingRequests,
        canClose:
            pendingAmount <= 0 &&
            blockingItems === 0 &&
            pendingRequests === 0
    };
}

export async function assertRestoSessionCanClose(
    connection,
    sessionId
) {
    const state =
        await getRestoSessionCloseState(
            connection,
            sessionId
        );

    if (!state) {
        throw closeValidationError(
            "La sesión no existe",
            404
        );
    }

    if (state.blockingItems > 0) {
        throw closeValidationError(
            "Todavía hay productos pendientes, en preparación o sin entregar"
        );
    }

    if (state.pendingAmount > 0) {
        throw closeValidationError(
            "La sesión todavía tiene saldo pendiente"
        );
    }

    if (state.pendingRequests > 0) {
        throw closeValidationError(
            "Todavía hay solicitudes del cliente sin atender"
        );
    }

    return state;
}
