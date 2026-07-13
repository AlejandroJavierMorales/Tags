// =====================================
// API: /api/commerce-reviews/admin/list
// Descripción:
// Lista las reseñas de productos para el
// panel administrativo.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const businessId =
            Number(
                searchParams.get("businessId")
            );

        if (!businessId) {

            return Response.json(
                {
                    error:
                        "businessId requerido"
                },
                {
                    status: 400
                }
            );

        }

        const [rows] =
            await db.query(
                `
                SELECT

                    r.id,

                    r.business_id,

                    r.source_type,
                    r.source_id,
                    r.source_item_id,

                    r.item_type,
                    r.item_id,

                    r.customer_name,
                    r.customer_email,

                    r.rating,
                    r.title,
                    r.comment,

                    r.status,

                    r.is_public,
                    r.is_verified,

                    r.created_at,

                    p.title
                        AS product_title,

                    v.title
                        AS variant_title,

                    o.order_number

                FROM
                    tags_commerce_item_reviews r

                LEFT JOIN tags_store_products p
                    ON p.id = r.item_id

                LEFT JOIN tags_store_order_items oi
                    ON oi.id = r.source_item_id

                LEFT JOIN tags_store_product_variants v
                    ON v.id = oi.variant_id

                LEFT JOIN tags_store_orders o
                    ON o.id = r.source_id

                WHERE
                    r.business_id = ?

                ORDER BY
                    r.created_at DESC
                `,
                [
                    businessId
                ]
            );

        return Response.json({

            ok: true,

            data:
                rows

        });

    } catch (err) {

        console.error(
            "COMMERCE REVIEWS ADMIN LIST ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error cargando reseñas"
            },
            {
                status: 500
            }
        );

    }

}