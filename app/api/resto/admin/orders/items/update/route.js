// =====================================
// FILE: /app/api/resto/admin/orders/items/update/route.js
// Descripción:
// Administra productos y descuentos de un pedido de Tags Resto.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";
import { getRestoAccess, restoAccessResponse } from "@/app/modules/resto/lib/staff/getRestoAccess";
import { logRestoAudit } from "@/app/modules/resto/lib/staff/restoAudit";
import {
    getRestoProductAvailability
} from "@/app/modules/resto/lib/products/restoProductAvailability";

const VALID_ACTIONS = [
    "add_item",
    "remove_item",
    "apply_discount"
];

function clean(value) {

    return String(
        value || ""
    ).trim();

}

function money(value) {

    return Number(
        Number(
            value ||
            0
        ).toFixed(
            2
        )
    );

}

function safe(value) {

    return (
        value ===
        undefined ||
        value ===
        null ||
        value ===
        ""
    )
        ? null
        : value;

}

async function recalculateOrder(
    connection,
    session,
    discountTotal
) {

    const [
        totalRows
    ] =
        await connection.query(
            `
            SELECT
                COALESCE(
                    SUM(total_price),
                    0
                ) AS subtotal
            FROM tags_resto_session_items
            WHERE session_id = ?
            `,
            [
                session.id
            ]
        );

    const subtotal =
        money(
            totalRows[0]
                ?.subtotal
        );

    const normalizedDiscount =
        Math.min(
            subtotal,
            Math.max(
                0,
                money(
                    discountTotal
                )
            )
        );

    const total =
        money(
            Math.max(
                0,
                subtotal -
                normalizedDiscount
            )
        );

    await connection.query(
        `
        UPDATE tags_resto_sessions
        SET
            subtotal = ?,
            discount_total = ?,
            total = ?,
            updated_at = NOW()
        WHERE id = ?
        AND store_id = ?
        LIMIT 1
        `,
        [
            subtotal,
            normalizedDiscount,
            total,
            session.id,
            session.store_id
        ]
    );

    return {
        subtotal,
        discountTotal:
            normalizedDiscount,
        total,
        paidTotal:
            money(
                session.paid_total
            ),
        pendingAmount:
            Math.max(
                0,
                money(
                    total -
                    money(
                        session.paid_total
                    )
                )
            )
    };

}

export async function POST(
    req
) {

    const connection =
        await db.getConnection();

    let transactionStarted =
        false;

    try {

        const body =
            await req.json();

        const businessId =
            clean(
                body?.businessId
            );

        const orderId =
            Number(
                body?.orderId
            );

        const action =
            clean(
                body?.action
            ).toLowerCase();

        if (
            !businessId ||
            !Number.isInteger(
                orderId
            ) ||
            orderId <= 0
        ) {

            return Response.json(
                {
                    error:
                        "businessId y orderId son requeridos"
                },
                {
                    status:
                        400
                }
            );

        }

        if (
            !VALID_ACTIONS.includes(
                action
            )
        ) {

            return Response.json(
                {
                    error:
                        "Acción inválida"
                },
                {
                    status:
                        400
                }
            );

        }

        const access = await getRestoAccess({ businessId, permission: "orders.items" });
        if (!access.allowed) return restoAccessResponse(access);

        await connection.beginTransaction();

        transactionStarted =
            true;

        const [
            storeRows
        ] =
            await connection.query(
                `
                SELECT
                    id,
                    business_id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'resto'
                LIMIT 1
                FOR UPDATE
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows[0];

        if (!store) {

            await connection.rollback();

            transactionStarted =
                false;

            return Response.json(
                {
                    error:
                        "Tags Resto no encontrado"
                },
                {
                    status:
                        404
                }
            );

        }

        const [
            sessionRows
        ] =
            await connection.query(
                `
                SELECT *
                FROM tags_resto_sessions
                WHERE id = ?
                AND store_id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [
                    orderId,
                    store.id
                ]
            );

        const session =
            sessionRows[0];

        if (!session) {

            await connection.rollback();

            transactionStarted =
                false;

            return Response.json(
                {
                    error:
                        "Pedido no encontrado"
                },
                {
                    status:
                        404
                }
            );

        }

        if (
            [
                "closed",
                "cancelled"
            ].includes(
                clean(
                    session.status
                ).toLowerCase()
            ) ||
            clean(
                session.payment_status
            ).toLowerCase() ===
                "paid"
        ) {

            await connection.rollback();

            transactionStarted =
                false;

            return Response.json(
                {
                    error:
                        "El pedido está cerrado y no puede modificarse"
                },
                {
                    status:
                        409
                }
            );

        }

        let discountTotal =
            money(
                session.discount_total
            );

        let result = {};

        if (
            action ===
            "remove_item"
        ) {

            const itemId =
                Number(
                    body?.itemId
                );

            const [
                itemRows
            ] =
                await connection.query(
                    `
                    SELECT *
                    FROM tags_resto_session_items
                    WHERE id = ?
                    AND session_id = ?
                    LIMIT 1
                    FOR UPDATE
                    `,
                    [
                        itemId,
                        session.id
                    ]
                );

            const item =
                itemRows[0];

            if (!item) {

                await connection.rollback();

                transactionStarted =
                    false;

                return Response.json(
                    {
                        error:
                            "Plato no encontrado"
                    },
                    {
                        status:
                            404
                    }
                );

            }

            const preparationStatus =
                clean(
                    item.preparation_status ||
                    "pending"
                ).toLowerCase();

            if (
                Number(
                    item.requires_preparation
                ) === 1 &&
                ![
                    "pending",
                    "sent"
                ].includes(
                    preparationStatus
                )
            ) {

                await connection.rollback();

                transactionStarted =
                    false;

                return Response.json(
                    {
                        error:
                            "Solo se pueden eliminar platos pendientes o enviados a cocina"
                    },
                    {
                        status:
                            409
                    }
                );

            }

            await connection.query(
                `
                DELETE FROM tags_resto_session_items
                WHERE id = ?
                AND session_id = ?
                LIMIT 1
                `,
                [
                    item.id,
                    session.id
                ]
            );

            result = {
                removedItemId:
                    item.id
            };

        }

        if (
            action ===
            "add_item"
        ) {

            const productId =
                Number(
                    body?.productId
                );

            const variantId =
                body?.variantId
                    ? Number(
                        body.variantId
                    )
                    : null;

            const quantity =
                Math.max(
                    1,
                    Math.trunc(
                        Number(
                            body?.quantity ||
                            1
                        )
                    )
                );

            const notes =
                safe(
                    clean(
                        body?.notes
                    )
                );

            const [
                productRows
            ] =
                await connection.query(
                    `
                    SELECT
                        p.*,
                        (
                            SELECT COUNT(*)
                            FROM tags_store_variants v
                            WHERE v.product_id = p.id
                            AND v.is_visible = 1
                        ) AS variants_count
                    FROM tags_store_products p
                    WHERE p.id = ?
                    AND p.store_id = ?
                    AND p.is_visible = 1
                    LIMIT 1
                    `,
                    [
                        productId,
                        store.id
                    ]
                );

            const product =
                productRows[0];

            if (!product) {

                await connection.rollback();

                transactionStarted =
                    false;

                return Response.json(
                    {
                        error:
                            "Producto no encontrado"
                    },
                    {
                        status:
                            404
                    }
                );

            }

            if (
                !getRestoProductAvailability(
                    product
                ).isAvailable
            ) {
                await connection.rollback();

                transactionStarted =
                    false;

                return Response.json(
                    {
                        error:
                            `"${product.title}" está agotado por el momento`
                    },
                    {
                        status:
                            409
                    }
                );
            }

            let variant =
                null;

            if (variantId) {

                const [
                    variantRows
                ] =
                    await connection.query(
                        `
                        SELECT *
                        FROM tags_store_variants
                        WHERE id = ?
                        AND product_id = ?
                        AND is_visible = 1
                        LIMIT 1
                        `,
                        [
                            variantId,
                            product.id
                        ]
                    );

                variant =
                    variantRows[0];

                if (!variant) {

                    await connection.rollback();

                    transactionStarted =
                        false;

                    return Response.json(
                        {
                            error:
                                "Variante no encontrada"
                        },
                        {
                            status:
                                404
                        }
                    );

                }

            }

            if (
                Number(
                    product.variants_count ||
                    0
                ) > 0 &&
                !variant
            ) {

                await connection.rollback();

                transactionStarted =
                    false;

                return Response.json(
                    {
                        error:
                            "Seleccioná una variante"
                    },
                    {
                        status:
                            400
                    }
                );

            }

            const unitPrice =
                money(
                    variant
                        ? (
                            variant.sale_price ??
                            variant.price
                        )
                        : (
                            product.sale_price ??
                            product.price
                        )
                );

            const requiresPreparation =
                Number(
                    product.requires_preparation ||
                    0
                ) === 1
                    ? 1
                    : 0;

            const [
                insertResult
            ] =
                await connection.query(
                    `
                    INSERT INTO tags_resto_session_items
                    (
                        session_id,
                        product_id,
                        variant_id,
                        title,
                        variant_title,
                        sku,
                        quantity,
                        unit_price,
                        total_price,
                        options_json,
                        notes,
                        requires_preparation,
                        preparation_status,
                        preparation_sent_at,
                        created_at
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        '{}',
                        ?,
                        ?,
                        ?,
                        NULL,
                        NOW()
                    )
                    `,
                    [
                        session.id,
                        product.id,
                        variant?.id ||
                        null,
                        product.title,
                        variant?.title ||
                        null,
                        variant?.sku ||
                        product.sku ||
                        null,
                        quantity,
                        unitPrice,
                        money(
                            unitPrice *
                            quantity
                        ),
                        notes,
                        requiresPreparation,
                        "pending"
                    ]
                );

            result = {
                addedItemId:
                    insertResult.insertId
            };

        }

        if (
            action ===
            "apply_discount"
        ) {

            const discountType =
                clean(
                    body?.discountType
                ).toLowerCase();

            const discountValue =
                money(
                    body?.discountValue
                );

            if (
                ![
                    "fixed",
                    "percentage"
                ].includes(
                    discountType
                ) ||
                discountValue < 0
            ) {

                await connection.rollback();

                transactionStarted =
                    false;

                return Response.json(
                    {
                        error:
                            "Descuento inválido"
                    },
                    {
                        status:
                            400
                    }
                );

            }

            const [
                subtotalRows
            ] =
                await connection.query(
                    `
                    SELECT
                        COALESCE(
                            SUM(total_price),
                            0
                        ) AS subtotal
                    FROM tags_resto_session_items
                    WHERE session_id = ?
                    `,
                    [
                        session.id
                    ]
                );

            const subtotal =
                money(
                    subtotalRows[0]
                        ?.subtotal
                );

            discountTotal =
                discountType ===
                "percentage"
                    ? money(
                        subtotal *
                        Math.min(
                            100,
                            discountValue
                        ) /
                        100
                    )
                    : Math.min(
                        subtotal,
                        discountValue
                    );

            result = {
                discountType,
                discountValue
            };

        }

        const totals =
            await recalculateOrder(
                connection,
                session,
                discountTotal
            );

        await logRestoAudit(
            connection,
            {
                storeId:
                    session.store_id,
                access,
                actionCode:
                    `order.items.${action}`,
                entityType:
                    "session",
                entityId:
                    session.id,
                description:
                    `Productos del pedido actualizados: ${action}`,
                metadata: {
                    result,
                    totals
                },
                req
            }
        );

        await connection.commit();

        transactionStarted =
            false;

        return Response.json({
            ok:
                true,
            action,
            ...result,
            totals
        });

    } catch (err) {

        if (transactionStarted) {

            try {

                await connection.rollback();

            } catch {

                // Se conserva el error original.

            }

        }

        console.error(
            "RESTO ADMIN ORDER ITEMS UPDATE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error actualizando el pedido"
            },
            {
                status:
                    500
            }
        );

    } finally {

        connection.release();

    }

}
