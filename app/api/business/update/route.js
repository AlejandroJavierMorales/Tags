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
      email,
      phone,
      plan_id,
      start_date,
      duration_months
    } = body;

    if (!id || !name || !email || !plan_id) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    // ---------------------------------
    // 1. UPDATE BUSINESS BASIC DATA
    // ---------------------------------
    await conn.execute(
      `
      UPDATE tags_businesses
      SET
        name = ?,
        email = ?,
        phone = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        name.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || null,
        id
      ]
    );

    // ---------------------------------
    // 2. GET CURRENT ACTIVE SUBSCRIPTION
    // ---------------------------------
    const [currentSubRows] = await conn.execute(
      `
      SELECT *
      FROM tags_subscriptions
      WHERE business_id = ?
      AND status = 'active'
      ORDER BY id DESC
      LIMIT 1
      `,
      [id]
    );

    const currentSub = currentSubRows?.[0];

    // ---------------------------------
    // 3. CHECK IF PLAN OR DATES CHANGED
    // ---------------------------------
    const planChanged = !currentSub || Number(currentSub.plan_id) !== Number(plan_id);

    const startDateChanged =
      start_date &&
      currentSub &&
      new Date(start_date).getTime() !== new Date(currentSub.started_at).getTime();

    const duration = Number(duration_months || 1);

    const startedAt = start_date
      ? new Date(start_date)
      : new Date();

    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + duration);

    // ---------------------------------
    // 4. ONLY RECREATE SUBSCRIPTION IF NEEDED
    // ---------------------------------
    if (planChanged || startDateChanged) {

      // cerrar anterior
      await conn.execute(
        `
        UPDATE tags_subscriptions
        SET status = 'inactive',
            updated_at = NOW()
        WHERE business_id = ?
        AND status = 'active'
        `,
        [id]
      );

      // obtener plan snapshot
      const [planRows] = await conn.execute(
        `
        SELECT price, currency
        FROM tags_plans
        WHERE id = ?
        `,
        [plan_id]
      );

      const plan = planRows?.[0];

      if (!plan) throw new Error("Plan not found");

      // crear nueva
      await conn.execute(
        `
        INSERT INTO tags_subscriptions (
          business_id,
          plan_id,
          status,
          payment_provider,
          amount,
          currency,
          duration_months,
          started_at,
          expires_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, 'active', 'manual', ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [
          id,
          plan_id,
          plan.price,
          plan.currency,
          duration,
          startedAt,
          expiresAt
        ]
      );
    }

    await conn.commit();

    return Response.json({ ok: true });

  } catch (e) {

    await conn.rollback();

    console.error("UPDATE BUSINESS ERROR:", e);

    return Response.json(
      { error: "Error actualizando cliente" },
      { status: 500 }
    );

  } finally {
    conn.release();
  }
}