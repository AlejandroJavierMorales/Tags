// =====================================
// API: /api/qr-page/get
// Descripción: Obtiene o crea una QR-Page draft para un cliente y QR, validando cupo contratado.
// =====================================


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

import { createSlug }
    from "@/app/modules/qr-page/lib/createSlug";

import { getDefaultQRPageTemplate }
    from "@/app/modules/qr-page/lib/defaultQRPageTemplate";

import { safeParseJSON }
    from "@/app/modules/qr-page/lib/safeParseJSON";

import { canActivateQRPage }
    from "@/app/modules/qr-page/lib/canActivateQRPage";



export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("businessId");

        const qrCodeId =
            searchParams.get("qrCodeId");

        if (!businessId) {

            return Response.json(
                {
                    error:
                        "businessId requerido"
                },
                {
                    status: 400
                }
            );
        }

        const access =
            await requireQRPageAccess(
                businessId
            );

        if (!access.ok) {

            return Response.json(
                {
                    error:
                        access.error
                },
                {
                    status:
                        access.status
                }
            );
        }

        const { business } =
            access;

        let qrCode =
            null;

        if (qrCodeId) {

            const [qrRows] =
                await db.query(
                    `
                    SELECT
                        *
                    FROM
                        tags_qr_codes
                    WHERE
                        id = ?
                        AND business_id = ?
                    LIMIT 1
                    `,
                    [
                        qrCodeId,
                        business.id
                    ]
                );

            qrCode =
                qrRows[0] || null;

            if (!qrCode) {

                return Response.json(
                    {
                        error:
                            "QR no encontrado para este cliente"
                    },
                    {
                        status: 404
                    }
                );
            }
        }

        let pages;

        if (qrCode) {

            [pages] =
                await db.query(
                    `
                   SELECT
                        p.*,
                        th.code AS theme_code,
                        th.name AS theme_name,
                        th.css_tokens AS theme_css_tokens
                    FROM
                        tags_qr_pages p
                    LEFT JOIN
                        tags_qr_page_themes th
                            ON th.id = p.theme_id
                    WHERE
                        p.business_id = ?
                        AND p.qr_code_id = ?
                    LIMIT 1
                    `,
                    [
                        business.id,
                        qrCode.id
                    ]
                );

        } else {

            /*
                Compatibilidad con el builder actual:
                /dashboard/businesses/[id]/qr-page

                Busca la QR-Page vieja/general del negocio,
                es decir la que todavía no está asociada a un QR.
            */

            [pages] =
                await db.query(
                    `
                    SELECT
                        p.*,
                        th.code AS theme_code,
                        th.name AS theme_name,
                        th.css_tokens AS theme_css_tokens
                    FROM
                        tags_qr_pages p
                    LEFT JOIN
                        tags_qr_page_themes th
                            ON th.id = p.theme_id
                    WHERE
                        p.business_id = ?
                        AND p.qr_code_id IS NULL
                    LIMIT 1
                    `,
                    [
                        business.id
                    ]
                );
        }

        let page =
            pages[0] || null;

        if (!page && qrCode) {

            const canActivate =
                await canActivateQRPage({
                    businessId: business.id,
                    qrCodeId: qrCode.id
                });

            if (!canActivate.ok) {

                return Response.json(
                    {
                        error:
                            canActivate.error,
                        totalAllowed:
                            canActivate.totalAllowed || 0,
                        totalUsed:
                            canActivate.totalUsed || 0
                    },
                    
                    {
                        status:
                            canActivate.status
                    }
                );
            }
        }

        if (!page) {

            const template =
                getDefaultQRPageTemplate(
                    business
                );

            let baseSlug =
                createSlug(
                    qrCode?.label ||
                    business.name ||
                    `qr-page-${business.id}`
                );

            if (!baseSlug) {

                baseSlug =
                    qrCode
                        ? `qr-page-${qrCode.id}`
                        : `qr-page-${business.id}`;
            }

            let slug =
                baseSlug;

            let counter =
                1;

            while (true) {

                const [existing] =
                    await db.query(
                        `
                        SELECT
                            id
                        FROM
                            tags_qr_pages
                        WHERE
                            slug = ?
                        LIMIT 1
                        `,
                        [
                            slug
                        ]
                    );

                if (!existing.length) {

                    break;
                }

                slug =
                    `${baseSlug}-${counter}`;

                counter++;
            }

            const [result] =
                await db.query(
                    `
                    INSERT INTO tags_qr_pages (
                        business_id,
                        qr_code_id,
                        page_type,
                        slug,
                        slug_locked,
                        title,
                        description,
                        status,
                        logo_url,
                        cover_image_url,
                        whatsapp,
                        email,
                        phone,
                        global_styles,
                        header_config,
                        footer_config,
                        seo_title,
                        seo_description
                    )
                    VALUES (?, ?, ?, ?, 0, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        business.id,
                        qrCode ? qrCode.id : null,
                        qrCode ? "qr_page" : null,
                        slug,

                        template.page.title,
                        template.page.description,
                        template.page.logo_url,
                        template.page.cover_image_url,
                        template.page.whatsapp,
                        template.page.email,
                        template.page.phone,
                        JSON.stringify(
                            template.page.global_styles || {}
                        ),
                        JSON.stringify(
                            template.page.header_config || {}
                        ),
                        JSON.stringify(
                            template.page.footer_config || {}
                        ),
                        template.page.title,
                        template.page.description
                    ]
                );

            const pageId =
                result.insertId;

            for (const section of template.sections) {

                const [sectionResult] =
                    await db.query(
                        `
                        INSERT INTO tags_qr_page_sections (
                            page_id,
                            type,
                            title,
                            sort_order,
                            settings_json,
                            styles_json
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                        `,
                        [
                            pageId,
                            section.type,
                            section.title,
                            section.sort_order,
                            JSON.stringify(
                                section.settings_json || {}
                            ),
                            JSON.stringify(
                                section.styles_json || {}
                            )
                        ]
                    );

                const sectionId =
                    sectionResult.insertId;

                for (const block of section.blocks || []) {

                    await db.query(
                        `
                        INSERT INTO tags_qr_page_blocks (
                            section_id,
                            type,
                            sort_order,
                            content_json,
                            styles_json
                        )
                        VALUES (?, ?, ?, ?, ?)
                        `,
                        [
                            sectionId,
                            block.type,
                            block.sort_order,
                            JSON.stringify(
                                block.content_json || {}
                            ),
                            JSON.stringify(
                                block.styles_json || {}
                            )
                        ]
                    );
                }
            }

            [pages] =
                await db.query(
                    `
                   SELECT
                        p.*,
                        th.code AS theme_code,
                        th.name AS theme_name,
                        th.css_tokens AS theme_css_tokens
                    FROM
                        tags_qr_pages p
                    LEFT JOIN
                        tags_qr_page_themes th
                            ON th.id = p.theme_id
                    WHERE
                        p.id = ?
                    LIMIT 1
                    `,
                    [
                        pageId
                    ]
                );

            page =
                pages[0];
        }

        const [sections] =
            await db.query(
                `
                SELECT
                    *
                FROM
                    tags_qr_page_sections
                WHERE
                    page_id = ?
                ORDER BY
                    sort_order ASC,
                    id ASC
                `,
                [
                    page.id
                ]
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
                ORDER BY
                    b.sort_order ASC,
                    b.id ASC
                `,
                [
                    page.id
                ]
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
                ORDER BY
                    sort_order ASC,
                    id ASC
                `,
                [
                    page.id
                ]
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
                            .map((block) => {

                                return {

                                    ...block,

                                    content_json:
                                        safeParseJSON(
                                            block.content_json
                                        ),

                                    styles_json:
                                        safeParseJSON(
                                            block.styles_json
                                        )
                                };
                            })
                };
            });

        return Response.json({

            ok: true,

            qrCode,

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
                    typography_tokens:
                        safeParseJSON(
                            page.typography_tokens
                        ),

                    global_styles:
                        safeParseJSON(
                            page.global_styles
                        ),

                    header_config:
                        safeParseJSON(
                            page.header_config
                        ),

                    footer_config:
                        safeParseJSON(
                            page.footer_config
                        ),

                    theme_config:
                        safeParseJSON(
                            page.theme_config
                        ),

                    admin_structured_data_json:
                        safeParseJSON(
                            page.admin_structured_data_json
                        )
                },

                sections:
                    sectionsWithBlocks,

                products
            }
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    err.message
            },
            {
                status: 500
            }
        );
    }
}