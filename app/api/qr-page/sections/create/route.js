// =====================================
// API: /api/qr-page/sections/create
// Nombre: Crear sección QR-Page
// Descripción: Crea una nueva sección dentro de una QR-Page.
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
            type,
            title,
            settings_json,
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

        const [orderRows] =
            await db.query(
                `
                SELECT
                    COALESCE(MAX(sort_order), 0) + 1 AS next_order
                FROM
                    tags_qr_page_sections
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
                INSERT INTO tags_qr_page_sections (
                    page_id,
                    type,
                    title,
                    sort_order,
                    settings_json,
                    styles_json,
                    is_visible
                )
                VALUES (?, ?, ?, ?, ?, ?, 1)
                `,
                [
                    pageId,
                    type,
                    title || null,
                    sortOrder,
                    JSON.stringify(settings_json || {}),
                    JSON.stringify(styles_json || {})
                ]
            );

        return Response.json({
            ok: true,
            sectionId: result.insertId
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            { error: err.message },
            { status: 500 }
        );
    }
}