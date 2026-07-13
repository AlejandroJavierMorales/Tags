// =====================================
// API: /api/workspace/apps/tags-id/activate
// Nombre: Activar Tags Id desde Workspace
// Descripción: Activa un Tags Id creando automáticamente un QR digital,
// crea/publica su QR-Page con template tags_id, bloquea el slug
// y setea la URL final del QR.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { createSlug }
    from "@/app/modules/qr-page/lib/createSlug";

import { safeParseJSON }
    from "@/app/modules/qr-page/lib/safeParseJSON";

import { registerQRAddonUsage }
    from "@/app/modules/addons/lib/registerQRAddonUsage";

import { createAppQRCode }
    from "@/app/modules/qr/lib/createAppQRCode";

function getBaseUrl() {

    return process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL_PROD;
}

const TAGS_ID_INITIAL_THEME =
    "dark";

const TAGS_ID_INITIAL_GLOBAL_STYLES = {
    fontFamily: "Arial",
    borderRadius: "14px",
    showFloatingWhatsapp: true,
    showBackToTop: true
};

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const {
            businessId,
            title,
            name,
            slug
        } = await req.json();

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
                { status: 400 }
            );
        }

        if (!slug) {
            return Response.json(
                { error: "slug requerido" },
                { status: 400 }
            );
        }

        const cleanSlug =
            createSlug(slug);

        if (!cleanSlug) {
            return Response.json(
                { error: "Slug inválido" },
                { status: 400 }
            );
        }

        const [businessRows] =
            await conn.query(
                `
                SELECT
                    *
                FROM
                    tags_businesses
                WHERE
                    id = ?
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const business =
            businessRows[0] || null;

        if (!business) {
            return Response.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            );
        }

        const [addonRows] =
            await conn.query(
                `
                SELECT
                    id
                FROM
                    tags_business_addons
                WHERE
                    business_id = ?
                    AND addon_code = 'tagsid'
                    AND status = 'active'
                    AND (
                        expires_at IS NULL
                        OR expires_at >= NOW()
                    )
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        if (!addonRows.length) {
            return Response.json(
                { error: "El cliente no tiene Tags ID activo" },
                { status: 403 }
            );
        }

        const [activeTagsIds] =
            await conn.query(
                `
                SELECT
                    id
                FROM
                    tags_qr_pages
                WHERE
                    business_id = ?
                    AND page_type = 'tags_id'
                    AND status IN ('draft', 'published')
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        if (activeTagsIds.length) {
            return Response.json(
                {
                    error:
                        "Este cliente ya tiene un Tags Id asociado"
                },
                {
                    status: 409
                }
            );
        }

        const [existingSlug] =
            await conn.query(
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
                    cleanSlug
                ]
            );

        if (existingSlug.length) {
            return Response.json(
                { error: "Ese slug ya está en uso" },
                { status: 409 }
            );
        }

        const [templates] =
            await conn.query(
                `
                SELECT
                    *
                FROM
                    tags_qr_page_templates
                WHERE
                    code = 'tags_id'
                    AND is_active = 1
                LIMIT 1
                `
            );

        if (!templates.length) {
            return Response.json(
                { error: "Template Tags Id no encontrado" },
                { status: 404 }
            );
        }

        const template =
            templates[0];

        const templateJson =
            safeParseJSON(
                template.template_json
            );

        const sections =
            Array.isArray(templateJson.sections)
                ? templateJson.sections
                : [];

        const templateProducts =
            Array.isArray(templateJson.products)
                ? templateJson.products
                : [];

        if (!sections.length) {
            return Response.json(
                { error: "Template Tags Id vacío o inválido" },
                { status: 400 }
            );
        }

        const ownerEmail =
            business.email;

        if (!ownerEmail) {
            return Response.json(
                { error: "El Tags Id no tiene email asociado" },
                { status: 400 }
            );
        }

        const displayName =
            title ||
            name ||
            business.name ||
            "Nombre Apellido";

        const displayDescription =
            "Tarjeta personal digital. Editá esta información para presentar tu perfil, compartir tus datos de contacto y mostrar tus enlaces principales.";

        const displayCompany =
            business.name ||
            "Empresa / Marca";

        const displayJobTitle =
            "Cargo o especialidad";

        const displayPhone =
            business.phone ||
            null;

        const displayWhatsapp =
            business.phone ||
            null;

        const displayWebsite =
            null;

        const displayInstagram =
            null;

        const displayLinkedin =
            null;

        const finalUrl =
            `${getBaseUrl()}/p/${cleanSlug}`;

        await conn.beginTransaction();

        const qr =
            await createAppQRCode({
                conn,
                businessId,
                label: displayName,
                value: finalUrl,
                finalUrl,
                status: "active"
            });

        const [result] =
            await conn.query(
                `
                INSERT INTO tags_qr_pages (
                    business_id,
                    qr_code_id,
                    page_type,
                    theme_id,
                    global_styles,
                    slug,
                    slug_locked,
                    title,
                    description,
                    status,
                    email,
                    phone,
                    whatsapp,
                    website_url,
                    instagram_url,
                    linkedin_url,
                    seo_title,
                    seo_description,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, 'tags_id', ?, ?, ?, 1, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `,
                [
                    business.id,
                    qr.id,
                    TAGS_ID_INITIAL_THEME,
                    JSON.stringify(
                        TAGS_ID_INITIAL_GLOBAL_STYLES
                    ),
                    cleanSlug,
                    displayName,
                    displayDescription,
                    ownerEmail,
                    displayPhone,
                    displayWhatsapp,
                    displayWebsite,
                    displayInstagram,
                    displayLinkedin,
                    displayName,
                    displayDescription
                ]
            );

        const pageId =
            result.insertId;

        const [oldSections] =
            await conn.query(
                `
                SELECT
                    id
                FROM
                    tags_qr_page_sections
                WHERE
                    page_id = ?
                `,
                [
                    pageId
                ]
            );

        for (const section of oldSections) {
            await conn.query(
                `
                DELETE FROM
                    tags_qr_page_blocks
                WHERE
                    section_id = ?
                `,
                [
                    section.id
                ]
            );
        }

        await conn.query(
            `
            DELETE FROM
                tags_qr_page_sections
            WHERE
                page_id = ?
            `,
            [
                pageId
            ]
        );

        await conn.query(
            `
            DELETE FROM
                tags_qr_page_products
            WHERE
                page_id = ?
            `,
            [
                pageId
            ]
        );

        for (let i = 0; i < sections.length; i++) {

            const section =
                sections[i];

            const [sectionResult] =
                await conn.query(
                    `
                    INSERT INTO tags_qr_page_sections (
                        page_id,
                        type,
                        title,
                        sort_order,
                        is_visible,
                        settings_json,
                        styles_json
                    )
                    VALUES (?, ?, ?, ?, 1, ?, ?)
                    `,
                    [
                        pageId,
                        section.type || "content",
                        section.title || null,
                        i + 1,
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

            const blocks =
                Array.isArray(section.blocks)
                    ? section.blocks
                    : [];

            for (let j = 0; j < blocks.length; j++) {

                const block =
                    blocks[j];

                let contentJson =
                    block.content_json || {};
                                    if (block.type === "profile_card") {

                    contentJson = {
                        ...contentJson,
                        name: displayName,
                        company: displayCompany,
                        jobTitle: displayJobTitle,
                        bio: displayDescription,
                        photo_url:
                            contentJson.photo_url || ""
                    };
                }

                if (block.type === "social_actions") {

                    contentJson = {
                        ...contentJson,
                        forceDemo: true,
                        showEmail: true,
                        showPhone: true,
                        showWebsite: true,
                        showLinkedin: true,
                        showWhatsapp: true,
                        showInstagram: true
                    };
                }

                if (block.type === "vcard") {

                    contentJson = {
                        ...contentJson,
                        buttonLabel:
                            contentJson.buttonLabel ||
                            "Guardar contacto"
                    };
                }

                if (block.type === "share_profile") {

                    contentJson = {
                        ...contentJson,
                        buttonLabel:
                            contentJson.buttonLabel ||
                            "Compartir perfil"
                    };
                }

                if (block.type === "profile_qr") {

                    contentJson = {
                        ...contentJson,
                        title:
                            contentJson.title ||
                            "Escaneá mi QR",
                        text:
                            contentJson.text ||
                            "Compartí esta tarjeta digital escaneando el código o apoyando la tarjeta NFC.",
                        showUrl: true,
                        qrUrl:
                            `${getBaseUrl()}/t/${qr.code}`
                    };
                }

                await conn.query(
                    `
                    INSERT INTO tags_qr_page_blocks (
                        section_id,
                        type,
                        sort_order,
                        is_visible,
                        content_json,
                        styles_json
                    )
                    VALUES (?, ?, ?, 1, ?, ?)
                    `,
                    [
                        sectionId,
                        block.type || "text",
                        j + 1,
                        JSON.stringify(
                            contentJson
                        ),
                        JSON.stringify(
                            block.styles_json || {}
                        )
                    ]
                );
            }
        }

        for (let i = 0; i < templateProducts.length; i++) {

            const product =
                templateProducts[i];

            await conn.query(
                `
                INSERT INTO tags_qr_page_products (
                    page_id,
                    title,
                    description,
                    price,
                    currency,
                    image_url,
                    images_json,
                    button_label,
                    whatsapp_text,
                    sort_order,
                    is_visible
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                `,
                [
                    pageId,
                    product.title,
                    product.description,
                    product.price,
                    product.currency || "ARS",
                    product.image_url,
                    JSON.stringify([
                        {
                            url:
                                product.image_url,
                            alt:
                                product.title
                        }
                    ]),
                    "Consultar",
                    `Hola, quiero consultar por ${product.title}`,
                    i + 1
                ]
            );
        }

        await registerQRAddonUsage({
            qrCodeId: qr.id,
            businessId: business.id,
            addonCode: "tagsid",
            sourceTable: "tags_qr_pages",
            sourceId: pageId
        });

        await conn.query(
            `
            UPDATE
                tags_qr_codes
            SET
                status = 'active',
                final_url = ?,
                has_qr_page = 1
            WHERE
                id = ?
                AND business_id = ?
            `,
            [
                finalUrl,
                qr.id,
                business.id
            ]
        );

        await conn.commit();

        return Response.json({
            ok: true,
            qrId: qr.id,
            qrCode: qr.code,
            pageId,
            slug: cleanSlug,
            publicUrl: finalUrl
        });

    } catch (err) {

        await conn.rollback();

        console.error(
            "WORKSPACE TAGS ID ACTIVATE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error activando Tags ID desde Workspace"
            },
            {
                status:
                    err.status || 500
            }
        );

    } finally {

        conn.release();
    }
}