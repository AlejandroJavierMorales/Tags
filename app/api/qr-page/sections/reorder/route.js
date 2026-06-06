// =====================================
// API: /api/qr-page/sections/reorder
// Nombre: Reordenar secciones QR-Page
// Descripción: Actualiza el orden visual de las secciones de una QR-Page.
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
            sections
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

        if (
            !Array.isArray(sections)
            ||
            !sections.length
        ) {

            return Response.json(
                { error: "sections requerido" },
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

        for (const item of sections) {

            if (!item.id) {
                continue;
            }

            await db.query(
                `
                UPDATE
                    tags_qr_page_sections
                SET
                    sort_order = ?,
                    updated_at = NOW()
                WHERE
                    id = ?
                    AND page_id = ?
                `,
                [
                    Number(item.sort_order) || 0,
                    item.id,
                    pageId
                ]
            );
        }

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