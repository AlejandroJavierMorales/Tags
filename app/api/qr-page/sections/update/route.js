// =====================================
// API: /api/qr-page/sections/update
// Nombre: Actualizar sección QR-Page
// Descripción: Actualiza datos, visibilidad y estilos de una sección.
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
            title,
            is_visible,
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

        if (!sectionId) {

            return Response.json(
                { error: "sectionId requerido" },
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

        await db.query(
            `
            UPDATE
                tags_qr_page_sections
            SET
                type = COALESCE(?, type),
                title = ?,
                is_visible = ?,
                settings_json = ?,
                styles_json = ?,
                updated_at = NOW()
            WHERE
                id = ?
                AND page_id = ?
            `,
            [
                type || null,
                title || null,
                is_visible ? 1 : 0,
                JSON.stringify(settings_json || {}),
                JSON.stringify(styles_json || {}),
                sectionId,
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