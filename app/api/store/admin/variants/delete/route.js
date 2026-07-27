// =====================================
// API: /api/store/admin/variants/delete
// Descripción: Elimina una variante específica de un producto.
// Uso: Dashboard Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    const conn =
        await db.getConnection();

    try {
        const body =
            await req.json();

        const {
            businessId,
            productId,
            variantId
        } = body;

        if (!businessId || !productId || !variantId) {
            return Response.json(
                {
                    error: "businessId, productId y variantId son requeridos"
                },
                {
                    status: 400
                }
            );
        }

        const [storeRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'store'
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
                    error: "Tienda no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const [productRows] =
            await conn.query(
                `
                SELECT id
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
                    error: "Producto no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        await conn.beginTransaction();

        await conn.query(
            `
            DELETE FROM tags_store_variant_values
            WHERE variant_id = ?
            `,
            [
                variantId
            ]
        );

        await conn.query(
            `
            DELETE FROM tags_store_variants
            WHERE id = ?
            AND product_id = ?
            `,
            [
                variantId,
                productId
            ]
        );

        await conn.commit();

        return Response.json({
            ok: true,
            message: "Variante eliminada correctamente"
        });

    } catch (err) {
        await conn.rollback();

        console.error(
            "STORE VARIANT DELETE ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error eliminando variante"
            },
            {
                status: 500
            }
        );

    } finally {
        conn.release();
    }
}
