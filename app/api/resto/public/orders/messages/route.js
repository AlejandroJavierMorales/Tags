export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";

function cleanMessage(value) {
    return String(value || "").trim().slice(0, 2000);
}

async function getSession(connection, sessionToken) {
    const [rows] = await connection.query(
        `
        SELECT
            s.id,
            s.store_id,
            s.customer_name,
            s.status
        FROM tags_resto_sessions s
        INNER JOIN tags_stores st
            ON st.id = s.store_id
            AND st.app_type = 'resto'
        WHERE s.session_token = ?
        LIMIT 1
        `,
        [sessionToken]
    );

    return rows[0] || null;
}

async function getMessages(connection, sessionId) {
    const [rows] = await connection.query(
        `
        SELECT
            id,
            sender_type,
            sender_name,
            message,
            read_by_customer_at,
            read_by_staff_at,
            created_at
        FROM tags_resto_order_messages
        WHERE session_id = ?
        ORDER BY id ASC
        LIMIT 250
        `,
        [sessionId]
    );

    return rows;
}

export async function POST(req) {
    let connection;

    try {
        const rawBody = await req.text();
        let body = {};
        if (rawBody.trim()) {
            try {
                body = JSON.parse(rawBody);
            } catch {
                return Response.json(
                    { error: "El cuerpo de la solicitud no es JSON válido." },
                    { status: 400 }
                );
            }
        }
        const sessionToken = String(body?.sessionToken || "").trim();
        const action = String(body?.action || "list").trim();

        if (!sessionToken) {
            return Response.json(
                { error: "sessionToken es requerido." },
                { status: 400 }
            );
        }

        connection = await db.getConnection();
        const session = await getSession(connection, sessionToken);

        if (!session) {
            return Response.json(
                { error: "Pedido inexistente." },
                { status: 404 }
            );
        }

        if (action === "send") {
            const message = cleanMessage(body?.message);

            if (!message) {
                return Response.json(
                    { error: "Escribí un mensaje." },
                    { status: 400 }
                );
            }

            if (["closed", "cancelled"].includes(session.status)) {
                return Response.json(
                    { error: "Este pedido ya no admite mensajes." },
                    { status: 400 }
                );
            }

            await connection.query(
                `
                INSERT INTO tags_resto_order_messages
                (
                    store_id,
                    session_id,
                    sender_type,
                    sender_name,
                    message,
                    read_by_customer_at,
                    created_at
                )
                VALUES (?, ?, 'customer', ?, ?, NOW(), NOW())
                `,
                [
                    session.store_id,
                    session.id,
                    session.customer_name || "Cliente",
                    message
                ]
            );
        }

        await connection.query(
            `
            UPDATE tags_resto_order_messages
            SET read_by_customer_at = COALESCE(
                read_by_customer_at,
                NOW()
            )
            WHERE session_id = ?
            AND sender_type = 'staff'
            AND read_by_customer_at IS NULL
            `,
            [session.id]
        );

        const messages = await getMessages(connection, session.id);

        return Response.json({
            ok: true,
            messages
        });
    } catch (err) {
        console.error("RESTO PUBLIC ORDER MESSAGES ERROR:", err);

        return Response.json(
            {
                error:
                    err?.code === "ER_NO_SUCH_TABLE"
                        ? "La mensajería todavía no está habilitada."
                        : err.message || "No se pudo cargar la conversación."
            },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}
