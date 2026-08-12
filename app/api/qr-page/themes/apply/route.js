// =====================================
// API: /api/qr-page/themes/apply
// Nombre: Aplicar theme QR-Page
// Descripción: Asocia un theme activo a una QR-Page.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

export async function POST(req) {

    let connection;

    try {

        const {
            businessId,
            pageId,
            themeId
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

        if (!themeId) {
            return Response.json(
                { error: "themeId requerido" },
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

        connection = await db.getConnection();

        const [themes] =
            await connection.query(
                `
                SELECT id
                FROM tags_qr_page_themes
                WHERE id = ?
                AND is_active = 1
                LIMIT 1
                `,
                [themeId]
            );

        if (!themes.length) {
            return Response.json(
                { error: "Theme no encontrado" },
                { status: 404 }
            );
        }

        const [pageRows] = await connection.query(
            `SELECT id, page_type FROM tags_qr_pages WHERE id = ? AND business_id = ? LIMIT 1`,
            [pageId, businessId]
        );

        if (!pageRows.length) {
            return Response.json(
                { error: "Página no encontrada" },
                { status: 404 }
            );
        }

        await connection.beginTransaction();

        await connection.query(
            `
            UPDATE tags_qr_pages
            SET
                theme_id = ?,
                global_styles = JSON_SET(
                    COALESCE(global_styles, JSON_OBJECT()),
                    '$.theme_override',
                    true
                ),
                header_config = JSON_REMOVE(
                    COALESCE(header_config, JSON_OBJECT()),
                    '$.backgroundColor',
                    '$.textColor'
                ),
                footer_config = JSON_REMOVE(
                    COALESCE(footer_config, JSON_OBJECT()),
                    '$.backgroundColor',
                    '$.textColor'
                ),
                updated_at = NOW()
            WHERE id = ?
            AND business_id = ?
            `,
            [
                themeId,
                pageId,
                businessId
            ]
        );

        if (pageRows[0].page_type === "directory") {
            await connection.query(
                `
                UPDATE tags_qr_pages p
                INNER JOIN tags_stores s ON s.page_id = p.id
                SET
                    p.theme_id = ?,
                    p.global_styles = JSON_SET(
                        COALESCE(p.global_styles, JSON_OBJECT()),
                        '$.theme_override',
                        true
                    ),
                    p.header_config = JSON_REMOVE(
                        COALESCE(p.header_config, JSON_OBJECT()),
                        '$.backgroundColor',
                        '$.textColor'
                    ),
                    p.footer_config = JSON_REMOVE(
                        COALESCE(p.footer_config, JSON_OBJECT()),
                        '$.backgroundColor',
                        '$.textColor'
                    ),
                    p.updated_at = NOW()
                WHERE s.business_id = ?
                AND (s.app_type IN ('store','resto') OR s.app_type IS NULL)
                `,
                [themeId, businessId]
            );

            await connection.query(
                `
                UPDATE tags_client_review_forms f
                INNER JOIN tags_qr_pages p ON p.id = f.page_id
                SET
                    f.theme_id = ?,
                    f.updated_at = NOW(),
                    p.theme_id = ?,
                    p.global_styles = JSON_SET(
                        COALESCE(p.global_styles, JSON_OBJECT()),
                        '$.theme_override',
                        true
                    ),
                    p.updated_at = NOW()
                WHERE f.business_id = ?
                `,
                [themeId, themeId, businessId]
            );
        }

        await connection.commit();

        return Response.json({
            ok: true
        });

    } catch (err) {

        if (connection) {
            await connection.rollback().catch(() => {});
        }

        console.log(err);

        return Response.json(
            { error: err.message },
            { status: 500 }
        );
    } finally {
        connection?.release();
    }
}
