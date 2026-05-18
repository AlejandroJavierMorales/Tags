import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {

    try {

        const [rows] =
            await db.execute(
                `
                SELECT
                    p.id,
                    p.name,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN q.status = 'available'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS available,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN q.status = 'assigned'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS assigned,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN q.status = 'generated'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS generated_count

                FROM tags_products p

                LEFT JOIN tags_qr_codes q
                    ON q.product_id = p.id

                GROUP BY p.id

                ORDER BY p.name ASC
                `
            );

        return Response.json({
            ok: true,
            data: rows
        });

    } catch (err) {

        console.error(
            "PRODUCT STOCK ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error obteniendo stock",
                data: []
            },
            {
                status: 500
            }
        );
    }
}