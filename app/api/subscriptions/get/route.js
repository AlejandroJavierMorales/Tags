import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const business_id =
            searchParams.get(
                "business_id"
            );

        const plan_id =
            searchParams.get(
                "plan_id"
            );

        const status =
            searchParams.get(
                "status"
            );

        const expire_before =
            searchParams.get(
                "expire_before"
            );

        let sql = `
            SELECT

                s.*,

                b.name AS business_name,

                p.name AS plan_name

            FROM tags_subscriptions s

            INNER JOIN tags_businesses b
                ON b.id = s.business_id

            INNER JOIN tags_plans p
                ON p.id = s.plan_id

            WHERE 1=1
        `;

        const values = [];

        // BUSINESS

        if (business_id) {

            sql += `
                AND s.business_id = ?
            `;

            values.push(
                business_id
            );
        }

        // PLAN

        if (plan_id) {

            sql += `
                AND s.plan_id = ?
            `;

            values.push(
                plan_id
            );
        }

        // STATUS

        if (status) {

            sql += `
                AND s.status = ?
            `;

            values.push(
                status
            );
        }

        // EXPIRE BEFORE

        if (expire_before) {

            sql += `
                AND s.expires_at <= CONCAT(?, ' 23:59:59')
            `;

            values.push(
                expire_before
            );
        }

        sql += `
            ORDER BY s.expires_at ASC
        `;

        const [rows] =
            await db.query(
                sql,
                values
            );

        return Response.json({
            success: true,
            data: rows
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    "Error obteniendo suscripciones"
            },
            {
                status: 500
            }
        );
    }
}