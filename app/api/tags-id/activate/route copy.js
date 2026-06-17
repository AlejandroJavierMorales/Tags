// =====================================
// API: /api/tags-id/activate
// Nombre: Activar Tags Id
// Descripción: Activa un Tags Id asociado a un QR,
// crea/publica su QR-Page con template tags_id,
// bloquea el slug y setea la URL final del QR.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

import { createSlug }
    from "@/app/modules/qr-page/lib/createSlug";

import { safeParseJSON }
    from "@/app/modules/qr-page/lib/safeParseJSON";

import { registerQRAddonUsage }
    from "@/app/modules/addons/lib/registerQRAddonUsage";

function getBaseUrl() {

    return process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL_PROD;
}

export async function POST(req) {

    try {

        // =====================================
        // PARAMS
        // =====================================

        const {
            businessId,
            qrCodeId,
            slug
        } = await req.json();

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
                { status: 400 }
            );
        }

        if (!qrCodeId) {
            return Response.json(
                { error: "qrCodeId requerido" },
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

        // =====================================
        // ACCESS
        // =====================================

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

        const { business } =
            access;

        // =====================================
        // QR
        // =====================================

        const [qrRows] =
            await db.query(
                `
        SELECT
            q.*
        FROM
            tags_qr_codes q
        WHERE
            q.id = ?
            AND q.business_id = ?
        LIMIT 1
        `,
                [
                    qrCodeId,
                    business.id
                ]
            );

        const qr =
            qrRows[0] || null;

        if (!qr) {
            return Response.json(
                { error: "QR no encontrado" },
                { status: 404 }
            );
        }

        // =====================================
        // VALIDAR QUE EL QR NO TENGA PAGE
        // =====================================

        const [existingQrPage] =
            await db.query(
                `
        SELECT
            id,
            page_type
        FROM
            tags_qr_pages
        WHERE
            qr_code_id = ?
        LIMIT 1
        `,
                [
                    qr.id
                ]
            );

        if (existingQrPage.length) {

            return Response.json(
                {
                    error:
                        "Este QR ya tiene una QR-Page o TagsID asociado"
                },
                {
                    status: 409
                }
            );
        }





        const ownerEmail =
            qr.email ||
            business.email;

        if (!ownerEmail) {
            return Response.json(
                { error: "El Tags Id no tiene email asociado" },
                { status: 400 }
            );
        }

        const displayName =
            qr.label ||
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
        // =====================================
        // VALIDAR 1 TAGSID POR CLIENTE
        // =====================================

        const [activeTagsIds] =
            await db.query(
                `
        SELECT
            id
        FROM
            tags_qr_pages
        WHERE
            business_id = ?
            AND page_type = 'tags_id'
            AND status IN ('draft', 'published')
            AND qr_code_id <> ?
        LIMIT 1
        `,
                [
                    business.id,
                    qr.id
                ]
            );

        // =====================================
        // VALIDAR SLUG
        // =====================================

        const [existingSlug] =
            await db.query(
                `
                SELECT
                    id
                FROM
                    tags_qr_pages
                WHERE
                    slug = ?
                    AND (
                        qr_code_id IS NULL
                        OR qr_code_id <> ?
                    )
                LIMIT 1
                `,
                [
                    cleanSlug,
                    qr.id
                ]
            );

        if (existingSlug.length) {
            return Response.json(
                { error: "Ese slug ya está en uso" },
                { status: 409 }
            );
        }

        // =====================================
        // TEMPLATE TAGS ID
        // =====================================

        const [templates] =
            await db.query(
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

        // =====================================
        // BUSCAR / CREAR PAGE
        // =====================================

        const [existingPages] =
            await db.query(
                `
                SELECT
                    id,
                    slug_locked
                FROM
                    tags_qr_pages
                WHERE
                    qr_code_id = ?
                    AND business_id = ?
                LIMIT 1
                `,
                [
                    qr.id,
                    business.id
                ]
            );

        let pageId =
            existingPages[0]?.id || null;

        if (
            pageId &&
            existingPages[0].slug_locked
        ) {
            return Response.json(
                {
                    error:
                        "Este Tags Id ya fue activado y el slug está bloqueado"
                },
                {
                    status: 409
                }
            );
        }

        if (pageId) {

            await db.query(
                `
                UPDATE
                    tags_qr_pages
                SET
                    slug = ?,
                    page_type = 'tags_id',
                    slug_locked = 1,
                    status = 'published',
                    title = ?,
                    description = ?,
                    email = ?,
                    phone = ?,
                    whatsapp = ?,
                    website_url = ?,
                    instagram_url = ?,
                    linkedin_url = ?,
                    updated_at = NOW()
                WHERE
                    id = ?
                    AND business_id = ?
                `,
                [
                    cleanSlug,
                    displayName,
                    displayDescription,
                    ownerEmail,
                    displayPhone,
                    displayWhatsapp,
                    displayWebsite,
                    displayInstagram,
                    displayLinkedin,
                    pageId,
                    business.id
                ]
            );

        } else {

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
                        email,
                        phone,
                        whatsapp,
                        website_url,
                        instagram_url,
                        linkedin_url,
                        seo_title,
                        seo_description
                    )
                    VALUES (?, ?, 'tags_id', ?, 1, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        business.id,
                        qr.id,
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

            pageId =
                result.insertId;
        }

        // =====================================
        // REEMPLAZAR SECCIONES / BLOQUES
        // =====================================

        const [oldSections] =
            await db.query(
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
            await db.query(
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

        await db.query(
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

        await db.query(
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
                await db.query(
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
                        qrUrl: `${getBaseUrl()}/t/${qr.code}`
                    };
                }

                await db.query(
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

        // =====================================
        // PRODUCTS DEL TEMPLATE
        // =====================================

        for (let i = 0; i < templateProducts.length; i++) {

            const product =
                templateProducts[i];

            await db.query(
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

        // =====================================
        // REGISTRAR USO DE ADDON TAGSID
        // =====================================

        await registerQRAddonUsage({
            qrCodeId: qr.id,
            businessId: business.id,
            addonCode: "tags_id",
            sourceTable: "tags_qr_pages",
            sourceId: pageId
        });

        // =====================================
        // ACTIVAR QR
        // =====================================

        const finalUrl =
            `${getBaseUrl()}/p/${cleanSlug}`;

        await db.query(
            `
            UPDATE
                tags_qr_codes
            SET
                status = 'active',
                final_url = ?
            WHERE
                id = ?
            `,
            [
                finalUrl,
                qr.id
            ]
        );

        return Response.json({
            ok: true,
            pageId,
            slug: cleanSlug,
            publicUrl: finalUrl
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            { error: err.message },
            { status: 500 }
        );
    }
}