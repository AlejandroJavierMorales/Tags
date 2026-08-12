// =====================================
// API: /api/store/admin/products/delete
// Descripción:
// Elimina un producto y sus imágenes almacenadas.
// Compatible con Tags Store y Tags Resto.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";

import {
    deleteFile
} from "@/app/modules/files/lib/deleteFile";

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

    let transactionStarted =
        false;

    try {

        const body =
            await req.json();

        const {
            businessId,
            appType = "store",
            productId
        } = body;

        if (
            !businessId ||
            !productId
        ) {

            return Response.json(
                {
                    error:
                        "businessId y productId son requeridos"
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
                        "products.manage"
                });

            if (!access.allowed) {
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

        const [productRows] =
            await conn.query(
                `
                SELECT
                    id
                FROM tags_store_products
                WHERE id = ?
                AND store_id = ?
                LIMIT 1
                `,
                [
                    productId,
                    store.id
                ]
            );

        if (!productRows.length) {

            return Response.json(
                {
                    error:
                        "Producto no encontrado"
                },
                {
                    status: 404
                }
            );

        }

        /*
         * Conservamos las rutas antes de borrar
         * los registros de la base de datos.
         */
        const [imageRows] =
            await conn.query(
                `
                SELECT
                    storage_path
                FROM tags_store_product_images
                WHERE product_id = ?
                `,
                [
                    productId
                ]
            );

        await conn.beginTransaction();

        transactionStarted =
            true;

        await conn.query(
            `
            DELETE
            FROM tags_store_product_images
            WHERE product_id = ?
            `,
            [
                productId
            ]
        );

        await conn.query(
            `
            DELETE
            FROM tags_store_products
            WHERE id = ?
            AND store_id = ?
            `,
            [
                productId,
                store.id
            ]
        );

        await conn.commit();

        transactionStarted =
            false;

        /*
         * La eliminación del producto en base de datos
         * ya fue confirmada. Limpiamos los archivos del
         * bucket sin mantener abierta la transacción SQL.
         */
        const storagePaths =
            [
                ...new Set(
                    imageRows
                        .map(image =>
                            image.storage_path
                        )
                        .filter(Boolean)
                )
            ];

        const failedStoragePaths =
            [];

        for (
            const storagePath
            of storagePaths
        ) {

            const deleted =
                await deleteFile(
                    storagePath
                );

            if (!deleted) {

                failedStoragePaths.push(
                    storagePath
                );

            }

        }

        if (failedStoragePaths.length) {

            console.error(
                "STORE PRODUCT FILE CLEANUP ERROR:",
                {
                    productId,
                    failedStoragePaths
                }
            );

        }

        return Response.json({
            ok: true,
            appType,
            message:
                failedStoragePaths.length
                    ? "Producto eliminado. Algunas imágenes no pudieron eliminarse del almacenamiento."
                    : "Producto eliminado correctamente",
            storage_cleanup: {
                total:
                    storagePaths.length,
                deleted:
                    storagePaths.length -
                    failedStoragePaths.length,
                failed:
                    failedStoragePaths.length
            }
        });

    } catch (err) {

        if (transactionStarted) {

            await conn.rollback();

        }

        console.error(
            "STORE PRODUCT DELETE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error eliminando producto"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();

    }

}