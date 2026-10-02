// =====================================
// API: /api/qr-page/products/update
// Nombre: Actualizar producto QR-Page
// Descripción: Actualiza datos, visibilidad y SEO básico de un producto.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";
import { refreshDestinationBusinessProjection } from "@/app/modules/destination-ai/server/refreshDestinationBusinessProjection";

const MAX_PRODUCT_IMAGES = 12;

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {
            businessId,
            pageId,
            productId,
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
            is_visible,
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

        if (!productId) {
            return Response.json(
                { error: "productId requerido" },
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

        const [products] =
            await db.query(
                `
                SELECT
                    pr.id,
                    pr.image_url,
                    pr.images_json
                FROM
                    tags_qr_page_products pr
                INNER JOIN
                    tags_qr_pages p
                        ON p.id = pr.page_id
                WHERE
                    pr.id = ?
                    AND pr.page_id = ?
                    AND p.business_id = ?
                LIMIT 1
                `,
                [
                    productId,
                    pageId,
                    businessId
                ]
            );

        if (!products.length) {
            return Response.json(
                { error: "Producto no encontrado" },
                { status: 404 }
            );
        }

        let storedImages = [];
        try {
            const parsed = typeof products[0].images_json === "string"
                ? JSON.parse(products[0].images_json || "[]")
                : products[0].images_json;
            if (Array.isArray(parsed)) storedImages = parsed;
        } catch {}

        if (!storedImages.length && products[0].image_url) {
            storedImages = [{ url: products[0].image_url, alt: title || "" }];
        }

        const requestedImages = Array.isArray(images_json)
            ? images_json
            : storedImages;

        const finalImages = requestedImages
            .filter((image) => image?.url)
            .slice(0, MAX_PRODUCT_IMAGES);

        const mainImage =
            finalImages[0]?.url ||
            image_url ||
            null;

        await db.query(
            `
            UPDATE
                tags_qr_page_products
            SET
                category = ?,
                title = ?,
                description = ?,
                price = ?,
                old_price = ?,
                discount_label = ?,
                currency = ?,
                image_url = ?,
                images_json = ?,
                button_label = ?,
                button_url = ?,
                whatsapp_text = ?,
                is_visible = ?,
                seo_title = ?,
                seo_description = ?,
                updated_at = NOW()
            WHERE
                id = ?
                AND page_id = ?
            `,
            [
                category || "products",
                title,
                description || null,
                price || null,
                old_price || null,
                discount_label || null,
                currency || "ARS",
                mainImage,
                JSON.stringify(
                    finalImages
                ),
                button_label || "Consultar",
                button_url || null,
                whatsapp_text || null,
                is_visible ? 1 : 0,
                seo_title || null,
                seo_description || null,
                productId,
                pageId
            ]
        );

        await refreshDestinationBusinessProjection(businessId).catch(error => console.error("DESTINATION PROJECTION PRODUCT UPDATE SYNC ERROR", { businessId, error }));

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
