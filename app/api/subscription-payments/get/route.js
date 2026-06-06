// =====================================
// API: /api/subscription-payment/get
// Descripción: Lista pagos de suscripciones con información de cliente y plan.
// =====================================

import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {

    try {

        const { searchParams } = new URL(req.url);

        const business_id = searchParams.get("business_id");
        const subscription_id = searchParams.get("subscription_id");
        const status = searchParams.get("status");

        let sql = `
            SELECT
                pay.*,
                b.name AS business_name,
                b.email AS business_email,
                pl.name AS plan_name,
                pl.code AS plan_code
            FROM tags_subscription_payments pay
            INNER JOIN tags_businesses b
                ON b.id = pay.business_id
            INNER JOIN tags_plans pl
                ON pl.id = pay.plan_id
            WHERE 1 = 1
        `;

        const values = [];

        if (business_id) {
            sql += `
                AND pay.business_id = ?
            `;
            values.push(business_id);
        }

        if (subscription_id) {
            sql += `
                AND pay.subscription_id = ?
            `;
            values.push(subscription_id);
        }

        if (status) {
            sql += `
                AND pay.status = ?
            `;
            values.push(status);
        }

        sql += `
            ORDER BY pay.id DESC
        `;

        const [rows] = await db.query(
            sql,
            values
        );

        return Response.json({
            success: true,
            data: rows
        });

    } catch (err) {

        console.log("SUBSCRIPTION PAYMENTS GET ERROR:", err);

        return Response.json(
            { error: "Error obteniendo pagos" },
            { status: 500 }
        );
    }
}