// =====================================
// API: /api/subscription-payment/create
// Descripción: Registra un pago aprobado de una suscripción, extiende el vencimiento y sincroniza el estado del cliente.
// =====================================

import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    const conn = await db.getConnection();

    try {

        const body = await req.json();

        const {
            subscription_id,
            amount,
            provider = "manual",
            notes = null
        } = body;

        if (!subscription_id) {
            return Response.json(
                { error: "Falta suscripción" },
                { status: 400 }
            );
        }

        const [subscriptionRows] = await conn.query(
            `
            SELECT *
            FROM tags_subscriptions
            WHERE id = ?
            LIMIT 1
            `,
            [subscription_id]
        );

        const subscription = subscriptionRows[0];

        if (!subscription) {
            return Response.json(
                { error: "Suscripción inexistente" },
                { status: 404 }
            );
        }

        const periodStart =
            subscription.expires_at
                ? new Date(subscription.expires_at)
                : new Date();

        const periodEnd =
            new Date(periodStart);

        periodEnd.setMonth(
            periodEnd.getMonth() +
            Number(subscription.duration_months || 1)
        );

        await conn.beginTransaction();

        await conn.query(
            `
            INSERT INTO tags_subscription_payments (
                subscription_id,
                business_id,
                plan_id,
                amount,
                currency,
                provider,
                status,
                paid_at,
                period_start,
                period_end,
                notes,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'approved', NOW(), ?, ?, ?, NOW())
            `,
            [
                subscription.id,
                subscription.business_id,
                subscription.plan_id,
                amount ?? subscription.amount ?? 0,
                subscription.currency || "ARS",
                provider,
                periodStart,
                periodEnd,
                notes
            ]
        );

        await conn.query(
            `
            UPDATE tags_subscriptions
            SET
                expires_at = ?,
                next_billing_at = ?,
                status = 'active',
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                periodEnd,
                periodEnd,
                subscription.id
            ]
        );

        await conn.query(
            `
            UPDATE tags_businesses
            SET
                subscription_status = 'active',
                plan_expires_at = ?,
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                periodEnd,
                subscription.business_id
            ]
        );

        await conn.commit();

        return Response.json({
            success: true
        });

    } catch (err) {

        await conn.rollback();

        console.log("SUBSCRIPTION PAYMENT CREATE ERROR:", err);

        return Response.json(
            { error: "Error registrando pago" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}