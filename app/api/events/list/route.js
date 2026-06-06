export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db } from "@/app/lib/tags-db";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const search =
            searchParams.get("search");

        const status =
            searchParams.get("status");

        let sql = `
            SELECT *
            FROM tags_events
            WHERE 1=1
        `;

        const params = [];

        if (search) {

            sql += `
                AND name LIKE ?
            `;

            params.push(`%${search}%`);
        }

        if (status) {

            sql += `
                AND status = ?
            `;

            params.push(status);
        }

        sql += `
            ORDER BY id DESC
        `;

        const [rows] =
            await db.query(sql, params);

        return Response.json({
            ok: true,
            data: rows
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error: "Error interno"
            },
            {
                status: 500
            }
        );
    }
}