import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const business =
            searchParams.get("business");

        const status =
            searchParams.get("status");

        let where = `WHERE 1=1`;

        const params = [];

        if (business) {

            where += `
                AND b.name LIKE ?
            `;

            params.push(
                `%${business}%`
            );
        }

        if (status) {

            where += `
                AND s.status = ?
            `;

            params.push(status);
        }

        const [rows] =
            await db.execute(
                `
                SELECT
                    s.id,
                    s.business_id,
                    s.status,
                    s.notes,
                    s.created_at,

                    b.name AS business_name,

                    COUNT(si.id)
                        AS items_count,

                    COALESCE(
                        SUM(si.quantity),
                        0
                    ) AS total_quantity,

                    COALESCE(
                        SUM(
                            si.delivered_quantity
                        ),
                        0
                    ) AS delivered_quantity,

                    COALESCE(
                        SUM(
                            si.quantity -
                            si.delivered_quantity
                        ),
                        0
                    ) AS pending_quantity

                FROM tags_sales s

                LEFT JOIN tags_businesses b
                    ON b.id = s.business_id

                LEFT JOIN tags_sale_items si
                    ON si.sale_id = s.id

                ${where}

                GROUP BY s.id

                ORDER BY s.id DESC
                `,
                params
            );

        return Response.json({
            ok: true,
            data: rows
        });

    } catch (err) {

        console.error(
            "GET SALES ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error obteniendo ventas",
                data: []
            },
            {
                status: 500
            }
        );
    }
}