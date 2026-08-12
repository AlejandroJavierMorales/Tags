// =====================================
// API: /api/qr-page/themes/reset
// Nombre: Resetear theme QR-Page
// Descripción: Quita el theme asociado a una QR-Page.
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
            pageId
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
                theme_id = NULL,
                global_styles = JSON_REMOVE(
                    COALESCE(global_styles, JSON_OBJECT()),
                    '$.theme_override'
                ),
                updated_at = NOW()
            WHERE id = ?
            AND business_id = ?
            `,
            [
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
                    p.theme_id = NULL,
                    p.global_styles = JSON_REMOVE(
                        COALESCE(p.global_styles, JSON_OBJECT()),
                        '$.theme_override'
                    ),
                    p.updated_at = NOW()
                WHERE s.business_id = ?
                AND (s.app_type IN ('store','resto') OR s.app_type IS NULL)
                `,
                [businessId]
            );

            await connection.query(
                `
                UPDATE tags_client_review_forms f
                INNER JOIN tags_qr_pages p ON p.id = f.page_id
                SET
                    f.theme_id = NULL,
                    f.updated_at = NOW(),
                    p.theme_id = NULL,
                    p.global_styles = JSON_REMOVE(
                        COALESCE(p.global_styles, JSON_OBJECT()),
                        '$.theme_override'
                    ),
                    p.updated_at = NOW()
                WHERE f.business_id = ?
                `,
                [businessId]
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
