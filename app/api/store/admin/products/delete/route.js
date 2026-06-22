// =====================================
// API: /api/store/admin/products/delete
// Descripción: Elimina un producto de Tags Tienda.
// Uso: Dashboard Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    const conn = await db.getConnection();

    try {
        const body = await req.json();

        const {
            businessId,
            productId
        } = body;

        if (!businessId || !productId) {
            return Response.json(
                { error: "businessId y productId son requeridos" },
                { status: 400 }
            );
        }

        const [storeRows] = await conn.query(
            `
            SELECT id
            FROM tags_stores
            WHERE business_id = ?
            LIMIT 1
            `,
            [businessId]
        );

        const store = storeRows[0];

        if (!store) {
            return Response.json(
                { error: "Tienda no encontrada" },
                { status: 404 }
            );
        }

        await conn.beginTransaction();

        await conn.query(
            `
            DELETE FROM tags_store_product_images
            WHERE product_id = ?
            `,
            [productId]
        );

        await conn.query(
            `
            DELETE FROM tags_store_products
            WHERE id = ?
            AND store_id = ?
            `,
            [
                productId,
                store.id
            ]
        );

        await conn.commit();

        return Response.json({
            ok: true,
            message: "Producto eliminado correctamente"
        });

    } catch (err) {
        await conn.rollback();

        console.error("STORE PRODUCT DELETE ERROR:", err);

        return Response.json(
            { error: "Error eliminando producto" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}