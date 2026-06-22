// =====================================
// API: /api/store/public/get
// Descripción: Obtiene una tienda pública por slug.
// Uso: Render público /p/[slug] cuando page_type = store.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function parseJson(value, fallback = {}) {
    if (!value) return fallback;
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const slug =
            searchParams.get("slug");

        if (!slug) {
            return Response.json(
                { error: "slug es requerido" },
                { status: 400 }
            );
        }

        const [storeRows] =
            await db.query(
                `
                SELECT
                    s.*,
                    p.id AS page_id,
                    p.slug AS page_slug,
                    p.status AS page_status
                FROM tags_stores s

                INNER JOIN tags_qr_pages p
                    ON p.id = s.page_id

                WHERE s.slug = ?
                AND s.status = 'published'
                AND p.page_type = 'store'
                AND p.status = 'published'

                LIMIT 1
                `,
                [slug]
            );

        const store =
            storeRows[0];

        if (!store) {
            return Response.json(
                { error: "Tienda no encontrada" },
                { status: 404 }
            );
        }

        store.settings_json =
            parseJson(store.settings_json, {});

        store.styles_json =
            parseJson(store.styles_json, {});

        const [categories] =
            await db.query(
                `
                SELECT *
                FROM tags_store_categories
                WHERE store_id = ?
                AND is_visible = 1
                ORDER BY sort_order ASC, name ASC
                `,
                [store.id]
            );

        const [products] =
            await db.query(
                `
                SELECT
                    p.*,
                    c.name AS category_name,
                    img.image_url AS primary_image_url,
                    COUNT(DISTINCT v.id) AS variants_count
                FROM tags_store_products p

                LEFT JOIN tags_store_categories c
                    ON c.id = p.category_id

                LEFT JOIN tags_store_product_images img
                    ON img.product_id = p.id
                    AND img.is_primary = 1

                LEFT JOIN tags_store_variants v
                    ON v.product_id = p.id
                    AND v.is_visible = 1

                WHERE p.store_id = ?
                AND p.status = 'published'
                AND p.is_visible = 1

                GROUP BY
                    p.id,
                    c.name,
                    img.image_url

                ORDER BY p.is_featured DESC, p.created_at DESC
                `,
                [store.id]
            );

        return Response.json({
            ok: true,
            store,
            categories,
            products
        });

    } catch (err) {
        console.error("STORE PUBLIC GET ERROR:", err);

        return Response.json(
            { error: "Error cargando tienda pública" },
            { status: 500 }
        );
    }
}