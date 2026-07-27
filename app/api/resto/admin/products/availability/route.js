export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";
import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";
import {
    logRestoAudit
} from "@/app/modules/resto/lib/staff/restoAudit";
import {
    getRestoProductAvailability
} from "@/app/modules/resto/lib/products/restoProductAvailability";

export async function POST(req) {

    const connection =
        await db.getConnection();

    let transactionStarted =
        false;

    try {
        const body =
            await req.json();

        const businessId =
            Number(body?.businessId);
        const productId =
            Number(body?.productId);
        const isAvailable =
            body?.isAvailable === true;

        if (
            !Number.isInteger(businessId) ||
            businessId <= 0 ||
            !Number.isInteger(productId) ||
            productId <= 0
        ) {
            return Response.json(
                {
                    error:
                        "businessId y productId son requeridos"
                },
                {
                    status:
                        400
                }
            );
        }

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

        await connection.beginTransaction();
        transactionStarted =
            true;

        const [productRows] =
            await connection.query(
                `
                SELECT
                    p.id,
                    p.title,
                    p.settings_json,
                    s.id AS store_id
                FROM tags_store_products p
                INNER JOIN tags_stores s
                    ON s.id = p.store_id
                WHERE p.id = ?
                AND s.business_id = ?
                AND s.app_type = 'resto'
                LIMIT 1
                FOR UPDATE
                `,
                [
                    productId,
                    businessId
                ]
            );

        const product =
            productRows[0];

        if (!product) {
            await connection.rollback();
            transactionStarted =
                false;

            return Response.json(
                {
                    error:
                        "Producto no encontrado"
                },
                {
                    status:
                        404
                }
            );
        }

        const {
            settings
        } =
            getRestoProductAvailability(
                product
            );

        const nextSettings = {
            ...settings,
            resto_available:
                isAvailable
        };

        await connection.query(
            `
            UPDATE tags_store_products
            SET
                settings_json = ?,
                updated_at = NOW()
            WHERE id = ?
            AND store_id = ?
            LIMIT 1
            `,
            [
                JSON.stringify(
                    nextSettings
                ),
                product.id,
                product.store_id
            ]
        );

        await logRestoAudit(
            connection,
            {
                storeId:
                    product.store_id,
                access,
                actionCode:
                    isAvailable
                        ? "product.available"
                        : "product.sold_out",
                entityType:
                    "product",
                entityId:
                    product.id,
                description:
                    product.title,
                metadata: {
                    is_available:
                        isAvailable
                },
                req
            }
        );

        await connection.commit();
        transactionStarted =
            false;

        return Response.json({
            ok:
                true,
            productId:
                product.id,
            is_available:
                isAvailable
        });

    } catch (err) {
        if (transactionStarted) {
            try {
                await connection.rollback();
            } catch {
                // Se conserva el error original.
            }
        }

        console.error(
            "RESTO PRODUCT AVAILABILITY ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "No se pudo actualizar la disponibilidad"
            },
            {
                status:
                    500
            }
        );
    } finally {
        connection.release();
    }

}
