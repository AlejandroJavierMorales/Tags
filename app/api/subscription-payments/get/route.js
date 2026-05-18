import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET() {

    try {

        const [rows] =
            await db.query(`

                SELECT

                    p.*,

                    b.name AS business_name,

                    pl.name AS plan_name

                FROM tags_subscription_payments p

                INNER JOIN businesses b
                    ON b.id = p.business_id

                INNER JOIN tags_plans pl
                    ON pl.id = p.plan_id

                ORDER BY p.id DESC
            `);

        return Response.json({
            success: true,
            data: rows
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error: "Error obteniendo pagos"
            },
            {
                status: 500
            }
        );
    }
}