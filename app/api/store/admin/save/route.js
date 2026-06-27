// =====================================
// API: /api/store/admin/save
// Descripción: Crea o actualiza la tienda de un cliente.
// Uso: Dashboard admin / cliente.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import {
    installStoreDemoContent
}
    from "@/app/modules/store/lib/installStoreDemoContent";

import { db } from "@/app/lib/tags-db";
import {
    installStoreTemplate
}
    from "@/app/modules/store/lib/installStoreTemplate";

function createSlug(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

function safe(value) {
    return value === undefined || value === ""
        ? null
        : value;
}

export async function POST(req) {
    const conn =
        await db.getConnection();

    try {
        const body =
            await req.json();

        const {
            businessId,
            storeId,
            name,
            slug,
            description,
            logo_url,
            cover_url,
            whatsapp,
            email,
            address,
            currency,
            status,
            seo_title,
            seo_description,
            settings_json,
            styles_json
        } = body;

        if (!businessId) {
            return Response.json(
                {
                    error: "businessId es requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!name) {
            return Response.json(
                {
                    error: "El nombre de la tienda es requerido"
                },
                {
                    status: 400
                }
            );
        }

        const cleanSlug =
            createSlug(slug || name);

        if (!cleanSlug) {
            return Response.json(
                {
                    error: "El slug de la tienda no es válido"
                },
                {
                    status: 400
                }
            );
        }

        await conn.beginTransaction();

        // =====================================
        // VALIDAR SLUG
        // =====================================

        const [slugRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_stores
                WHERE slug = ?
                AND id <> ?
                LIMIT 1
                `,
                [
                    cleanSlug,
                    storeId || 0
                ]
            );

        if (slugRows.length) {
            await conn.rollback();

            return Response.json(
                {
                    error: "Ese slug ya está en uso"
                },
                {
                    status: 409
                }
            );
        }

        // =====================================
        // UPDATE
        // =====================================

        if (storeId) {
            await conn.query(
                `
                UPDATE tags_stores
                SET
                    slug = ?,
                    name = ?,
                    description = ?,
                    logo_url = ?,
                    cover_url = ?,
                    whatsapp = ?,
                    email = ?,
                    address = ?,
                    currency = ?,
                    status = ?,
                    seo_title = ?,
                    seo_description = ?,
                    settings_json = ?,
                    styles_json = ?
                WHERE id = ?
                AND business_id = ?
                `,
                [
                    cleanSlug,
                    name,
                    safe(description),
                    safe(logo_url),
                    safe(cover_url),
                    safe(whatsapp),
                    safe(email),
                    safe(address),
                    currency || "ARS",
                    status || "draft",
                    safe(seo_title),
                    safe(seo_description),
                    JSON.stringify(settings_json || {}),
                    JSON.stringify(styles_json || {}),
                    storeId,
                    businessId
                ]
            );

            // También sincronizamos la QR-Page contenedora
            await conn.query(
                `
                UPDATE tags_qr_pages p
                INNER JOIN tags_stores s
                    ON s.page_id = p.id
                SET
                    p.slug = ?,
                    p.status = ?,
                    p.seo_title = ?,
                    p.seo_description = ?,
                    p.updated_at = NOW()
                WHERE s.id = ?
                AND s.business_id = ?
                AND p.page_type = 'store'
                `,
                [
                    cleanSlug,
                    status === "published" ? "published" : "draft",
                    seo_title || name,
                    seo_description || description || null,
                    storeId,
                    businessId
                ]
            );

            await conn.commit();

            return Response.json({
                ok: true,
                message: "Tienda actualizada correctamente",
                storeId
            });
        }

        // =====================================
        // CREATE QR-PAGE CONTENEDORA
        // =====================================

        const [pageResult] =
            await conn.query(
                `
                INSERT INTO tags_qr_pages (
                    business_id,
                    page_type,
                    schema_type,
                    slug,
                    status,
                    seo_title,
                    seo_description,
                    robots_index,
                    robots_follow,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?,
                    'store',
                    'Store',
                    ?,
                    ?,
                    ?,
                    ?,
                    1,
                    1,
                    NOW(),
                    NOW()
                )
                `,
                [
                    businessId,
                    cleanSlug,
                    status === "published" ? "published" : "draft",
                    seo_title || name,
                    seo_description || description || null
                ]
            );

        const pageId =
            pageResult.insertId;

        // =====================================
        // CREATE STORE
        // =====================================

        const [storeResult] =
            await conn.query(
                `
                INSERT INTO tags_stores (
                    business_id,
                    page_id,
                    slug,
                    name,
                    description,
                    logo_url,
                    cover_url,
                    whatsapp,
                    email,
                    address,
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
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
                )
                `,
                [
                    businessId,
                    pageId,
                    cleanSlug,
                    name,
                    safe(description),
                    safe(logo_url),
                    safe(cover_url),
                    safe(whatsapp),
                    safe(email),
                    safe(address),
                    currency || "ARS",
                    status || "draft",
                    safe(seo_title),
                    safe(seo_description),
                    JSON.stringify(settings_json || {}),
                    JSON.stringify(styles_json || {})
                ]
            );

        const newStoreId =
            storeResult.insertId;

        // =====================================
        // INSTALAR TEMPLATE INICIAL
        // =====================================

        await installStoreTemplate(
            newStoreId,
            conn
        );
        await installStoreDemoContent(
            newStoreId,
            conn
        );

        // =====================================
        // CREATE DEFAULT CATEGORY
        // =====================================

        await conn.query(
            `
            INSERT INTO tags_store_categories (
                store_id,
                parent_id,
                name,
                slug,
                image_url,
                description,
                sort_order,
                is_visible,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                NULL,
                'General',
                'general',
                NULL,
                'Categoría general para productos iniciales.',
                1,
                1,
                NOW(),
                NOW()
            )
            `,
            [
                newStoreId
            ]
        );

        await conn.commit();

        return Response.json({
            ok: true,
            message: "Tienda creada correctamente",
            storeId: newStoreId,
            pageId
        });

    } catch (err) {
        await conn.rollback();

        console.error(
            "STORE ADMIN SAVE ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error guardando tienda"
            },
            {
                status: 500
            }
        );

    } finally {
        conn.release();
    }
}