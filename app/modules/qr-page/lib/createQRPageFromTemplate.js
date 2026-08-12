// =====================================
// FILE: app/modules/qr-page/lib/createQRPageFromTemplate.js
// Descripción: Crea una QR-Page con template, secciones y bloques para un QR existente.
// =====================================

import { getDefaultQRPageTemplate }
    from "@/app/modules/qr-page/lib/defaultQRPageTemplate";

export async function createQRPageFromTemplate({
    conn,
    business,
    businessId,
    qrCodeId,
    slug,
    title = null,
    status = "draft",
    pageType = "qr_page",
    templateOverride = null
}) {
    const template =
        templateOverride || getDefaultQRPageTemplate({
            ...business,
            name: title || business?.name
        });

    const pageTitle =
        title || template.page.title;

    const [result] =
        await conn.query(
            `
            INSERT INTO tags_qr_pages (
                business_id,
                qr_code_id,
                page_type,
                schema_type,
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
                address,
                website_url,
                instagram_url,
                facebook_url,
                global_styles,
                header_config,
                footer_config,
                seo_title,
                seo_description,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, 'auto', ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `,
            [
                businessId,
                qrCodeId,
                pageType,
                slug,
                pageTitle,
                template.page.description,
                status,
                template.page.logo_url,
                template.page.cover_image_url,
                template.page.whatsapp,
                template.page.email,
                template.page.phone,
                template.page.address || null,
                template.page.website_url || null,
                template.page.instagram_url || null,
                template.page.facebook_url || null,
                JSON.stringify(template.page.global_styles || {}),
                JSON.stringify(template.page.header_config || {}),
                JSON.stringify(template.page.footer_config || {}),
                pageTitle,
                template.page.description
            ]
        );

    const pageId =
        result.insertId;

    for (const section of template.sections || []) {
        const [sectionResult] =
            await conn.query(
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
                    JSON.stringify(section.settings_json || {}),
                    JSON.stringify(section.styles_json || {})
                ]
            );

        const sectionId =
            sectionResult.insertId;

        for (const block of section.blocks || []) {
            await conn.query(
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
                    JSON.stringify(block.content_json || {}),
                    JSON.stringify(block.styles_json || {})
                ]
            );
        }
    }

    return {
        pageId,
        template
    };
}
