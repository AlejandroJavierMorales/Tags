// =====================================
// FILE: /app/api/resto/admin/kitchen/list/route.js
// Descripción:
// Devuelve la cola operativa de Cocina de Tags Resto.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";

function clean(value) {

    return String(
        value || ""
    ).trim();

}

function normalize(value) {

    return clean(value)
        .toLowerCase();

}

function safeNumber(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;

}

function buildOrder(session) {

    return {

        id:
            session.id,

        resto_session_id:
            session.id,

        order_number:
            session.order_number,

        session_status:
            session.status,

        location_id:
            session.location_id,

        location_name:
            session.location_name,

        table_name:
            session.location_type === "table"
                ? session.location_name
                : null,

        parent_location_name:
            session.parent_location_name,

        service_mode:
            session.service_mode,

        subtotal:
            safeNumber(
                session.subtotal
            ),

        total:
            safeNumber(
                session.total
            ),

        created_at:
            session.created_at,

        updated_at:
            session.updated_at,

        notes:
            session.notes,

        metadata_json:
            session.metadata_json,

        items: []

    };

}

export async function GET(req) {

    try {

        const {
            searchParams
        } =
            new URL(req.url);

        const businessId =
            clean(
                searchParams.get(
                    "businessId"
                )
            );

        if (!businessId) {

            return Response.json(
                {
                    error:
                        "businessId es requerido"
                },
                {
                    status: 400
                }
            );

        }

        const [
            storeRows
        ] =
            await db.query(
                `
                SELECT
                    id,
                    business_id,
                    page_id,
                    slug,
                    name,
                    status,
                    app_type
                FROM tags_stores
                WHERE business_id = ?
                  AND app_type='resto'
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows[0];

        if (!store) {

            return Response.json(
                {
                    error:
                        "Tags Resto no encontrado"
                },
                {
                    status: 404
                }
            );

        }

        const [
            sessionRows
        ] =
            await db.query(
                `
                SELECT
                    s.*,

                    l.name
                        AS location_name,

                    l.location_type,

                    parent_location.name
                        AS parent_location_name

                FROM tags_resto_sessions s

                LEFT JOIN tags_resto_locations l
                    ON l.id = s.location_id
                   AND l.store_id = s.store_id

                LEFT JOIN tags_resto_locations parent_location
                    ON parent_location.id = l.parent_id
                   AND parent_location.store_id = s.store_id

                WHERE s.store_id = ?

                ORDER BY
                    s.created_at ASC,
                    s.id ASC
                `,
                [
                    store.id
                ]
            );

        const sessionIds =
            sessionRows.map(
                session =>
                    session.id
            );

        let itemsBySession =
            {};

        let kitchenQueue =
            [];

        if (sessionIds.length) {
            const [
                itemRows
            ] =
                await db.query(
                    `
                    SELECT

                        i.id,
                        i.session_id,
                        i.product_id,
                        i.variant_id,

                        i.title,
                        i.variant_title,

                        i.quantity,

                        i.unit_price,
                        i.total_price,

                        i.notes,

                        i.requires_preparation,
                        i.preparation_status,
                        i.preparation_sent_at,

                        s.order_number,
                        s.created_at
                            AS order_created_at,

                        l.name
                            AS location_name,

                        l.location_type,

                        parent_location.name
                            AS parent_location_name

                    FROM tags_resto_session_items i

                    INNER JOIN tags_resto_sessions s
                        ON s.id = i.session_id

                    LEFT JOIN tags_resto_locations l
                        ON l.id = s.location_id

                    LEFT JOIN tags_resto_locations parent_location
                        ON parent_location.id = l.parent_id

                    WHERE
                        i.session_id IN (${sessionIds.map(() => "?").join(",")})
                        AND i.requires_preparation = 1
                        AND i.preparation_status = 'sent'

                    ORDER BY

                        COALESCE(
                            i.preparation_sent_at,
                            s.created_at
                        ) ASC,

                        i.id ASC
                    `,
                    sessionIds
                );

            itemsBySession =
                {};

            kitchenQueue =
                [];

            itemRows.forEach(item => {

                if (
                    !itemsBySession[
                    item.session_id
                    ]
                ) {

                    itemsBySession[
                        item.session_id
                    ] = [];

                }

                itemsBySession[
                    item.session_id
                ].push(item);

                kitchenQueue.push({

                    id:
                        item.id,

                    session_id:
                        item.session_id,

                    order_number:
                        item.order_number,

                    table_name:
                        item.location_type === "table"
                            ? item.location_name
                            : null,

                    location_name:
                        item.location_name,

                    parent_location_name:
                        item.parent_location_name,

                    product_id:
                        item.product_id,

                    variant_id:
                        item.variant_id,

                    title:
                        item.title,

                    variant_title:
                        item.variant_title,

                    quantity:
                        safeNumber(
                            item.quantity
                        ),

                    notes:
                        item.notes,

                    preparation_status:
                        item.preparation_status,

                    preparation_sent_at:
                        item.preparation_sent_at,

                    order_created_at:
                        item.order_created_at

                });

            });

        }

        const orders =
            [];

        sessionRows.forEach(session => {

            const pendingItems =
                itemsBySession[
                session.id
                ] || [];

            if (
                !pendingItems.length
            ) {

                return;

            }

            const order =
                buildOrder(
                    session
                );

            order.items =
                pendingItems;

            orders.push(
                order
            );

        });

        kitchenQueue.sort(
            (
                a,
                b
            ) => {
                const dateA =
                    new Date(
                        a.preparation_sent_at ||
                        a.order_created_at
                    ).getTime();

                const dateB =
                    new Date(
                        b.preparation_sent_at ||
                        b.order_created_at
                    ).getTime();

                if (dateA !== dateB) {

                    return dateA - dateB;

                }

                return (
                    a.id -
                    b.id
                );

            }
        );

        const stats = {

            total_orders:
                orders.length,

            total_items:
                kitchenQueue.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        safeNumber(
                            item.quantity
                        ),
                    0
                ),

            oldest_minutes:
                kitchenQueue.length
                    ? Math.max(
                        ...kitchenQueue.map(
                            item =>
                                Math.floor(
                                    (
                                        Date.now() -
                                        new Date(
                                            item.preparation_sent_at ||
                                            item.order_created_at
                                        ).getTime()
                                    ) / 60000
                                )
                        )
                    )
                    : 0,

            average_wait_minutes:
                kitchenQueue.length
                    ? Math.round(
                        kitchenQueue.reduce(
                            (
                                total,
                                item
                            ) => {

                                return (
                                    total +
                                    (
                                        Date.now() -
                                        new Date(
                                            item.preparation_sent_at ||
                                            item.order_created_at
                                        ).getTime()
                                    ) / 60000
                                );

                            },
                            0
                        ) /
                        kitchenQueue.length
                    )
                    : 0

        };

        return Response.json({

            ok: true,

            storeId:
                store.id,

            store,

            orders,

            queue:
                kitchenQueue,

            stats

        });

    }

    catch (err) {

        console.error(
            "RESTO KITCHEN LIST ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error obteniendo la cola de cocina"
            },
            {
                status: 500
            }
        );

    }
}