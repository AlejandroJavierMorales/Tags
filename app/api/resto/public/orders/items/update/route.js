// =====================================
// API: /api/resto/public/orders/items/update
// Descripción:
// Actualiza la cantidad consolidada de un producto
// cargado en una sesión pública de Tags Resto.
//
// Las cantidades ya enviadas a preparación quedan
// protegidas. Los aumentos y decrementos afectan
// únicamente las filas pendientes.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";

function money(value) {

    return Number(
        Number(value || 0).toFixed(2)
    );

}

export async function POST(req) {

    const conn =
        await db.getConnection();

    let transactionStarted =
        false;

    try {

        const body =
            await req.json();

        const {
            itemId,
            quantity
        } = body;

        if (!itemId) {

            return Response.json(
                {
                    error:
                        "Producto de la sesión requerido."
                },
                {
                    status: 400
                }
            );

        }

        if (
            quantity === undefined ||
            quantity === null ||
            Number.isNaN(
                Number(quantity)
            )
        ) {

            return Response.json(
                {
                    error:
                        "Cantidad inválida."
                },
                {
                    status: 400
                }
            );

        }

        const normalizedQuantity =
            Math.max(
                0,
                Math.trunc(
                    Number(quantity)
                )
            );

        await conn.beginTransaction();

        transactionStarted =
            true;

        /*
        =====================================
        ITEM DE REFERENCIA
        =====================================
        */

        const [itemRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_resto_session_items
                WHERE id=?
                LIMIT 1
                FOR UPDATE
                `,
                [
                    itemId
                ]
            );

        const sessionItem =
            itemRows[0];

        const optionsJson =
            typeof sessionItem.options_json === "string"
                ? sessionItem.options_json
                : JSON.stringify(
                    sessionItem.options_json || {}
                );

        if (!sessionItem) {

            await conn.rollback();

            transactionStarted =
                false;

            return Response.json(
                {
                    error:
                        "Producto no encontrado."
                },
                {
                    status: 404
                }
            );

        }

        let requiresPreparation =
            Number(
                sessionItem.requires_preparation ||
                0
            ) === 1
                ? 1
                : 0;

        if (
            sessionItem.product_id
        ) {

            const [productRows] =
                await conn.query(
                    `
                SELECT
                    requires_preparation
                FROM tags_store_products
                WHERE id = ?
                LIMIT 1
            `,
                    [
                        sessionItem.product_id
                    ]
                );

            if (
                productRows.length
            ) {

                requiresPreparation =
                    Number(
                        productRows[0]
                            .requires_preparation ||
                        0
                    ) === 1
                        ? 1
                        : 0;

            }

        }

        /*
        =====================================
        SESIÓN
        =====================================
        */

        const [sessionRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_resto_sessions
                WHERE id=?
                AND status IN (
                    'open',
                    'bill_requested'
                )
                AND COALESCE(
                    payment_status,
                    'pending'
                ) <> 'paid'
                LIMIT 1
                FOR UPDATE
                `,
                [
                    sessionItem.session_id
                ]
            );

        const session =
            sessionRows[0];

        if (!session) {

            await conn.rollback();

            transactionStarted =
                false;

            return Response.json(
                {
                    error:
                        "La sesión no existe o ya no está abierta."
                },
                {
                    status: 404
                }
            );

        }

        /*
        =====================================
        FILAS DEL MISMO PRODUCTO
        =====================================

        Se utiliza la misma identidad que en la vista
        pública consolidada:

        - producto;
        - variante;
        - opciones;
        - observaciones.

        Los ítems manuales sin product_id conservan
        su comportamiento individual.
        */

        let groupedItems = [];

        if (sessionItem.product_id) {

            const [groupRows] =
                await conn.query(
                    `
                    SELECT *
                    FROM tags_resto_session_items
                    WHERE session_id=?
                    AND product_id=?
                    AND variant_id <=> ?
                    AND CAST(
                        COALESCE(options_json,'{}')
                        AS CHAR
                    ) = ?
                    AND COALESCE(
                        notes,
                        ''
                    )=COALESCE(
                        ?,
                        ''
                    )
                    ORDER BY id ASC
                    FOR UPDATE
                    `,
                    [
                        session.id,
                        sessionItem.product_id,
                        sessionItem.variant_id,
                        optionsJson,
                        sessionItem.notes
                    ]
                );

            groupedItems =
                groupRows;

        } else {

            groupedItems = [
                sessionItem
            ];

        }

        /*
        =====================================
        CANTIDADES ENVIADAS Y PENDIENTES
        =====================================
        */

        const sentItems =
            groupedItems.filter(
                (item) =>
                    Number(
                        item.requires_preparation ||
                        0
                    ) === 1 &&
                    item.preparation_status ===
                    "sent"
            );

        const pendingItems =
            groupedItems.filter(
                (item) =>
                    !(
                        Number(
                            item.requires_preparation ||
                            0
                        ) === 1 &&
                        item.preparation_status ===
                        "sent"
                    )
            );

        const sentQuantity =
            sentItems.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.quantity ||
                        0
                    ),
                0
            );

        /*
        Nunca se permite reducir desde la carta pública
        una cantidad que ya fue enviada a preparación.
        */

        if (
            normalizedQuantity <
            sentQuantity
        ) {

            await conn.rollback();

            transactionStarted =
                false;

            return Response.json(
                {
                    error:
                        sentQuantity === 1
                            ? "Este producto ya fue enviado a preparación. Para cancelarlo, consultá al personal."
                            : `Ya hay ${sentQuantity} unidades enviadas a preparación. Para cancelarlas, consultá al personal.`,

                    minimumQuantity:
                        sentQuantity
                },
                {
                    status: 409
                }
            );

        }

        const desiredPendingQuantity =
            normalizedQuantity -
            sentQuantity;

        let removed =
            false;

        let updatedItemId =
            sessionItem.id;

        /*
        =====================================
        QUITAR CANTIDAD PENDIENTE
        =====================================
        */

        if (
            desiredPendingQuantity <= 0
        ) {

            if (pendingItems.length) {

                await conn.query(
                    `
                    DELETE FROM tags_resto_session_items
                    WHERE session_id=?
                    AND id IN (?)
                    `,
                    [
                        session.id,
                        pendingItems.map(
                            (item) =>
                                item.id
                        )
                    ]
                );

            }

            removed =
                sentQuantity === 0;

            updatedItemId =
                sentItems[0]?.id ||
                sessionItem.id;

        }

        /*
        =====================================
        ACTUALIZAR FILA PENDIENTE
        =====================================
        */

        else if (pendingItems.length) {

            const primaryPendingItem =
                pendingItems[0];

            const totalPrice =
                money(
                    Number(
                        primaryPendingItem.unit_price ||
                        sessionItem.unit_price
                    ) *
                    desiredPendingQuantity
                );

            await conn.query(
                `
        UPDATE tags_resto_session_items
        SET
            quantity=?,
            total_price=?,
            requires_preparation=?,
            preparation_status='pending',
            options_json=?,
            preparation_sent_at=NULL
        WHERE id=?
        AND session_id=?
    `,
                [
                    desiredPendingQuantity,
                    totalPrice,
                    requiresPreparation,
                    optionsJson,
                    primaryPendingItem.id,
                    session.id
                ]
            );

            const duplicatePendingIds =
                pendingItems
                    .slice(1)
                    .map(
                        (item) => item.id
                    );

            if (duplicatePendingIds.length) {

                await conn.query(
                    `
        DELETE FROM tags_resto_session_items
        WHERE session_id=?
        AND id IN (${duplicatePendingIds.map(() => "?").join(",")})
        `,
                    [
                        session.id,
                        ...duplicatePendingIds
                    ]
                );

            }

            updatedItemId =
                primaryPendingItem.id;

        }

        /*
        =====================================
        CREAR NUEVA FILA PENDIENTE
        =====================================

        Esto sucede cuando el producto ya estaba
        completamente enviado y el cliente agrega
        nuevas unidades.
        */

        else {

            const totalPrice =
                money(
                    Number(
                        sessionItem.unit_price
                    ) *
                    desiredPendingQuantity
                );

            const [insertResult] =
                await conn.query(
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
                        ?,
                        ?,
                        ?,
                        ?,
                        NULL,
                        NOW()
                    )
                    `,
                    [
                        session.id,
                        sessionItem.product_id,
                        sessionItem.variant_id,
                        sessionItem.title,
                        sessionItem.variant_title,
                        sessionItem.sku,
                        desiredPendingQuantity,
                        sessionItem.unit_price,
                        totalPrice,
                        optionsJson,
                        sessionItem.notes,
                        requiresPreparation,
                        "pending"
                    ]
                );

            updatedItemId =
                insertResult.insertId;

        }

        /*
        =====================================
        RECALCULAR TOTALES
        =====================================
        */

        const [totalRows] =
            await conn.query(
                `
                SELECT
                    COALESCE(
                        SUM(total_price),
                        0
                    ) AS subtotal
                FROM tags_resto_session_items
                WHERE session_id=?
                `,
                [
                    session.id
                ]
            );

        const subtotal =
            money(
                totalRows[0].subtotal
            );

        const discountTotal =
            money(
                session.discount_total
            );

        const total =
            money(
                Math.max(
                    0,
                    subtotal -
                    discountTotal
                )
            );

        await conn.query(
            `
            UPDATE tags_resto_sessions
            SET
                subtotal=?,
                discount_total=?,
                total=?,
                updated_at=NOW()
            WHERE id=?
            `,
            [
                subtotal,
                discountTotal,
                total,
                session.id
            ]
        );

        /*
        =====================================
        RESPUESTA ACTUALIZADA
        =====================================
        */

        const [updatedSessionRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_resto_sessions
                WHERE id=?
                LIMIT 1
                `,
                [
                    session.id
                ]
            );

        const [updatedItemRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_resto_session_items
                WHERE session_id=?
                ORDER BY id ASC
                `,
                [
                    session.id
                ]
            );

        await conn.commit();

        transactionStarted =
            false;

        return Response.json({

            ok: true,

            removed,

            updatedItemId,

            sentQuantity,

            pendingQuantity:
                desiredPendingQuantity,

            quantity:
                normalizedQuantity,

            session:
                updatedSessionRows[0],

            items:
                updatedItemRows,

            totals: {

                subtotal,

                discountTotal,

                total

            }

        });

    } catch (err) {

        if (
            transactionStarted
        ) {

            try {

                await conn.rollback();

            } catch {

                // No se reemplaza el error original.

            }

        }

        console.error(
            "RESTO PUBLIC ORDER ITEM UPDATE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error actualizando el producto."
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();

    }

}
