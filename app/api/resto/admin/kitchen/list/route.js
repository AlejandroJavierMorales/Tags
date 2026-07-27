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

import {
    parseRestoOrderMetadata
} from "@/app/modules/resto/lib/orders";

import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

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

function parseSettingsJson(value) {

    if (!value) {

        return {};

    }

    if (
        typeof value ===
        "object"
    ) {

        return value;

    }

    try {

        return JSON.parse(
            value
        );

    }

    catch {

        return {};

    }

}

function positiveNumber(
    value,
    fallback
) {

    const number =
        Number(value);

    return Number.isFinite(number) &&
        number > 0
        ? number
        : fallback;

}

function normalizeSession(session) {

    const metadata =
        parseRestoOrderMetadata(
            session?.metadata_json
        );

    const locationName =
        session.location_name ||
        metadata.location_name ||
        metadata.table_name ||
        null;

    const parentLocationName =
        session.parent_location_name ||
        metadata.parent_location_name ||
        null;

    return {

        ...session,

        resto_session_id:
            session.id,

        order_number:
            session.order_number,

        location_name:
            locationName,

        parent_location_name:
            parentLocationName,

        table_name:
            session.location_type === "table"
                ? locationName
                : null,

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

        const access =
            await getRestoAccess({
                businessId,
                permission:
                    "kitchen.view"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
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
                    app_type,
                    settings_json
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

        const storeSettings =
            parseSettingsJson(
                store.settings_json
            );

        const savedKitchenSettings =
            storeSettings
                ?.resto_kitchen ||
            storeSettings
                ?.kitchen ||
            {};

        const kitchenSettings = {

            autoRefreshSeconds:
                positiveNumber(
                    savedKitchenSettings
                        ?.auto_refresh_seconds ??
                    savedKitchenSettings
                        ?.autoRefreshSeconds,
                    10
                ),

            warningMinutes:
                positiveNumber(
                    savedKitchenSettings
                        ?.preparation_warning_minutes ??
                    savedKitchenSettings
                        ?.warningMinutes,
                    10
                ),

            urgentMinutes:
                positiveNumber(
                    savedKitchenSettings
                        ?.preparation_critical_minutes ??
                    savedKitchenSettings
                        ?.urgentMinutes,
                    20
                ),

            cardWidth:
                positiveNumber(
                    savedKitchenSettings
                        ?.cardWidth,
                    350
                ),

            cardHeight:
                positiveNumber(
                    savedKitchenSettings
                        ?.cardHeight,
                    620
                )

        };

        const [
            sessionRows
        ] =
            await db.query(
                `
                SELECT
                    s.*,

                    l.name AS location_name,
                    l.location_type,
                    l.location_code,

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
                AND s.status NOT IN (
                    'closed',
                    'cancelled'
                )

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

        let itemsBySession = {};
        let queue = [];

        if (sessionIds.length) {

            const [
                itemRows
            ] =
                await db.query(
                    `
                    SELECT
                        id,
                        session_id,
                        product_id,
                        variant_id,
                        title,
                        variant_title,
                        quantity,
                        unit_price,
                        total_price,
                        notes,
                        requires_preparation,
                        preparation_status,
                        preparation_sent_at

                    FROM tags_resto_session_items

                    WHERE
                        session_id IN (${sessionIds.map(() => "?").join(",")})
                        AND requires_preparation = 1
                        AND preparation_status = 'sent'

                    ORDER BY
                        COALESCE(preparation_sent_at,NOW()),
                        id
                    `,
                    sessionIds
                );

            itemRows.forEach(item => {
                if (!itemsBySession[item.session_id]) {

                    itemsBySession[
                        item.session_id
                    ] = [];

                }

                itemsBySession[
                    item.session_id
                ].push(item);

                queue.push({

                    id:
                        item.id,

                    session_id:
                        item.session_id,

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
                        item.preparation_sent_at

                });

            });

        }

        const orders = [];

        sessionRows.forEach(session => {

            const pendingItems =
                itemsBySession[
                session.id
                ] || [];

            if (!pendingItems.length) {

                return;

            }

            const order =
                normalizeSession(
                    session
                );

            order.items =
                pendingItems;

            order.items_count =
                pendingItems.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        safeNumber(
                            item.quantity
                        ),
                    0
                );

            order.pending_items =
                pendingItems.length;

            order.oldest_item_at =
                pendingItems.reduce(
                    (
                        oldest,
                        item
                    ) => {

                        const current =
                            item.preparation_sent_at ||
                            session.created_at;

                        if (!oldest) {

                            return current;

                        }

                        return new Date(current) <
                            new Date(oldest)
                            ? current
                            : oldest;

                    },
                    null
                );

            orders.push(order);

        });

        queue.sort(
            (
                a,
                b
            ) => {

                const timeA =
                    new Date(
                        a.preparation_sent_at
                    ).getTime();

                const timeB =
                    new Date(
                        b.preparation_sent_at
                    ).getTime();

                if (timeA !== timeB) {

                    return timeA - timeB;

                }

                return (
                    a.id -
                    b.id
                );

            }
        );

        const itemsInPreparation =
            queue.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    safeNumber(
                        item.quantity
                    ),
                0
            );

        const waitingRows =
            queue.map(
                item => {

                    const sentAt =
                        new Date(
                            item.preparation_sent_at
                        ).getTime();

                    const minutes =
                        Number.isFinite(
                            sentAt
                        )
                            ? Math.max(
                                0,
                                (
                                    Date.now() -
                                    sentAt
                                ) /
                                60000
                            )
                            : 0;

                    return {
                        minutes,
                        quantity:
                            safeNumber(
                                item.quantity
                            )
                    };

                }
            );

        const stats = {

            orders_in_kitchen:
                orders.length,

            items_in_preparation:
                itemsInPreparation,

            total_orders:
                orders.length,

            total_items:
                itemsInPreparation,

            oldest_minutes:
                waitingRows.length
                    ? Math.floor(
                        Math.max(
                            ...waitingRows.map(
                                row =>
                                    row.minutes
                            )
                        )
                    )
                    : 0,

            average_wait_minutes:
                itemsInPreparation > 0
                    ? Math.round(
                        waitingRows.reduce(
                            (
                                total,
                                row
                            ) =>
                                total +
                                (
                                    row.minutes *
                                    row.quantity
                                ),
                            0
                        ) /
                        itemsInPreparation
                    )
                    : 0

        };


        return Response.json({

            ok: true,

            storeId:
                store.id,

            store,

            kitchenSettings,

            orders,

            queue,

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
