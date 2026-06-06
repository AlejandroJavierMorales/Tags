// =====================================
// API: /api/qr-page/products/delete
// Nombre: Eliminar producto QR-Page
// Descripción: Elimina un producto del catálogo de una QR-Page.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

export async function POST(req) {

    try {

        const {
            businessId,
            pageId,
            productId
        } = await req.json();

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
                    pr.id
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

        await db.query(
            `
            DELETE FROM
                tags_qr_page_products
            WHERE
                id = ?
                AND page_id = ?
            `,
            [
                productId,
                pageId
            ]
        );

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