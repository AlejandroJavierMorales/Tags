// =====================================
// API: /api/subscriptions/get
// Descripción: Lista suscripciones con filtros por cliente, plan, estado y fecha de vencimiento.
// =====================================

import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {

    try {

        const { searchParams } = new URL(req.url);

        const business_id = searchParams.get("business_id");
        const plan_id = searchParams.get("plan_id");
        const status = searchParams.get("status");
        const expire_before = searchParams.get("expire_before");

        let sql = `
            SELECT
                s.*,
                b.name AS business_name,
                b.email AS business_email,
                p.name AS plan_name,
                p.code AS plan_code
            FROM tags_subscriptions s
            INNER JOIN tags_businesses b
                ON b.id = s.business_id
            INNER JOIN tags_plans p
                ON p.id = s.plan_id
            WHERE 1 = 1
        `;

        const values = [];

        if (business_id) {
            sql += `
                AND s.business_id = ?
            `;
            values.push(business_id);
        }

        if (plan_id) {
            sql += `
                AND s.plan_id = ?
            `;
            values.push(plan_id);
        }

        if (status) {
            sql += `
                AND s.status = ?
            `;
            values.push(status);
        }

        if (expire_before) {
            sql += `
                AND s.expires_at IS NOT NULL
                AND s.expires_at <= CONCAT(?, ' 23:59:59')
            `;
            values.push(expire_before);
        }

        sql += `
            ORDER BY
                CASE WHEN s.status = 'active' THEN 0 ELSE 1 END,
                s.expires_at ASC,
                s.id DESC
        `;

        const [rows] = await db.query(sql, values);

        return Response.json({
            success: true,
            data: rows
        });

    } catch (err) {

        console.log("SUBSCRIPTIONS GET ERROR:", err);

        return Response.json(
            { error: "Error obteniendo suscripciones" },
            { status: 500 }
        );
    }
}