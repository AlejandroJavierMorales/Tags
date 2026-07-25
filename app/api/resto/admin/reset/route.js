// =====================================
// API: /api/resto/admin/reset
// Descripción:
// Resetea completamente Tags Resto para
// un business dejando el addon asignado.
// Elimina también su ruta del Portal.
// SOLO DESARROLLO.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const {
            businessId
        } = await req.json();

        if (!businessId) {

            return Response.json(
                {
                    error:
                        "businessId requerido"
                },
                {
                    status: 400
                }
            );

        }

        await conn.beginTransaction();

        // -----------------------------
        // STORE RESTO
        // -----------------------------

        const [storeRows] =
            await conn.query(
                `
                SELECT
                    id,
                    page_id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'resto'
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows[0] || null;

        // -----------------------------
        // PÁGINA RESTO
        // -----------------------------

        const [pageRows] =
            await conn.query(
                `
                SELECT
                    id
                FROM tags_qr_pages
                WHERE business_id = ?
                AND page_type = 'resto'
                `,
                [
                    businessId
                ]
            );

        const pageIds =
            Array.from(
                new Set(
                    [
                        store?.page_id,
                        ...pageRows.map(
                            page => page.id
                        )
                    ]
                        .filter(Boolean)
                        .map(Number)
                )
            );

        // -----------------------------
        // PRODUCTO TAGS RESTO
        // -----------------------------

        const [productRows] =
            await conn.query(
                `
                SELECT
                    p.id
                FROM tags_products p

                INNER JOIN tags_qr_types t
                    ON t.id = p.qr_type_id

                WHERE t.code = 'tags_resto'
                LIMIT 1
                `
            );

        const productId =
            productRows[0]?.id || null;

        // -----------------------------
        // RUTA DEL PORTAL
        // -----------------------------

        if (pageIds.length) {

            const placeholders =
                pageIds
                    .map(() => "?")
                    .join(",");

            await conn.query(
                `
                DELETE
                FROM tags_portal_routes
                WHERE business_id = ?
                AND page_id IN (${placeholders})
                `,
                [
                    businessId,
                    ...pageIds
                ]
            );

        }

        // -----------------------------
        // DATOS DEL RESTO
        // -----------------------------

        if (store) {

            // -----------------------------
            // PEDIDOS
            // -----------------------------

            await conn.query(
                `
                DELETE oi
                FROM tags_store_order_items oi

                INNER JOIN tags_store_orders o
                    ON o.id = oi.order_id

                WHERE o.store_id = ?
                `,
                [
                    store.id
                ]
            );

            await conn.query(
                `
                DELETE
                FROM tags_store_orders
                WHERE store_id = ?
                `,
                [
                    store.id
                ]
            );

            // -----------------------------
            // SESIONES
            // -----------------------------

            await conn.query(
                `
                DELETE
                FROM tags_resto_sessions
                WHERE store_id = ?
                `,
                [
                    store.id
                ]
            );

            // -----------------------------
            // UBICACIONES
            // -----------------------------

            await conn.query(
                `
                DELETE
                FROM tags_resto_locations
                WHERE store_id = ?
                `,
                [
                    store.id
                ]
            );

            // -----------------------------
            // TEMPLATE
            // -----------------------------

            await conn.query(
                `
                DELETE b
                FROM tags_store_blocks b

                INNER JOIN tags_store_sections s
                    ON s.id = b.section_id

                WHERE s.store_id = ?
                `,
                [
                    store.id
                ]
            );

            await conn.query(
                `
                DELETE
                FROM tags_store_sections
                WHERE store_id = ?
                `,
                [
                    store.id
                ]
            );

            // -----------------------------
            // STORE RESTO
            // -----------------------------

            await conn.query(
                `
                DELETE
                FROM tags_stores
                WHERE id = ?
                `,
                [
                    store.id
                ]
            );

        }

        // -----------------------------
        // PÁGINA PÚBLICA
        // -----------------------------

        await conn.query(
            `
            DELETE
            FROM tags_qr_pages
            WHERE business_id = ?
            AND page_type = 'resto'
            `,
            [
                businessId
            ]
        );

        // -----------------------------
        // REGISTRO DE USO DEL ADDON
        // -----------------------------

        await conn.query(
            `
            DELETE
            FROM tags_qr_addon_usage
            WHERE business_id = ?
            AND addon_code = 'resto'
            `,
            [
                businessId
            ]
        );

        // -----------------------------
        // QRS TAGS RESTO
        // -----------------------------

        if (productId) {

            await conn.query(
                `
                DELETE
                FROM tags_qr_codes
                WHERE business_id = ?
                AND product_id = ?
                `,
                [
                    businessId,
                    productId
                ]
            );

        }

        await conn.commit();

        return Response.json({
            ok: true,
            message:
                "Tags Resto reseteado correctamente."
        });

    } catch (err) {

        await conn.rollback();

        console.error(
            "RESTO RESET ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error reseteando Tags Resto"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();

    }

}