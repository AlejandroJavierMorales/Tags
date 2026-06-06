// =====================================
// API: /api/qr-page/themes/list
// Nombre: Listar themes QR-Page
// Descripción: Devuelve los themes activos disponibles para aplicar a cualquier QR-Page.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { safeParseJSON }
    from "@/app/modules/qr-page/lib/safeParseJSON";

export async function GET() {

    try {

        const [themes] =
            await db.query(
                `
                SELECT
                    id,
                    code,
                    name,
                    description,
                    css_tokens
                FROM
                    tags_qr_page_themes
                WHERE
                    is_active = 1
                ORDER BY
                    sort_order ASC,
                    id ASC
                `
            );

        return Response.json({
            ok: true,
            themes: themes.map((theme) => ({
                ...theme,
                css_tokens:
                    safeParseJSON(theme.css_tokens)
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