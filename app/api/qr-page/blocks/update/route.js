// =====================================
// API: /api/qr-page/blocks/update
// Nombre: Actualizar bloque QR-Page
// Descripción: Actualiza contenido, estilos, tipo o visibilidad de un bloque.
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
            sectionId,
            blockId,
            type,
            is_visible,
            content_json,
            styles_json
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

        if (!sectionId) {
            return Response.json(
                { error: "sectionId requerido" },
                { status: 400 }
            );
        }

        if (!blockId) {
            return Response.json(
                { error: "blockId requerido" },
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

        const [blocks] =
            await db.query(
                `
                SELECT
                    b.id
                FROM
                    tags_qr_page_blocks b
                INNER JOIN
                    tags_qr_page_sections s
                        ON s.id = b.section_id
                INNER JOIN
                    tags_qr_pages p
                        ON p.id = s.page_id
                WHERE
                    b.id = ?
                    AND b.section_id = ?
                    AND s.page_id = ?
                    AND p.business_id = ?
                LIMIT 1
                `,
                [
                    blockId,
                    sectionId,
                    pageId,
                    businessId
                ]
            );

        if (!blocks.length) {
            return Response.json(
                { error: "Bloque no encontrado" },
                { status: 404 }
            );
        }

        await db.query(
            `
            UPDATE
                tags_qr_page_blocks
            SET
                type = COALESCE(?, type),
                is_visible = ?,
                content_json = ?,
                styles_json = ?,
                updated_at = NOW()
            WHERE
                id = ?
                AND section_id = ?
            `,
            [
                type || null,
                is_visible ? 1 : 0,
                JSON.stringify(content_json || {}),
                JSON.stringify(styles_json || {}),
                blockId,
                sectionId
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