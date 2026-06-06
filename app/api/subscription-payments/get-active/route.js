// =====================================
// API: /api/subscription-payment/get-active
// Descripción: Lista suscripciones activas disponibles para registrar pagos.
// =====================================

import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {

    try {

        const [rows] = await db.query(
            `
            SELECT
                s.id,
                s.business_id,
                s.plan_id,
                s.amount,
                s.currency,
                s.expires_at,
                s.duration_months,

                b.name AS business_name,
                b.email AS business_email,

                p.name AS plan_name,
                p.code AS plan_code

            FROM tags_subscriptions s

            INNER JOIN tags_businesses b
                ON b.id = s.business_id

            INNER JOIN tags_plans p
                ON p.id = s.plan_id

            WHERE s.status = 'active'

            ORDER BY b.name ASC
            `
        );

        return Response.json({
            success: true,
            data: rows
        });

    } catch (err) {

        console.log("SUBSCRIPTION PAYMENT GET ACTIVE ERROR:", err);

        return Response.json(
            { error: "Error obteniendo suscripciones activas" },
            { status: 500 }
        );
    }
}