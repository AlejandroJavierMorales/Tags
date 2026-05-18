import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET() {

    try {

        const [rows] =
            await db.query(`

                SELECT

                    s.id,

                    s.business_id,

                    s.plan_id,

                    s.amount,

                    s.expires_at,

                    b.name AS business_name,

                    p.name AS plan_name

                FROM tags_subscriptions s

                INNER JOIN businesses b
                    ON b.id = s.business_id

                INNER JOIN tags_plans p
                    ON p.id = s.plan_id

                WHERE s.status = 'active'

                ORDER BY b.name ASC
            `);

        return Response.json({
            success: true,
            data: rows
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error: "Error"
            },
            {
                status: 500
            }
        );
    }
}