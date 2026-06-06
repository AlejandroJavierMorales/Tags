// =====================================
// API: /api/qr-page/public/[slug]
// Nombre: Obtener QR-Page pública
// Descripción: Devuelve una QR-Page publicada por slug para render público.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { safeParseJSON }
    from "@/app/modules/qr-page/lib/safeParseJSON";

export async function GET(req, { params }) {

    try {

        const slug =
            params.slug;

        if (!slug) {
            return Response.json(
                { error: "slug requerido" },
                { status: 400 }
            );
        }

        const [pages] =
            await db.query(
                `
               SELECT
                    p.*,
                    b.name AS business_name,
                    b.email AS business_email,
                    b.phone AS business_phone,
                    t.code AS theme_code,
                    t.name AS theme_name,
                    t.css_tokens AS theme_css_tokens
                FROM
                    tags_qr_pages p
                INNER JOIN
                    tags_businesses b
                        ON b.id = p.business_id
                LEFT JOIN
                    tags_qr_page_themes t
                        ON t.id = p.theme_id
                WHERE
                    p.slug = ?
                    AND p.status = 'published'
                LIMIT 1
                `,
                [slug]
            );

        if (!pages.length) {
            return Response.json(
                { error: "QR-Page no encontrada" },
                { status: 404 }
            );
        }

        const page =
            pages[0];

        const [sections] =
            await db.query(
                `
                SELECT
                    *
                FROM
                    tags_qr_page_sections
                WHERE
                    page_id = ?
                    AND is_visible = 1
                ORDER BY
                    sort_order ASC,
                    id ASC
                `,
                [page.id]
            );

        const [blocks] =
            await db.query(
                `
                SELECT
                    b.*
                FROM
                    tags_qr_page_blocks b
                INNER JOIN
                    tags_qr_page_sections s
                        ON s.id = b.section_id
                WHERE
                    s.page_id = ?
                    AND s.is_visible = 1
                    AND b.is_visible = 1
                ORDER BY
                    b.sort_order ASC,
                    b.id ASC
                `,
                [page.id]
            );

        const [products] =
            await db.query(
                `
                SELECT
                    *
                FROM
                    tags_qr_page_products
                WHERE
                    page_id = ?
                    AND is_visible = 1
                ORDER BY
                    sort_order ASC,
                    id ASC
                `,
                [page.id]
            );

        const sectionsWithBlocks =
            sections.map((section) => {

                return {
                    ...section,

                    settings_json:
                        safeParseJSON(
                            section.settings_json
                        ),

                    styles_json:
                        safeParseJSON(
                            section.styles_json
                        ),

                    blocks:
                        blocks
                            .filter((block) =>
                                block.section_id === section.id
                            )
                            .map((block) => ({
                                ...block,

                                content_json:
                                    safeParseJSON(
                                        block.content_json
                                    ),

                                styles_json:
                                    safeParseJSON(
                                        block.styles_json
                                    )
                            }))
                };
            });

        const seo = {
            title:
                page.admin_seo_title ||
                page.seo_title ||
                page.title ||
                page.business_name,

            description:
                page.admin_seo_description ||
                page.seo_description ||
                page.description ||
                `Conocé más sobre ${page.business_name}`,

            keywords:
                page.admin_seo_keywords ||
                page.seo_keywords ||
                null,

            image:
                page.seo_image_url ||
                page.cover_image_url ||
                page.logo_url ||
                null,

            canonical:
                page.admin_canonical_url ||
                page.canonical_url ||
                null,

            robots: {
                index:
                    !!page.robots_index,

                follow:
                    !!page.robots_follow
            }
        };

        return Response.json({
            ok: true,

            qrPage: {
                page: {
                    ...page,

                    theme: page.theme_id
                        ? {
                            id: page.theme_id,
                            code: page.theme_code,
                            name: page.theme_name,
                            css_tokens: safeParseJSON(
                                page.theme_css_tokens
                            )
                        }
                        : null,

                    global_styles:
                        safeParseJSON(
                            page.global_styles
                        ),

                    theme_json:
                        safeParseJSON(
                            page.theme_json
                        ),

                    structured_data_json:
                        safeParseJSON(
                            page.structured_data_json
                        ),

                    admin_structured_data_json:
                        safeParseJSON(
                            page.admin_structured_data_json
                        )
                },

                seo,

                sections:
                    sectionsWithBlocks,

                products
            }
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            { error: err.message },
            { status: 500 }
        );
    }
}