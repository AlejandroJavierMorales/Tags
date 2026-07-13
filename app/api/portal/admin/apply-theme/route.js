// =====================================
// API: /api/portal/admin/apply-theme
// Descripción: Aplica un theme activo a todas las QR-Pages incluidas en el Portal.
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
            themeId
        } = await req.json();

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
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

        const [themes] =
            await db.query(
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

        await db.query(
            `
            UPDATE tags_qr_pages p

            INNER JOIN tags_portal_routes r
                ON r.page_id = p.id

            SET
                p.theme_id = ?,
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

            WHERE
                p.business_id = ?
                AND r.business_id = ?
                AND r.page_id IS NOT NULL
                AND r.is_visible = 1
            `,
            [
                themeId,
                businessId,
                businessId
            ]
        );

        await db.query(
            `
    UPDATE tags_client_review_forms f
    INNER JOIN tags_qr_pages p
        ON p.id = f.page_id
    INNER JOIN tags_portal_routes r
        ON r.page_id = p.id
    SET
        f.theme_id = ?
    WHERE
        f.business_id = ?
        AND r.business_id = ?
        AND r.is_visible = 1
        AND p.page_type = 'client_reviews'
    `,
            [
                themeId,
                businessId,
                businessId
            ]
        );

        await db.query(
            `
            UPDATE tags_portals
            SET
                theme_code = (
                    SELECT code
                    FROM tags_qr_page_themes
                    WHERE id = ?
                    LIMIT 1
                ),
                updated_at = NOW()
            WHERE business_id = ?
            `,
            [
                themeId,
                businessId
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