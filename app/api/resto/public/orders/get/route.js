// =====================================
// FILE: app/api/resto/public/orders/get/route.js
// Descripción:
// Obtiene la sesión activa y su pedido público,
// incluyendo comercio, ubicación, sector y QR asociado.
// Consolida las filas enviadas y pendientes de un mismo
// producto para mostrarlas como un único ítem al cliente.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import {
    ensureDeliveryRecords,
    syncDeliveryOperationalStates
} from "@/app/modules/resto/lib/delivery/restoDeliveryService";

function money(value) {

    return Number(
        Number(value || 0).toFixed(2)
    );

}

function getItemGroupKey(item) {

    const productId =
        item.product_id ?? null;

    const variantId =
        item.variant_id ?? null;

    const options =
        typeof item.options_json ===
            "string"
            ? item.options_json
            : JSON.stringify(
                item.options_json || {}
            );

    const notes =
        String(
            item.notes || ""
        ).trim();

    /*
    Los productos sin product_id no deben mezclarse
    entre sí porque pueden ser ítems manuales distintos.
    */

    if (!productId) {

        return `item:${item.id}`;

    }

    return [
        `product:${productId}`,
        `variant:${variantId || 0}`,
        `options:${options}`,
        `notes:${notes}`
    ].join("|");

}

function consolidateItems(items) {

    const groups = new Map();

    for (const item of items) {

        const key = getItemGroupKey(item);
        const quantity = Number(item.quantity || 0);
        const status = item.preparation_status || "pending";

        if (!groups.has(key)) {

            groups.set(key, {
                ...item,
                quantity: 0,
                total_price: 0,
                sent_quantity: 0,
                pending_quantity: 0,
                ready_quantity: 0,
                served_quantity: 0,
                cancelled_quantity: 0,
                sent_item_ids: [],
                pending_item_ids: [],
                source_item_ids: [],
                pending_item_id: null,
                sent_item_id: null
            });

        }

        const groupedItem = groups.get(key);

        groupedItem.quantity += quantity;
        groupedItem.total_price +=
            Number(item.total_price || 0);
        groupedItem.source_item_ids.push(item.id);

        const quantityField =
            `${status}_quantity`;

        if (quantityField in groupedItem) {

            groupedItem[quantityField] += quantity;

        }

        if (status === "sent") {

            groupedItem.sent_item_ids.push(item.id);
            groupedItem.sent_item_id ||=
                item.id;

        }

        if (status === "pending") {

            groupedItem.pending_item_ids.push(item.id);
            groupedItem.pending_item_id ||=
                item.id;

        }

        groupedItem.id =
            groupedItem.pending_item_id ||
            groupedItem.sent_item_id ||
            item.id;

    }

    return Array.from(groups.values()).map(
        (item) => {

            const statuses = [
                "pending",
                "sent",
                "ready",
                "served",
                "cancelled"
            ];

            const preparationStatus =
                statuses.find(
                    (status) =>
                        Number(
                            item[
                                `${status}_quantity`
                            ] || 0
                        ) > 0
                ) || "pending";

            return {
                ...item,
                quantity:
                    Number(item.quantity || 0),
                total_price:
                    money(item.total_price),
                preparation_status:
                    preparationStatus
            };

        }
    );

}

function buildTracking(
    session,
    items,
    requests,
    delivery = null
) {

    const quantities = {
        pending: 0,
        sent: 0,
        ready: 0,
        served: 0,
        cancelled: 0
    };

    const hasServedPreparedItem =
        items.some(
            item =>
                Number(
                    item.requires_preparation
                ) === 1 &&
                item.preparation_status ===
                "served"
        );

    for (const item of items) {

        let status =
            item.preparation_status || "pending";

        if (
            Number(
                item.requires_preparation
            ) === 0 &&
            status === "pending" &&
            [
                "open",
                "bill_requested"
            ].includes(
                session.status
            )
        ) {

            status =
                hasServedPreparedItem
                    ? "served"
                    : "ready";

        }

        if (status in quantities) {

            quantities[status] +=
                Number(item.quantity || 0);

        }

    }

    const activeRequests =
        requests.filter(
            (request) =>
                request.status === "pending" ||
                request.status === "acknowledged"
        );

    const waiterRequest =
        activeRequests.find(
            (request) =>
                request.request_type === "call_waiter"
        ) || null;

    const billRequest =
        activeRequests.find(
            (request) =>
                request.request_type === "request_bill"
        ) || null;

    const total =
        quantities.pending +
        quantities.sent +
        quantities.ready +
        quantities.served;

    const prepared =
        quantities.ready +
        quantities.served;

    let code = "pending";
    let label = "Pedido pendiente";
    let message =
        "Tu pedido todavía no fue enviado a cocina.";

    if (
        session.status ===
        "pending_activation"
    ) {
        code = "pending_activation";
        label = "Esperando habilitación de la mesa";
        message =
            "El personal recibió tu solicitud.";
    } else if (
        session.status ===
        "pending_confirmation"
    ) {
        code = "pending_confirmation";
        label = "Pedido enviado";
        message =
            "El restaurante debe confirmar tu pedido.";
    } else if (session.status === "cancelled") {
        code = "cancelled";
        label = "Pedido cancelado";
        message = "Este pedido fue cancelado.";
    } else if (session.status === "closed") {
        code = "closed";
        label = "Pedido cerrado";
        message = "El pedido ya fue finalizado.";
    } else if (
        session.payment_status === "paid" ||
        (
            Number(session.total || 0) > 0 &&
            Number(session.paid_total || 0) >=
                Number(session.total || 0)
        )
    ) {
        code = "paid";
        label = "Pedido pagado";
        message = "El pago fue registrado correctamente.";
    } else if (
        session.status === "bill_requested" ||
        billRequest
    ) {
        code = "bill_requested";
        label = "Cuenta solicitada";
        message =
            "El personal recibió tu solicitud de cuenta.";
    } else if (quantities.sent > 0) {
        code = "preparing";
        label = "Estamos preparando tu pedido";
        message =
            `${prepared} de ${total} productos listos.`;
    } else if (
        quantities.ready > 0 &&
        quantities.pending === 0
    ) {
        code = "ready";
        label = "Tu pedido está listo";
        message = "Está esperando ser entregado.";
    } else if (
        quantities.served > 0 &&
        quantities.pending === 0 &&
        quantities.sent === 0 &&
        quantities.ready === 0
    ) {
        code = "served";
        label = "Pedido entregado";
        message = "Buen provecho.";
    }

    if (
        session.service_mode ===
            "delivery" &&
        delivery
    ) {
        const deliveryCopy = {
            pending_confirmation: {
                code:
                    "pending_confirmation",
                label:
                    "Esperando confirmación",
                message:
                    "El restaurante debe confirmar tu pedido."
            },
            preparing: {
                code:
                    "preparing",
                label:
                    "Estamos preparando tu pedido",
                message:
                    `${prepared} de ${total} productos listos.`
            },
            ready_for_dispatch: {
                code:
                    "delivery_ready",
                label:
                    "Pedido listo para despachar",
                message:
                    "Estamos buscando un repartidor para tu pedido."
            },
            assigned: {
                code:
                    "delivery_assigned",
                label:
                    "Repartidor asignado",
                message:
                    delivery.driver_name
                        ? `${delivery.driver_name} retirará tu pedido.`
                        : "Tu pedido ya tiene un repartidor asignado."
            },
            picked_up: {
                code:
                    "delivery_picked_up",
                label:
                    "El repartidor retiró tu pedido",
                message:
                    "En breve comenzará el viaje hacia tu domicilio."
            },
            in_transit: {
                code:
                    "delivery_in_transit",
                label:
                    "Tu pedido está en camino",
                message:
                    delivery.driver_name
                        ? `${delivery.driver_name} está llevando tu pedido.`
                        : "El repartidor está llevando tu pedido."
            },
            delivered: {
                code:
                    "delivery_delivered",
                label:
                    "Pedido entregado",
                message:
                    "La entrega fue registrada correctamente."
            },
            failed: {
                code:
                    "delivery_failed",
                label:
                    "No pudimos completar la entrega",
                message:
                    delivery.issue_notes ||
                    "El restaurante se comunicará con vos."
            },
            cancelled: {
                code:
                    "delivery_cancelled",
                label:
                    "Entrega cancelada",
                message:
                    delivery.issue_notes ||
                    "Comunicate con el restaurante para coordinar tu pedido."
            }
        };

        const copy =
            deliveryCopy[
                delivery.status
            ];

        if (copy) {
            code =
                copy.code;
            label =
                copy.label;
            message =
                copy.message;
        }
    }

    return {
        code,
        label,
        message,
        quantities,
        total,
        prepared,
        waiter_request: waiterRequest,
        bill_request: billRequest,
        delivery:
            delivery
                ? {
                    status:
                        delivery.status,
                    driver_name:
                        delivery.driver_name ||
                        null,
                    driver_phone:
                        delivery.driver_phone ||
                        null,
                    assigned_at:
                        delivery.assigned_at,
                    ready_at:
                        delivery.ready_at,
                    picked_up_at:
                        delivery.picked_up_at,
                    in_transit_at:
                        delivery.in_transit_at,
                    delivered_at:
                        delivery.delivered_at,
                    collection_required:
                        Number(
                            delivery.collection_required
                        ) === 1,
                    amount_to_collect:
                        money(
                            delivery.amount_to_collect
                        )
                }
                : null
    };

}

export async function POST(req) {

    let conn;

    try {

        const rawBody = await req.text();
        let body = {};
        if (rawBody.trim()) {
            try { body = JSON.parse(rawBody); }
            catch { return Response.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 }); }
        }

        const {

            sessionToken

        } = body;

        if (!sessionToken) {

            return Response.json(
                {
                    error:
                        "sessionToken es requerido."
                },
                {
                    status: 400
                }
            );

        }

        conn =
            await db.getConnection();

        /*
        =====================================
        SESIÓN ENRIQUECIDA
        =====================================
        */

        const sql =
            `
            SELECT
                s.*,

                st.name AS store_name,
                st.logo_url AS store_logo_url,
                st.app_type AS store_app_type,
                st.description AS store_description,
                st.slug AS store_slug,

                l.name AS location_name,
                l.location_code AS location_code,
                l.location_type AS location_type,
                l.description AS location_description,
                l.icon AS location_icon,
                l.capacity AS location_capacity,

                parent.name AS parent_location_name,
                parent.location_code AS parent_location_code,
                parent.location_type AS parent_location_type,

                qr.id AS qr_code_id,
                qr.code AS qr_code,
                qr.label AS qr_label

            FROM
                tags_resto_sessions s

            INNER JOIN
                tags_stores st
                    ON st.id = s.store_id

            LEFT JOIN
                tags_resto_locations l
                    ON l.id = s.location_id
                    AND l.store_id = s.store_id

            LEFT JOIN
                tags_resto_locations parent
                    ON parent.id = l.parent_id
                    AND parent.store_id = s.store_id

            LEFT JOIN
                tags_qr_codes qr
                    ON qr.id = COALESCE(
                        s.source_qr_code_id,
                        l.qr_code_id
                    )

            WHERE s.session_token = ?
            `;

        const finalSql =
            sql +
            `
            LIMIT 1
            `;

        const [sessions] =
            await conn.query(
                finalSql,
                [
                    sessionToken
                ]
            );

        if (!sessions.length) {

            return Response.json(
                {
                    error:
                        "Sesión no encontrada."
                },
                {
                    status: 404
                }
            );

        }

        const session =
            sessions[0];

        /*
        =====================================
        ITEMS REALES
        =====================================
        */

        const [rawItems] =
            await conn.query(
                `
                SELECT
                    *
                FROM
                    tags_resto_session_items
                WHERE
                    session_id = ?
                ORDER BY
                    id ASC
                `,
                [
                    session.id
                ]
            );

        /*
        =====================================
        ITEMS CONSOLIDADOS PARA EL CLIENTE
        =====================================
        */

        const items =
            consolidateItems(
                rawItems
            );

        const [serviceRequests] =
            await conn.query(
                `
                SELECT
                    id,
                    request_type,
                    status,
                    notes,
                    requested_at
                FROM
                    tags_resto_service_requests
                WHERE
                    session_id = ?
                ORDER BY
                    id DESC
                `,
                [
                    session.id
                ]
            );

        let delivery =
            null;

        if (
            session.service_mode ===
            "delivery"
        ) {
            await ensureDeliveryRecords(
                conn,
                session.store_id
            );

            await syncDeliveryOperationalStates(
                conn,
                session.store_id
            );

            const [deliveryRows] =
                await conn.query(
                    `
                    SELECT
                        d.status,
                        d.collection_required,
                        d.amount_to_collect,
                        d.assigned_at,
                        d.ready_at,
                        d.picked_up_at,
                        d.in_transit_at,
                        d.delivered_at,
                        d.issue_notes,
                        st.name AS driver_name,
                        st.phone AS driver_phone
                    FROM tags_resto_deliveries d
                    LEFT JOIN tags_resto_staff st
                        ON st.id = d.assigned_staff_id
                        AND st.store_id = d.store_id
                    WHERE d.session_id = ?
                    AND d.store_id = ?
                    LIMIT 1
                    `,
                    [
                        session.id,
                        session.store_id
                    ]
                );

            delivery =
                deliveryRows[0] ||
                null;

        }

        /*
        =====================================
        RECALCULAR TOTALES
        =====================================
        */

        const subtotal =
            money(
                rawItems.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        Number(
                            item.total_price || 0
                        ),
                    0
                )
            );

        const discount =
            money(
                session.discount_total
            );

        const total =
            money(
                Math.max(
                    0,
                    subtotal - discount
                )
            );

        /*
        =====================================
        TOTALES DE LA RESPUESTA
        =====================================
        */

        session.subtotal =
            subtotal;

        session.total =
            total;

        if (delivery) {
            delivery.amount_to_collect =
                money(
                    Math.max(
                        total -
                        Number(
                            session.paid_total ||
                            0
                        ),
                        0
                    )
                );

            delivery.collection_required =
                delivery.amount_to_collect >
                0
                    ? 1
                    : 0;
        }

        const tracking =
            buildTracking(
                session,
                rawItems,
                serviceRequests,
                delivery
            );

        const [reviewRows] =
            await conn.query(
                `SELECT id, average_rating, is_public, created_at
                 FROM tags_client_review_responses
                 WHERE store_id = ? AND order_id = ?
                 AND verified_purchase = 1
                 ORDER BY id DESC LIMIT 1`,
                [session.store_id, session.id]
            );

        /*
        =====================================
        RESPUESTA
        =====================================
        */

        return Response.json(
            {
                success: true,

                session,

                items,

                tracking,

                delivery:
                    tracking.delivery,

                review:
                    reviewRows?.[0] || null,

                service_requests:
                    serviceRequests,

                totals: {
                    subtotal,
                    discount,
                    total
                }
            }
        );

    } catch (error) {

        console.error(
            "GET RESTO ORDER:",
            error
        );

        return Response.json(
            {
                error:
                    "Error interno del servidor.",
                ...(
                    process.env.NODE_ENV ===
                    "development"
                        ? {
                            detail:
                                error?.message ||
                                String(error)
                        }
                        : {}
                )
            },
            {
                status: 500
            }
        );

    } finally {

        if (conn) {

            conn.release();

        }

    }

}
