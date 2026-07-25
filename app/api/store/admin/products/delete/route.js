// =====================================
// API: /api/store/admin/products/delete
// Descripción:
// Elimina un producto.
// Compatible con Tags Store y Tags Resto.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

const VALID_APP_TYPES = [
    "store",
    "resto"
];

export async function POST(req) {

    const conn =
        await db.getConnection();

    let transactionStarted =
        false;

    try {

        const body =
            await req.json();

        const {
            businessId,
            appType = "store",
            productId
        } = body;

        if (
            !businessId ||
            !productId
        ) {

            return Response.json(
                {
                    error:
                        "businessId y productId son requeridos"
                },
                {
                    status: 400
                }
            );

        }

        if (
            !VALID_APP_TYPES.includes(
                appType
            )
        ) {

            return Response.json(
                {
                    error:
                        "appType inválido"
                },
                {
                    status: 400
                }
            );

        }

        const [storeRows] =
            await conn.query(
                `
                SELECT
                    id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = ?
                LIMIT 1
                `,
                [
                    businessId,
                    appType
                ]
            );

        const store =
            storeRows[0];

        if (!store) {

            return Response.json(
                {
                    error:
                        appType === "resto"
                            ? "Tags Resto no encontrado"
                            : "Tienda no encontrada"
                },
                {
                    status: 404
                }
            );

        }

        const [productRows] =
            await conn.query(
                `
                SELECT
                    id
                FROM tags_store_products
                WHERE id = ?
                AND store_id = ?
                LIMIT 1
                `,
                [
                    productId,
                    store.id
                ]
            );

        if (!productRows.length) {

            return Response.json(
                {
                    error:
                        "Producto no encontrado"
                },
                {
                    status: 404
                }
            );

        }

        await conn.beginTransaction();

        transactionStarted =
            true;

        await conn.query(
            `
            DELETE
            FROM tags_store_product_images
            WHERE product_id = ?
            `,
            [
                productId
            ]
        );

        await conn.query(
            `
            DELETE
            FROM tags_store_products
            WHERE id = ?
            AND store_id = ?
            `,
            [
                productId,
                store.id
            ]
        );

        await conn.commit();

        transactionStarted =
            false;

        return Response.json({
            ok: true,
            appType,
            message:
                "Producto eliminado correctamente"
        });

    } catch (err) {

        if (transactionStarted) {

            await conn.rollback();

        }

        console.error(
            "STORE PRODUCT DELETE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error eliminando producto"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();

    }

}