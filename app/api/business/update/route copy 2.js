import { db } from "@/app/lib/tags-db";

export async function POST(req) {

  const conn = await db.getConnection();

  try {

    const body = await req.json();

    const {
      id,
      name,
      email,
      phone,
      plan_id
    } = body;

    console.log("Datos de Cliente en Route:", body);

    if (!id || !name || !email || !plan_id) {
      return Response.json(
        { error: "Faltan datos obligatorios" },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    // -----------------------------------
    // 1. BUSCAR ESTADO ACTUAL
    // -----------------------------------
    const [businessRows] = await conn.execute(
      `
            SELECT plan_id, email
            FROM tags_businesses
            WHERE id = ?
            `,
      [id]
    );

    const business = businessRows?.[0];

    if (!business) {
      throw new Error("Business not found");
    }

    const planChanged = Number(business.plan_id) !== Number(plan_id);
    const emailChanged = business.email !== email;

    // -----------------------------------
    // 2. UPDATE BASE BUSINESS
    // -----------------------------------
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

    // -----------------------------------
    // 3. SI CAMBIA PLAN → FLUJO SaaS
    // -----------------------------------
    if (planChanged) {

      // 3.1 cerrar subscription activa
      await conn.execute(
        `
                UPDATE tags_subscriptions
                SET
                    status = 'inactive',
                    cancelled_at = NOW(),
                    updated_at = NOW()
                WHERE business_id = ?
                AND status = 'active'
                `,
        [id]
      );

      // 3.2 obtener nuevo plan
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

      // 3.3 crear nueva subscription
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
          id,
          plan_id,
          plan.price,
          plan.currency
        ]
      );

      // 3.4 actualizar cache business
      await conn.execute(
        `
                UPDATE tags_businesses
                SET plan_id = ?, subscription_status = 'active'
                WHERE id = ?
                `,
        [
          plan_id,
          id
        ]
      );
    }

    // -----------------------------------
    // 4. COMMIT FINAL
    // -----------------------------------
    await conn.commit();

    return Response.json({
      ok: true,
      plan_changed: planChanged,
      email_changed: emailChanged
    });

  } catch (error) {

    await conn.rollback();

    console.error("UPDATE BUSINESS ERROR:", error);

    return Response.json(
      { error: "Error actualizando cliente" },
      { status: 500 }
    );

  } finally {

    conn.release();
  }
}