import { db } from "@/app/lib/tags-db";

export async function POST(req) {

  const conn = await db.getConnection();

  try {

    const body = await req.json();

    const {
      name,
      email,
      phone,
      plan_id
    } = body;

    // -----------------------------
    // VALIDACIÓN MÍNIMA BACKEND
    // -----------------------------
    if (!name || !email || !plan_id) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    // -----------------------------
    // 1. CREAR BUSINESS
    // -----------------------------
    const [bizResult] = await conn.execute(
      `
            INSERT INTO tags_businesses
            (
                name,
                email,
                phone,
                plan_id,
                subscription_status,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, 'active', NOW(), NOW())
            `,
      [
        name.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || null,
        plan_id
      ]
    );

    const businessId = bizResult.insertId;

    // -----------------------------
    // 2. OBTENER PLAN (snapshot billing)
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
    // 3. CREAR SUBSCRIPTION ACTIVA
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
                created_at,
                updated_at
            )
            VALUES (?, ?, 'active', 'manual', ?, ?, NOW(), NOW(), NOW())
            `,
      [
        businessId,
        plan_id,
        plan.price,
        plan.currency
      ]
    );

    // -----------------------------
    // 4. COMMIT FINAL
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
      {
        error: "Error creando cliente"
      },
      {
        status: 500
      }
    );

  } finally {

    conn.release();

  }
}