import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function createSubscription({
    business_id,
    plan,
    start_date,
    duration_months,
    amount,
    currency,
    payment_provider = "manual"
}) {
    const startedAt = start_date ? new Date(start_date) : new Date();

    const duration = duration_months ?? 1;

    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + Number(duration));

    // cerrar suscripción activa anterior
    await db.execute(
        `
    UPDATE tags_subscriptions
    SET status = 'inactive', updated_at = NOW()
    WHERE business_id = ? AND status = 'active'
    `,
        [business_id]
    );

    // crear nueva
    await db.execute(
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
    VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
        [
            business_id,
            plan.id,
            payment_provider,
            amount,
            currency,
            duration,
            startedAt,
            expiresAt
        ]
    );
}