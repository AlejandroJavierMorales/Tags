// =====================================
// API: /api/store/admin/categories/save
// Descripción:
// Crea o actualiza una categoría.
// Compatible con Tags Store y Tags Resto.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

const VALID_APP_TYPES = [
    "store",
    "resto"
];

function createSlug(value) {

    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /(^-|-$)+/g,
            ""
        );

}

function safe(value) {

    return (
        value === undefined ||
        value === ""
    )
        ? null
        : value;

}

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {
            businessId,
            appType = "store",
            categoryId,
            parent_id,
            name,
            slug,
            image_url,
            description,
            sort_order,
            is_visible
        } = body;

        if (!businessId) {

            return Response.json(
                {
                    error:
                        "businessId es requerido"
                },
                {
                    status: 400
                }
            );

        }

        if (
            !VALID_APP_TYPES.includes(
                appType
            )
        ) {

            return Response.json(
                {
                    error:
                        "appType inválido"
                },
                {
                    status: 400
                }
            );

        }

        if (!name?.trim()) {

            return Response.json(
                {
                    error:
                        "El nombre de la categoría es requerido"
                },
                {
                    status: 400
                }
            );

        }

        const [storeRows] =
            await db.query(
                `
                SELECT
                    id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = ?
                LIMIT 1
                `,
                [
                    businessId,
                    appType
                ]
            );

        const store =
            storeRows[0];

        if (!store) {

            return Response.json(
                {
                    error:
                        appType === "resto"
                            ? "Tags Resto no encontrado"
                            : "Tienda no encontrada"
                },
                {
                    status: 404
                }
            );

        }

        const cleanSlug =
            createSlug(
                slug ||
                name
            );

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

        const [slugRows] =
            await db.query(
                `
                SELECT
                    id
                FROM tags_store_categories
                WHERE store_id = ?
                AND slug = ?
                AND id <> ?
                LIMIT 1
                `,
                [
                    store.id,
                    cleanSlug,
                    categoryId || 0
                ]
            );

        if (slugRows.length) {

            return Response.json(
                {
                    error:
                        "Ya existe una categoría con esa URL"
                },
                {
                    status: 409
                }
            );

        }

        if (parent_id) {

            const [parentRows] =
                await db.query(
                    `
                    SELECT
                        id
                    FROM tags_store_categories
                    WHERE id = ?
                    AND store_id = ?
                    LIMIT 1
                    `,
                    [
                        parent_id,
                        store.id
                    ]
                );

            if (!parentRows.length) {

                return Response.json(
                    {
                        error:
                            "La categoría principal no pertenece a esta aplicación"
                    },
                    {
                        status: 400
                    }
                );

            }

        }

        if (categoryId) {

            const [categoryRows] =
                await db.query(
                    `
                    SELECT
                        id
                    FROM tags_store_categories
                    WHERE id = ?
                    AND store_id = ?
                    LIMIT 1
                    `,
                    [
                        categoryId,
                        store.id
                    ]
                );

            if (!categoryRows.length) {

                return Response.json(
                    {
                        error:
                            "Categoría no encontrada"
                    },
                    {
                        status: 404
                    }
                );

            }

            if (
                String(parent_id || "") ===
                String(categoryId)
            ) {

                return Response.json(
                    {
                        error:
                            "Una categoría no puede ser su propia categoría principal"
                    },
                    {
                        status: 400
                    }
                );

            }

            await db.query(
                `
                UPDATE tags_store_categories
                SET
                    parent_id = ?,
                    name = ?,
                    slug = ?,
                    image_url = ?,
                    description = ?,
                    sort_order = ?,
                    is_visible = ?,
                    updated_at = NOW()
                WHERE id = ?
                AND store_id = ?
                `,
                [
                    safe(parent_id),
                    name.trim(),
                    cleanSlug,
                    safe(image_url),
                    safe(description),
                    Number(
                        sort_order || 0
                    ),
                    Number(is_visible) === 0
                        ? 0
                        : 1,
                    categoryId,
                    store.id
                ]
            );

            return Response.json({
                ok: true,
                message:
                    "Categoría actualizada correctamente",
                categoryId
            });

        }

        const [result] =
            await db.query(
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
                    store.id,
                    safe(parent_id),
                    name.trim(),
                    cleanSlug,
                    safe(image_url),
                    safe(description),
                    Number(
                        sort_order || 0
                    ),
                    Number(is_visible) === 0
                        ? 0
                        : 1
                ]
            );

        return Response.json({
            ok: true,
            message:
                "Categoría creada correctamente",
            categoryId:
                result.insertId
        });

    } catch (err) {

        console.error(
            "STORE CATEGORY SAVE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error guardando categoría"
            },
            {
                status: 500
            }
        );

    }

}