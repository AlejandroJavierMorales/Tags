// =====================================
// API: /api/qr-page/activate
// Descripción: Activa una QR-Page para un QR, validando cupo y slug.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import { canActivateQRPage }
    from "@/app/modules/qr-page/lib/canActivateQRPage";

import { getDefaultQRPageTemplate }
    from "@/app/modules/qr-page/lib/defaultQRPageTemplate";

import { createSlug }
    from "@/app/modules/qr-page/lib/createSlug";

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const body =
            await req.json();

        const {
            businessId,
            qrCodeId,
            slug
        } = body;

        if (!businessId || !qrCodeId || !slug) {
            return Response.json(
                {
                    error:
                        "businessId, qrCodeId y slug son requeridos"
                },
                {
                    status: 400
                }
            );
        }

        const cleanSlug =
            createSlug(slug);

        if (!cleanSlug) {
            return Response.json(
                {
                    error:
                        "Slug inválido"
                },
                {
                    status: 400
                }
            );
        }

        const canActivate =
            await canActivateQRPage({
                businessId,
                qrCodeId
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

        const [existingSlug] =
            await conn.query(
                `
                SELECT id
                FROM tags_qr_pages
                WHERE slug = ?
                LIMIT 1
                `,
                [cleanSlug]
            );

        if (existingSlug.length) {
            return Response.json(
                {
                    error:
                        "Ese slug ya está en uso"
                },
                {
                    status: 409
                }
            );
        }

        const [qrRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_qr_codes
                WHERE id = ?
                AND business_id = ?
                LIMIT 1
                `,
                [
                    qrCodeId,
                    businessId
                ]
            );

        const qrCode =
            qrRows[0];

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

        const [businessRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_businesses
                WHERE id = ?
                LIMIT 1
                `,
                [businessId]
            );

        const business =
            businessRows[0];

        if (!business) {
            return Response.json(
                {
                    error:
                        "Cliente no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const [existingPage] =
            await conn.query(
                `
                SELECT id
                FROM tags_qr_pages
                WHERE business_id = ?
                AND qr_code_id = ?
                LIMIT 1
                `,
                [
                    businessId,
                    qrCodeId
                ]
            );

        if (existingPage.length) {
            return Response.json(
                {
                    error:
                        "Este QR ya tiene una QR-Page"
                },
                {
                    status: 409
                }
            );
        }

        await conn.beginTransaction();

        const template =
            getDefaultQRPageTemplate(
                business
            );

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
            global_styles,
            header_config,
            footer_config,
            seo_title,
            seo_description,
            created_at,
            updated_at
        )
        VALUES (?, ?, 'qr_page', 'auto', ?, 1, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [
            businessId,
            qrCodeId,
            cleanSlug,

            template.page.title,
            template.page.description,

            template.page.logo_url,
            template.page.cover_image_url,

            template.page.whatsapp,
            template.page.email,
            template.page.phone,

            JSON.stringify(template.page.global_styles || {}),
            JSON.stringify(template.page.header_config || {}),
            JSON.stringify(template.page.footer_config || {}),

            template.page.title,
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

        await conn.query(
            `
            UPDATE tags_qr_codes
            SET has_qr_page = 1
            WHERE id = ?
            AND business_id = ?
            `,
            [
                qrCodeId,
                businessId
            ]
        );

        await conn.commit();

        return Response.json({
            ok: true,
            pageId,
            slug: cleanSlug
        });

    } catch (err) {

        await conn.rollback();

        console.log("QR PAGE ACTIVATE ERROR:", err);

        return Response.json(
            {
                error:
                    "Error activando QR-Page"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();
    }
}