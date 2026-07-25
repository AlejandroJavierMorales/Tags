// =====================================
// API: /api/workspace/apps/resto/activate
// Descripción:
// Activa Tags Resto desde el Workspace creando
// QR principal, página pública y aplicación Resto.
// El slug se define una única vez y queda bloqueado.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import { createSlug }
    from "@/app/modules/qr-page/lib/createSlug";

import { registerQRAddonUsage }
    from "@/app/modules/addons/lib/registerQRAddonUsage";

import { createAppQRCode }
    from "@/app/modules/qr/lib/createAppQRCode";
import { installRestoTemplate } from "@/app/modules/resto/lib/installRestoTemplate";

function getBaseUrl() {
    return process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL_PROD;
}

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const {
            businessId,
            name,
            slug
        } = await req.json();

        if (
            !businessId ||
            !name ||
            !slug
        ) {

            return Response.json(
                {
                    error:
                        "businessId, name y slug son requeridos"
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

        const [businessRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_businesses
                WHERE id = ?
                LIMIT 1
                `,
                [
                    businessId
                ]
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

        const [addonRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_business_addons
                WHERE business_id = ?
                AND addon_code = 'resto'
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
                {
                    error:
                        "El cliente no tiene Tags Resto activo"
                },
                {
                    status: 403
                }
            );

        }

        const [existingRestoRows] =
            await conn.query(
                `
                SELECT
                    id,
                    page_id,
                    slug
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'resto'
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        if (existingRestoRows.length) {

            return Response.json(
                {
                    error:
                        "Este cliente ya tiene Tags Resto creado"
                },
                {
                    status: 409
                }
            );

        }

        const [slugRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_qr_pages
                WHERE slug = ?
                LIMIT 1
                `,
                [
                    cleanSlug
                ]
            );

        if (slugRows.length) {

            return Response.json(
                {
                    error:
                        "Ese nombre público ya está en uso"
                },
                {
                    status: 409
                }
            );

        }

        await conn.beginTransaction();

        const publicUrl =
            `${getBaseUrl()}/p/${cleanSlug}`;

        const qr =
            await createAppQRCode({
                conn,
                businessId,
                label: name,
                value: publicUrl,
                finalUrl: publicUrl,
                status: "active"
            });

        const [pageResult] =
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
                    email,
                    phone,
                    whatsapp,
                    global_styles,
                    header_config,
                    footer_config,
                    seo_title,
                    seo_description,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?,
                    ?,
                    'resto',
                    'restaurant',
                    ?,
                    1,
                    ?,
                    ?,
                    'published',
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    NOW(),
                    NOW()
                )
                `,
                [
                    businessId,
                    qr.id,
                    cleanSlug,
                    name,
                    `Menú digital de ${name}`,
                    business.email || null,
                    business.phone || null,
                    business.phone || null,
                    JSON.stringify({}),
                    JSON.stringify({}),
                    JSON.stringify({}),
                    `${name} | Menú Digital`,
                    `Consultá el menú y realizá pedidos en ${name}.`
                ]
            );

        const pageId =
            pageResult.insertId;

        const [restoResult] =
            await conn.query(
                `
                INSERT INTO tags_stores (
                    business_id,
                    app_type,
                    page_id,
                    slug,
                    name,
                    description,
                    whatsapp,
                    email,
                    currency,
                    status,
                    seo_title,
                    seo_description,
                    settings_json,
                    styles_json,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?,
                    'resto',
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'ARS',
                    'published',
                    ?,
                    ?,
                    ?,
                    ?,
                    NOW(),
                    NOW()
                )
                `,
                [
                    businessId,
                    pageId,
                    cleanSlug,
                    name,
                    `Menú digital de ${name}`,
                    business.phone || null,
                    business.email || null,
                    `${name} | Menú Digital`,
                    `Consultá el menú y realizá pedidos en ${name}.`,
                    JSON.stringify({
                        serviceModes: {
                            table: true,
                            takeaway: true,
                            delivery: false
                        },
                        orderTrackingEnabled: false,
                        showOwnHeader: true,
                        showOwnFooter: true
                    }),
                    JSON.stringify({})
                ]
            );

        const restoId =
            restoResult.insertId;

        await installRestoTemplate(
            restoId,
            conn
        );

        await registerQRAddonUsage({
            conn,
            qrCodeId: qr.id,
            businessId,
            addonCode: "resto",
            sourceTable: "tags_stores",
            sourceId: restoId
        });

        await conn.query(
            `
            UPDATE tags_qr_codes
            SET has_qr_page = 1
            WHERE id = ?
            AND business_id = ?
            `,
            [
                qr.id,
                businessId
            ]
        );

        await conn.commit();

        return Response.json({
            ok: true,
            qrId: qr.id,
            qrCode: qr.code,
            pageId,
            restoId,
            slug: cleanSlug,
            publicUrl
        });

    } catch (err) {

        await conn.rollback();

        console.error(
            "WORKSPACE RESTO ACTIVATE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error activando Tags Resto"
            },
            {
                status:
                    err.status ||
                    500
            }
        );

    } finally {

        conn.release();

    }

}