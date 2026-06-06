// =====================================
// API: /api/qr-page/blocks/reorder
// Nombre: Reordenar bloques QR-Page
// Descripción: Actualiza el orden visual de los bloques dentro de una sección.
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
            sectionId,
            blocks
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

        if (!sectionId) {
            return Response.json(
                { error: "sectionId requerido" },
                { status: 400 }
            );
        }

        if (
            !Array.isArray(blocks)
            ||
            !blocks.length
        ) {
            return Response.json(
                { error: "blocks requerido" },
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

        const [sections] =
            await db.query(
                `
                SELECT
                    s.id
                FROM
                    tags_qr_page_sections s
                INNER JOIN
                    tags_qr_pages p
                        ON p.id = s.page_id
                WHERE
                    s.id = ?
                    AND s.page_id = ?
                    AND p.business_id = ?
                LIMIT 1
                `,
                [
                    sectionId,
                    pageId,
                    businessId
                ]
            );

        if (!sections.length) {
            return Response.json(
                { error: "Sección no encontrada" },
                { status: 404 }
            );
        }

        for (const item of blocks) {

            if (!item.id) {
                continue;
            }

            await db.query(
                `
                UPDATE
                    tags_qr_page_blocks
                SET
                    sort_order = ?,
                    updated_at = NOW()
                WHERE
                    id = ?
                    AND section_id = ?
                `,
                [
                    Number(item.sort_order) || 0,
                    item.id,
                    sectionId
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