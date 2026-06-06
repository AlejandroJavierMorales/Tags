// =====================================
// API: /api/qr-page/products/create
// Nombre: Crear producto QR-Page
// Descripción: Crea un producto del catálogo de una QR-Page.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {
            businessId,
            pageId,
            category,
            title,
            description,
            price,
            old_price,
            discount_label,
            currency,
            image_url,
            images_json,
            button_label,
            button_url,
            whatsapp_text,
            seo_title,
            seo_description
        } = body;

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
                { status: 400 }
            );
        }

        if (!pageId) {
            return Response.json(
                { error: "pageId requerido" },
                { status: 400 }
            );
        }

        if (!title) {
            return Response.json(
                { error: "title requerido" },
                { status: 400 }
            );
        }

        const access =
            await requireQRPageAccess(
                businessId
            );

        if (!access.ok) {
            return Response.json(
                { error: access.error },
                { status: access.status }
            );
        }

        const [pages] =
            await db.query(
                `
                SELECT
                    id
                FROM
                    tags_qr_pages
                WHERE
                    id = ?
                    AND business_id = ?
                LIMIT 1
                `,
                [
                    pageId,
                    businessId
                ]
            );

        if (!pages.length) {
            return Response.json(
                { error: "QR-Page no encontrada" },
                { status: 404 }
            );
        }

        const [countRows] =
            await db.query(
                `
                SELECT
                    COUNT(*) AS total
                FROM
                    tags_qr_page_products
                WHERE
                    page_id = ?
                `,
                [
                    pageId
                ]
            );

        if (Number(countRows[0].total) >= 20) {
            return Response.json(
                {
                    error:
                        "Alcanzaste el límite gratuito de hasta 20 productos. Si necesitás más, consultanos en info@tags.com.ar o al WhatsApp 3546562855."
                },
                {
                    status: 400
                }
            );
        }

        const finalImages =
            Array.isArray(images_json)
                ? images_json
                    .filter((image) => image?.url)
                    .slice(0, 4)
                : [];

        const mainImage =
            finalImages[0]?.url ||
            image_url ||
            null;

        const [orderRows] =
            await db.query(
                `
                SELECT
                    COALESCE(MAX(sort_order), 0) + 1 AS next_order
                FROM
                    tags_qr_page_products
                WHERE
                    page_id = ?
                `,
                [
                    pageId
                ]
            );

        const sortOrder =
            orderRows[0]?.next_order || 1;

        const [result] =
            await db.query(
                `
                 INSERT INTO tags_qr_page_products (
                    page_id,
                    category,
                    title,
                    description,
                    price,
                    old_price,
                    discount_label,
                    currency,
                    image_url,
                    images_json,
                    button_label,
                    button_url,
                    whatsapp_text,
                    sort_order,
                    is_visible,
                    seo_title,
                    seo_description
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                `,
                [
                    pageId,
                    category || "products",
                    title,
                    description || null,
                    price || null,
                    old_price || null,
                    discount_label || null,
                    currency || "ARS",
                    mainImage,
                    JSON.stringify(finalImages),
                    button_label || "Consultar",
                    button_url || null,
                    whatsapp_text || null,
                    sortOrder,
                    seo_title || null,
                    seo_description || null
                ]
            );

        return Response.json({
            ok: true,
            productId: result.insertId
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            { error: err.message },
            { status: 500 }
        );
    }
}