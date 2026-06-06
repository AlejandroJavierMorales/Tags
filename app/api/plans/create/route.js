// =====================================
// API: /api/plans/create
// Descripción: Crea un nuevo plan comercial de Tags.
// =====================================

import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

  const conn = await db.getConnection();

  try {

    const body = await req.json();

    const {
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
      priority_support,

      is_active,
      is_public,
      is_free,
      sort_order
    } = body;

    if (!name || !code || price == null) {
      return Response.json(
        { error: "Faltan datos obligatorios" },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toLowerCase();

    const [existing] = await conn.execute(
      `
      SELECT id
      FROM tags_plans
      WHERE code = ?
      LIMIT 1
      `,
      [cleanCode]
    );

    if (existing.length) {
      return Response.json(
        { error: "Ya existe un plan con ese código" },
        { status: 409 }
      );
    }

    await conn.execute(
      `
      INSERT INTO tags_plans (
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
        priority_support,
        is_active,
        is_public,
        is_free,
        sort_order,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        name.trim(),
        cleanCode,
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
        is_active ? 1 : 0,
        is_public ? 1 : 0,
        is_free ? 1 : 0,
        Number(sort_order || 0)
      ]
    );

    return Response.json({ ok: true });

  } catch (e) {

    console.error("PLAN CREATE ERROR:", e);

    return Response.json(
      { error: "Error creando plan" },
      { status: 500 }
    );

  } finally {
    conn.release();
  }
}