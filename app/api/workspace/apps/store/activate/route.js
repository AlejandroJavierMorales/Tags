// =====================================
// API: /api/workspace/apps/store/activate
// Descripción: Activa Tags Tienda desde el Workspace creando QR digital, página pública y tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { createSlug } from "@/app/modules/qr-page/lib/createSlug";
import { registerQRAddonUsage } from "@/app/modules/addons/lib/registerQRAddonUsage";
import { createAppQRCode } from "@/app/modules/qr/lib/createAppQRCode";
import {
    installStoreTemplate
} from "@/app/modules/store/lib/installStoreTemplate";

import {
    installStoreDemoContent
} from "@/app/modules/store/lib/installStoreDemoContent";

function getBaseUrl() {
    return process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL_PROD;
}

export async function POST(req) {
    const conn = await db.getConnection();

    try {
        const {
            businessId,
            name,
            slug
        } = await req.json();

        if (!businessId || !name || !slug) {
            return Response.json(
                { error: "businessId, name y slug son requeridos" },
                { status: 400 }
            );
        }

        const cleanSlug = createSlug(slug);

        if (!cleanSlug) {
            return Response.json(
                { error: "Slug inválido" },
                { status: 400 }
            );
        }

        const [businessRows] = await conn.query(
            `
            SELECT *
            FROM tags_businesses
            WHERE id = ?
            LIMIT 1
            `,
            [businessId]
        );

        const business = businessRows[0];

        if (!business) {
            return Response.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            );
        }

        const [addonRows] = await conn.query(
            `
            SELECT id
            FROM tags_business_addons
            WHERE business_id = ?
            AND addon_code = 'store'
            AND status = 'active'
            AND (
                expires_at IS NULL
                OR expires_at >= NOW()
            )
            LIMIT 1
            `,
            [businessId]
        );

        if (!addonRows.length) {
            return Response.json(
                { error: "El cliente no tiene Tags Tienda activo" },
                { status: 403 }
            );
        }

        const [existingStoreRows] = await conn.query(
            `
            SELECT id
            FROM tags_stores
            WHERE business_id = ?
            AND (
                    app_type = 'store'
                    OR app_type IS NULL
                )
            LIMIT 1
            `,
            [businessId]
        );

        if (existingStoreRows.length) {
            return Response.json(
                { error: "Este cliente ya tiene una tienda creada" },
                { status: 409 }
            );
        }

        const [slugRows] = await conn.query(
            `
            SELECT id
            FROM tags_qr_pages
            WHERE slug = ?
            LIMIT 1
            `,
            [cleanSlug]
        );

        if (slugRows.length) {
            return Response.json(
                { error: "Ese nombre público ya está en uso" },
                { status: 409 }
            );
        }

        await conn.beginTransaction();

        const publicUrl = `${getBaseUrl()}/p/${cleanSlug}`;

        const qr = await createAppQRCode({
            conn,
            businessId,
            label: name,
            value: publicUrl,
            finalUrl: publicUrl,
            status: "active"
        });

        const [pageResult] = await conn.query(
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
            VALUES (?, ?, 'store', 'store', ?, 1, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `,
            [
                businessId,
                qr.id,
                cleanSlug,
                name,
                `Tienda online de ${name}`,
                business.email || null,
                business.phone || null,
                business.phone || null,
                JSON.stringify({}),
                JSON.stringify({}),
                JSON.stringify({}),
                `${name} | Tienda Online`,
                `Comprá productos de ${name} de forma simple.`
            ]
        );

        const pageId = pageResult.insertId;

        const [storeResult] = await conn.query(
            `
            INSERT INTO tags_stores (
                business_id,
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
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ARS', 'published', ?, ?, ?, ?, NOW(), NOW())
            `,
            [
                businessId,
                pageId,
                cleanSlug,
                name,
                `Tienda online de ${name}`,
                business.phone || null,
                business.email || null,
                `${name} | Tienda Online`,
                `Comprá productos de ${name} de forma simple.`,
                JSON.stringify({}),
                JSON.stringify({})
            ]
        );

        const storeId = storeResult.insertId;

        await installStoreTemplate(
            storeId,
            conn
        );

        await installStoreDemoContent(
            storeId,
            conn
        );

        await registerQRAddonUsage({
            conn,
            qrCodeId: qr.id,
            businessId,
            addonCode: "store",
            sourceTable: "tags_stores",
            sourceId: storeId
        });

        await conn.query(
            `
            UPDATE tags_qr_codes
            SET has_qr_page = 1
            WHERE id = ?
            AND business_id = ?
            `,
            [qr.id, businessId]
        );

        await conn.commit();

        return Response.json({
            ok: true,
            qrId: qr.id,
            qrCode: qr.code,
            pageId,
            storeId,
            slug: cleanSlug,
            publicUrl
        });

    } catch (err) {
        await conn.rollback();

        console.error("WORKSPACE STORE ACTIVATE ERROR:", err);

        return Response.json(
            { error: err.message || "Error activando Tags Tienda" },
            { status: err.status || 500 }
        );

    } finally {
        conn.release();
    }
}