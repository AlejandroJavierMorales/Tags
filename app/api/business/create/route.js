import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {

  const conn = await db.getConnection();

  try {

    const body = await req.json();

    const {
      name,
      email,
      phone,
      plan_id,
      start_date,        // opcional
      duration_months    // opcional (default 1)
    } = body;

    // -----------------------------
    // VALIDACIÓN
    // -----------------------------
    if (!name || !email || !plan_id) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    // -----------------------------
    // 1. CREATE BUSINESS
    // -----------------------------
    const [bizResult] = await conn.execute(
      `
      INSERT INTO tags_businesses
      (
        name,
        email,
        phone,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, NOW(), NOW())
      `,
      [
        name.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || null
      ]
    );

    const businessId = bizResult.insertId;

    // -----------------------------
    // 2. GET PLAN SNAPSHOT
    // -----------------------------
    const [planRows] = await conn.execute(
      `
      SELECT price, currency
      FROM tags_plans
      WHERE id = ?
      `,
      [plan_id]
    );

    const plan = planRows?.[0];

    if (!plan) {
      throw new Error("Plan not found");
    }

    // -----------------------------
    // 3. FECHAS DE SUSCRIPCIÓN
    // -----------------------------
    const startedAt = start_date
      ? new Date(start_date)
      : new Date();

    const months = duration_months ? Number(duration_months) : 1;

    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    // -----------------------------
    // 4. CREAR SUBSCRIPCIÓN
    // -----------------------------
    await conn.execute(
      `
      INSERT INTO tags_subscriptions
      (
        business_id,
        plan_id,
        status,
        payment_provider,
        amount,
        currency,
        started_at,
        expires_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, 'active', 'manual', ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        businessId,
        plan_id,
        plan.price,
        plan.currency,
        startedAt,
        expiresAt
      ]
    );

    // -----------------------------
    // 5. COMMIT
    // -----------------------------
    await conn.commit();

    return Response.json({
      ok: true,
      business_id: businessId
    });

  } catch (e) {

    await conn.rollback();

    console.error("CREATE BUSINESS ERROR:", e);

    return Response.json(
      { error: "Error creando cliente" },
      { status: 500 }
    );

  } finally {
    conn.release();
  }
}