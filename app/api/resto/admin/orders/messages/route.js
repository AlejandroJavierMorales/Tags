export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";

import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

function cleanMessage(value) {
    return String(value || "").trim().slice(0, 2000);
}

export async function POST(req) {
    let connection;

    try {
        const rawBody = await req.text();
        let body = {};
        if (rawBody.trim()) {
            try { body = JSON.parse(rawBody); }
            catch { return Response.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 }); }
        }
        const businessId = String(body?.businessId || "").trim();
        const orderId = Number(body?.orderId || 0);
        const action = String(body?.action || "list").trim();

        if (!businessId || !orderId) {
            return Response.json(
                { error: "businessId y orderId son requeridos." },
                { status: 400 }
            );
        }

        const access = await getRestoAccess({
            businessId,
            permission: "orders.view"
        });

        if (!access.allowed) {
            return restoAccessResponse(access);
        }

        connection = await db.getConnection();

        const [sessionRows] = await connection.query(
            `
            SELECT
                s.id,
                s.store_id,
                s.status
            FROM tags_resto_sessions s
            INNER JOIN tags_stores st
                ON st.id = s.store_id
                AND st.business_id = ?
                AND st.app_type = 'resto'
            WHERE s.id = ?
            LIMIT 1
            `,
            [businessId, orderId]
        );

        const order = sessionRows[0];

        if (!order) {
            return Response.json(
                { error: "Pedido no encontrado." },
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

            if (["closed", "cancelled"].includes(order.status)) {
                return Response.json(
                    { error: "Este pedido ya no admite mensajes." },
                    { status: 400 }
                );
            }

            const senderName =
                access?.session?.name ||
                access?.session?.user_name ||
                "Restaurante";

            await connection.query(
                `
                INSERT INTO tags_resto_order_messages
                (
                    store_id,
                    session_id,
                    sender_type,
                    sender_name,
                    message,
                    read_by_staff_at,
                    created_at
                )
                VALUES (?, ?, 'staff', ?, ?, NOW(), NOW())
                `,
                [
                    order.store_id,
                    order.id,
                    senderName,
                    message
                ]
            );
        }

        await connection.query(
            `
            UPDATE tags_resto_order_messages
            SET read_by_staff_at = COALESCE(
                read_by_staff_at,
                NOW()
            )
            WHERE session_id = ?
            AND sender_type = 'customer'
            AND read_by_staff_at IS NULL
            `,
            [order.id]
        );

        const [messages] = await connection.query(
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
            [order.id]
        );

        return Response.json({
            ok: true,
            messages
        });
    } catch (err) {
        console.error("RESTO ADMIN ORDER MESSAGES ERROR:", err);

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
