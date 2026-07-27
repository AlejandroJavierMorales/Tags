// =====================================
// API: /api/store/admin/categories/delete
// Descripción:
// Elimina una categoría.
// Compatible con Tags Store y Tags Resto.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";
import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

const VALID_APP_TYPES = [
    "store",
    "resto"
];

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {
            businessId,
            appType = "store",
            categoryId
        } = body;

        if (
            !businessId ||
            !categoryId
        ) {

            return Response.json(
                {
                    error:
                        "businessId y categoryId son requeridos"
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

        if (appType === "resto") {
            const access =
                await getRestoAccess({
                    businessId,
                    permission:
                        "categories.manage"
                });

            if (!access.allowed) {
                return restoAccessResponse(access);
            }
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

        const [[childrenCount]] =
            await db.query(
                `
                SELECT
                    COUNT(*) AS total
                FROM tags_store_categories
                WHERE parent_id = ?
                AND store_id = ?
                `,
                [
                    categoryId,
                    store.id
                ]
            );

        if (
            Number(
                childrenCount.total || 0
            ) > 0
        ) {

            return Response.json(
                {
                    error:
                        "No se puede eliminar una categoría con subcategorías"
                },
                {
                    status: 409
                }
            );

        }

        const [[productsCount]] =
            await db.query(
                `
                SELECT
                    COUNT(*) AS total
                FROM tags_store_products
                WHERE category_id = ?
                AND store_id = ?
                `,
                [
                    categoryId,
                    store.id
                ]
            );

        if (
            Number(
                productsCount.total || 0
            ) > 0
        ) {

            return Response.json(
                {
                    error:
                        "No se puede eliminar una categoría con productos asignados"
                },
                {
                    status: 409
                }
            );

        }

        await db.query(
            `
            DELETE
            FROM tags_store_categories
            WHERE id = ?
            AND store_id = ?
            `,
            [
                categoryId,
                store.id
            ]
        );

        return Response.json({
            ok: true,
            message:
                "Categoría eliminada correctamente"
        });

    } catch (err) {

        console.error(
            "STORE CATEGORY DELETE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error eliminando categoría"
            },
            {
                status: 500
            }
        );

    }

}
