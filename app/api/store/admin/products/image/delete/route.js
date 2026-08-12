// =====================================
// API: /api/store/admin/products/image/delete
// Descripción:
// Elimina una imagen de un producto.
// Compatible con Tags Store y Tags Resto.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { deleteFile }
    from "@/app/modules/files/lib/deleteFile";

import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

const VALID_APP_TYPES = [
    "store",
    "resto"
];

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const body =
            await req.json();

        const {
            businessId,
            appType = "store",
            imageId
        } = body;

        if (
            !businessId ||
            !imageId
        ) {

            return Response.json(
                {
                    error:
                        "businessId e imageId son requeridos"
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

        if (
            appType === "resto"
        ) {

            const access =
                await getRestoAccess({
                    businessId,
                    permission:
                        "products.manage"
                });

            if (
                !access.allowed
            ) {

                return restoAccessResponse(
                    access
                );

            }

        }

        const [storeRows] =
            await conn.query(
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

        const [imageRows] =
            await conn.query(
                `
                SELECT
                    i.*,
                    p.store_id
                FROM tags_store_product_images i
                INNER JOIN tags_store_products p
                    ON p.id = i.product_id
                WHERE i.id = ?
                LIMIT 1
                `,
                [
                    imageId
                ]
            );

        const image =
            imageRows[0];

        if (!image) {

            return Response.json(
                {
                    error:
                        "Imagen no encontrada"
                },
                {
                    status: 404
                }
            );

        }

        if (
            Number(image.store_id) !==
            Number(store.id)
        ) {

            return Response.json(
                {
                    error:
                        "La imagen no pertenece a esta tienda"
                },
                {
                    status: 403
                }
            );

        }

        if (
            image.storage_path
        ) {

            try {

                await deleteFile(
                    image.storage_path
                );

            } catch (err) {

                console.error(
                    "STORE PRODUCT IMAGE DELETE FILE ERROR:",
                    err
                );

            }

        }

        await conn.query(
            `
            DELETE
            FROM tags_store_product_images
            WHERE id = ?
            `,
            [
                image.id
            ]
        );

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.error(
            "STORE PRODUCT IMAGE DELETE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error eliminando imagen"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();

    }

}