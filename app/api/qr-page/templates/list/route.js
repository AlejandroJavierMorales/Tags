// =====================================
// API: /api/qr-page/templates/list
// Nombre: Listar templates QR-Page
// Descripción: Devuelve los templates activos disponibles.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

import { safeParseJSON }
    from "@/app/modules/qr-page/lib/safeParseJSON";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("businessId");

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
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

        const [templates] =
            await db.query(
                `
                SELECT
                    id,
                    code,
                    name,
                    description,
                    preview_image_url,
                    template_json,
                    sort_order
                FROM
                    tags_qr_page_templates
                WHERE
                    is_active = 1
                ORDER BY
                    sort_order ASC,
                    id ASC
                `
            );

        return Response.json({
            ok: true,
            templates:
                templates.map((template) => ({
                    ...template,
                    template_json:
                        safeParseJSON(
                            template.template_json
                        )
                }))
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            { error: err.message },
            { status: 500 }
        );
    }
}