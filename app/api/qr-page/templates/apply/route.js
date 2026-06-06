// =====================================
// API: /api/qr-page/templates/apply
// Nombre: Aplicar template QR-Page
// Descripción: Reemplaza secciones y bloques de una QR-Page con un template.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

import { safeParseJSON }
    from "@/app/modules/qr-page/lib/safeParseJSON";

export async function POST(req) {

    try {

        const {
            businessId,
            pageId,
            templateId
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

        if (!templateId) {
            return Response.json(
                { error: "templateId requerido" },
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

        const [templates] =
            await db.query(
                `
                SELECT
                    *
                FROM
                    tags_qr_page_templates
                WHERE
                    id = ?
                    AND is_active = 1
                LIMIT 1
                `,
                [
                    templateId
                ]
            );

        if (!templates.length) {
            return Response.json(
                { error: "Template no encontrado" },
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
                { error: "Template vacío o inválido" },
                { status: 400 }
            );
        }

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

        /*         await db.query(
                    `
                    DELETE FROM
                        tags_qr_page_products
                    WHERE
                        page_id = ?
                    `,
                    [
                        pageId
                    ]
                ); */

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
                            block.content_json || {}
                        ),
                        JSON.stringify(
                            block.styles_json || {}
                        )
                    ]
                );
            }
        }


        const [existingProducts] =
            await db.query(
                `
        SELECT
            COUNT(*) AS total
        FROM
            tags_qr_page_products
        WHERE
            page_id = ?
        `,
                [
                    pageId
                ]
            );

        const shouldCreateDemoProducts =
            Number(existingProducts[0]?.total || 0) === 0;

        if (shouldCreateDemoProducts) {
            for (
                let i = 0;
                i < templateProducts.length;
                i++
            ) {

                const product =
                    templateProducts[i];

                const finalPrice =
                    product.price || ((i + 1) * 5000 + 5000);

                const finalOldPrice =
                    product.old_price ||
                    Math.round(Number(finalPrice) * 1.25);

                const finalDiscountLabel =
                    product.discount_label ||
                    "20% OFF";

                await db.query(
                    `
        INSERT INTO tags_qr_page_products (
            page_id,
            category,
            title,
            description,
            price,
            old_price,
            discount_label,
            currency,
            image_url,
            images_json,
            button_label,
            button_url,
            whatsapp_text,
            sort_order,
            is_visible
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1
        )
        `,
                    [
                        pageId,
                        product.category || "products",
                        product.title || `Producto ${i + 1}`,
                        product.description || "Descripción breve del producto. Reemplazá este texto por la información real.",
                        finalPrice,
                        finalOldPrice,
                        finalDiscountLabel,
                        product.currency || "ARS",
                        product.image_url || null,

                        JSON.stringify(
                            Array.isArray(product.images_json)
                                ? product.images_json
                                : product.image_url
                                    ? [
                                        {
                                            url: product.image_url,
                                            alt: product.title || `Producto ${i + 1}`
                                        }
                                    ]
                                    : []
                        ),

                        product.button_label || "Consultar",
                        product.button_url || null,

                        product.whatsapp_text ||
                        `Hola, quiero consultar por ${product.title || `Producto ${i + 1}`}`,

                        i + 1
                    ]
                );
            }
        }

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