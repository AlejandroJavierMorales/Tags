// =====================================
// API: /api/qr-page/admin-seo/update
// Nombre: Actualizar SEO Admin QR-Page
// Descripción: Permite al admin sobrescribir SEO y datos estructurados.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { getTagsSession }
    from "@/app/modules/qr-page/lib/getTagsSession";

export async function POST(req) {

    try {

        const session =
            getTagsSession();

        if (!session) {
            return Response.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (session.role !== "admin") {
            return Response.json(
                { error: "Sin permisos" },
                { status: 403 }
            );
        }

        const body =
            await req.json();

        const {
            pageId,
            businessId,
            admin_seo_title,
            admin_seo_description,
            admin_seo_keywords,
            admin_canonical_url,
            admin_structured_data_json,
            robots_index,
            robots_follow
        } = body;

        if (!pageId) {
            return Response.json(
                { error: "pageId requerido" },
                { status: 400 }
            );
        }

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
                { status: 400 }
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

        await db.query(
            `
            UPDATE
                tags_qr_pages
            SET
                admin_seo_title = ?,
                admin_seo_description = ?,
                admin_seo_keywords = ?,
                admin_canonical_url = ?,
                admin_structured_data_json = ?,
                robots_index = ?,
                robots_follow = ?,
                updated_at = NOW()
            WHERE
                id = ?
                AND business_id = ?
            `,
            [
                admin_seo_title || null,
                admin_seo_description || null,
                admin_seo_keywords || null,
                admin_canonical_url || null,
                JSON.stringify(
                    admin_structured_data_json || {}
                ),
                robots_index ? 1 : 0,
                robots_follow ? 1 : 0,
                pageId,
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