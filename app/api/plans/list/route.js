import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {

    try {

        const [rows] = await db.execute(`
            SELECT
                id,
                code,
                name,
                description,
                price,
                currency,
                max_qr_codes,

                dashboard_enabled,
                reports_enabled,
                reports_email_enabled,
                reports_whatsapp_enabled,
                analytics_enabled,
                analytics_plus_enabled,
                allow_pause_qr,
                allow_edit_qr,
                priority_support,
                

                is_active,
                is_public,
                is_free,
                sort_order

            FROM tags_plans
            ORDER BY sort_order ASC, price ASC
        `);

        return Response.json(rows);

    } catch (e) {

        console.error("PLANS LIST ERROR:", e);

        return Response.json(
            { error: "Internal error" },
            { status: 500 }
        );
    }
}