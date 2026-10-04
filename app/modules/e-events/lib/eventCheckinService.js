import { db } from "@/app/lib/tags-db";
import { requireEventAccess } from "./eventApiAccess";

export class EventCheckinError extends Error {
    constructor(message, status = 400, code = "checkin_error") {
        super(message);
        this.status = status;
        this.code = code;
    }
}

async function findAttendeeReference({ code = "", token = "" }) {
    const cleanCode =
        String(code || "").trim();

    const cleanToken =
        String(token || "").trim();

    if (!cleanCode && !cleanToken) {
        throw new EventCheckinError(
            "QR inválido",
            400,
            "missing_qr"
        );
    }

    const [[attendee]] =
        await db.query(
            `
            SELECT
                a.id,
                a.event_id
            FROM tags_event_attendees a
            LEFT JOIN tags_qr_codes q
                ON q.id = a.qr_code_id
            WHERE
                (? <> '' AND q.code = ?)
                OR
                (? <> '' AND a.qr_token = ?)
            LIMIT 1
            `,
            [
                cleanCode,
                cleanCode,
                cleanToken,
                cleanToken
            ]
        );

    if (!attendee) {
        throw new EventCheckinError(
            "QR no encontrado",
            404,
            "attendee_not_found"
        );
    }

    return attendee;
}

export async function validateEventTicket(token) {
    const cleanToken =
        String(token || "").trim();

    if (!cleanToken) {
        throw new EventCheckinError(
            "Token requerido",
            400,
            "missing_token"
        );
    }

    const [[attendee]] =
        await db.query(
            `
            SELECT
                a.id,
                a.name,
                a.status,
                a.checked_in_at,
                e.id AS event_id,
                e.name AS event_name,
                e.status AS event_status,
                e.starts_at,
                e.ends_at,
                e.location
            FROM tags_event_attendees a
            INNER JOIN tags_events e
                ON e.id = a.event_id
            WHERE a.qr_token = ?
            LIMIT 1
            `,
            [cleanToken]
        );

    if (!attendee) {
        throw new EventCheckinError(
            "Acceso inválido",
            404,
            "attendee_not_found"
        );
    }

    return {
        ...attendee,
        can_check_in:
            attendee.event_status === "active"
            && attendee.status === "confirmed"
    };
}

export async function checkInEventAttendee({
    code = "",
    token = "",
    eventId = null,
    request
}) {
    const reference =
        await findAttendeeReference({
            code,
            token
        });

    if (
        eventId
        && Number(eventId) !== Number(reference.event_id)
    ) {
        throw new EventCheckinError(
            "El QR pertenece a otro evento",
            409,
            "wrong_event"
        );
    }

    const access =
        await requireEventAccess({
            eventId: reference.event_id,
            permission: "checkin.scan"
        });

    if (!access.ok) {
        throw new EventCheckinError(
            access.error,
            access.status,
            "access_denied"
        );
    }

    const connection =
        await db.getConnection();

    try {
        await connection.beginTransaction();

        const [[attendee]] =
            await connection.query(
                `
                SELECT
                    a.id,
                    a.event_id,
                    a.qr_code_id,
                    a.name,
                    a.email,
                    a.phone,
                    a.status,
                    a.checked_in_at,
                    e.name AS event_name,
                    e.status AS event_status,
                    q.code AS qr_code
                FROM tags_event_attendees a
                INNER JOIN tags_events e
                    ON e.id = a.event_id
                LEFT JOIN tags_qr_codes q
                    ON q.id = a.qr_code_id
                WHERE a.id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [reference.id]
            );

        if (!attendee) {
            throw new EventCheckinError(
                "Asistente no encontrado",
                404,
                "attendee_not_found"
            );
        }

        if (attendee.event_status !== "active") {
            throw new EventCheckinError(
                attendee.event_status === "cancelled"
                    ? "El evento está cancelado"
                    : "El evento no está habilitado para acreditar ingresos",
                409,
                "event_not_active"
            );
        }

        if (attendee.status === "checked_in") {
            await connection.rollback();
            return {
                ok: true,
                already_used: true,
                attendee
            };
        }

        if (attendee.status === "cancelled") {
            throw new EventCheckinError(
                "La inscripción está cancelada",
                403,
                "attendee_cancelled"
            );
        }

        if (attendee.status !== "confirmed") {
            throw new EventCheckinError(
                "La asistencia todavía no está confirmada",
                409,
                "attendee_not_confirmed"
            );
        }

        const [update] =
            await connection.query(
                `
                UPDATE tags_event_attendees
                SET
                    status = 'checked_in',
                    checked_in_at = NOW(),
                    updated_at = NOW()
                WHERE id = ?
                    AND status = 'confirmed'
                `,
                [attendee.id]
            );

        if (!update.affectedRows) {
            await connection.rollback();
            return {
                ok: true,
                already_used: true,
                attendee
            };
        }

        await connection.query(
            `
            INSERT INTO tags_event_checkins
            (
                event_id,
                attendee_id,
                qr_code_id,
                created_at,
                ip,
                device_info
            )
            VALUES (?,?,?,NOW(),?,?)
            `,
            [
                attendee.event_id,
                attendee.id,
                attendee.qr_code_id,
                String(
                    request?.headers?.get("x-forwarded-for")
                    || request?.headers?.get("x-real-ip")
                    || ""
                ).split(",")[0].trim(),
                String(
                    request?.headers?.get("user-agent")
                    || ""
                ).slice(0, 1000)
            ]
        );

        await connection.commit();

        return {
            ok: true,
            attendee: {
                ...attendee,
                status: "checked_in",
                checked_in_at: new Date()
            }
        };
    } catch (error) {
        try {
            await connection.rollback();
        } catch {}

        if (error?.code === "ER_DUP_ENTRY") {
            return {
                ok: true,
                already_used: true,
                attendee_id: reference.id
            };
        }

        throw error;
    } finally {
        connection.release();
    }
}
