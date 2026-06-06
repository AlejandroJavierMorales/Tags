// =====================================
// API: /api/qr-page/blocks/create
// Nombre: Crear bloque QR-Page
// Descripción: Crea un nuevo bloque dentro de una sección de QR-Page.
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
            type,
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

        if (!type) {
            return Response.json(
                { error: "type requerido" },
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

        const [orderRows] =
            await db.query(
                `
                SELECT
                    COALESCE(MAX(sort_order), 0) + 1 AS next_order
                FROM
                    tags_qr_page_blocks
                WHERE
                    section_id = ?
                `,
                [
                    sectionId
                ]
            );

        const sortOrder =
            orderRows[0]?.next_order || 1;

        const [result] =
            await db.query(
                `
                INSERT INTO tags_qr_page_blocks (
                    section_id,
                    type,
                    sort_order,
                    content_json,
                    styles_json,
                    is_visible
                )
                VALUES (?, ?, ?, ?, ?, 1)
                `,
                [
                    sectionId,
                    type,
                    sortOrder,
                    JSON.stringify(content_json || {}),
                    JSON.stringify(styles_json || {})
                ]
            );

        return Response.json({
            ok: true,
            blockId: result.insertId
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            { error: err.message },
            { status: 500 }
        );
    }
}