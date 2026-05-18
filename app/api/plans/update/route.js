import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {

    const conn = await db.getConnection();

    try {

        const body = await req.json();

        const {
            id,
            name,
            code,
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
            priority_support
        } = body;

        if (!id || !name || !code || price == null) {
            return Response.json(
                { error: "Faltan datos obligatorios" },
                { status: 400 }
            );
        }

        await conn.execute(
            `
      UPDATE tags_plans
      SET
        name = ?,
        code = ?,
        description = ?,
        price = ?,
        currency = ?,
        max_qr_codes = ?,

        dashboard_enabled = ?,
        reports_enabled = ?,
        reports_email_enabled = ?,
        reports_whatsapp_enabled = ?,
        analytics_enabled = ?,
        analytics_plus_enabled = ?,
        allow_pause_qr = ?,
        allow_edit_qr = ?,
        priority_support = ?,

        updated_at = NOW()
      WHERE id = ?
      `,
            [
                name.trim(),
                code.trim().toLowerCase(),
                description || null,
                Number(price),
                currency || "ARS",
                Number(max_qr_codes || 0),

                dashboard_enabled ? 1 : 0,
                reports_enabled ? 1 : 0,
                reports_email_enabled ? 1 : 0,
                reports_whatsapp_enabled ? 1 : 0,
                analytics_enabled ? 1 : 0,
                analytics_plus_enabled ? 1 : 0,
                allow_pause_qr ? 1 : 0,
                allow_edit_qr ? 1 : 0,
                priority_support ? 1 : 0,

                id
            ]
        );

        conn.release();

        return Response.json({ ok: true });

    } catch (e) {

        console.error("PLAN UPDATE ERROR:", e);

        return Response.json(
            { error: "Error actualizando plan" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}