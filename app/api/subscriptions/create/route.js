// =====================================
// API: /api/subscriptions/create
// Descripción: Crea una suscripción para un cliente, desactiva suscripciones activas previas y sincroniza el estado del cliente.
// =====================================

import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    const conn = await db.getConnection();

    try {

        const body = await req.json();

        const {
            business_id,
            plan_id,
            status = "active",
            payment_provider = "manual",
            duration_months = 1,
            amount,
            currency,
            auto_renew = 0,
            auto_disable_on_expire = 1,
            grace_days = 0,
            admin_override_until = null,
            admin_override_notes = null
        } = body;

        if (!business_id) {
            return Response.json(
                { error: "Falta cliente" },
                { status: 400 }
            );
        }

        if (!plan_id) {
            return Response.json(
                { error: "Falta plan" },
                { status: 400 }
            );
        }

        const [planRows] = await conn.query(
            `
            SELECT *
            FROM tags_plans
            WHERE id = ?
            LIMIT 1
            `,
            [plan_id]
        );

        const plan = planRows[0];

        if (!plan) {
            return Response.json(
                { error: "Plan inexistente" },
                { status: 404 }
            );
        }

        const startedAt = new Date();

        const isFree =
            Number(plan.is_free) === 1 ||
            Number(plan.price || 0) === 0;

        const expiresAt =
            isFree
                ? null
                : new Date(startedAt);

        if (expiresAt) {
            expiresAt.setMonth(
                expiresAt.getMonth() + Number(duration_months || 1)
            );
        }

        await conn.beginTransaction();

        await conn.query(
            `
            UPDATE tags_subscriptions
            SET
                status = 'inactive',
                updated_at = NOW()
            WHERE business_id = ?
            AND status IN ('active', 'trial', 'past_due')
            `,
            [business_id]
        );

        const [result] = await conn.query(
            `
            INSERT INTO tags_subscriptions (
                business_id,
                plan_id,
                status,
                payment_provider,
                amount,
                currency,
                started_at,
                expires_at,
                duration_months,
                source,
                next_billing_at,
                auto_renew,
                auto_disable_on_expire,
                grace_days,
                admin_override_until,
                admin_override_notes,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `,
            [
                business_id,
                plan_id,
                status,
                payment_provider,
                amount ?? plan.price ?? 0,
                currency || plan.currency || "ARS",
                startedAt,
                expiresAt,
                Number(duration_months || 1),
                expiresAt,
                auto_renew ? 1 : 0,
                auto_disable_on_expire ? 1 : 0,
                Number(grace_days || 0),
                admin_override_until || null,
                admin_override_notes || null
            ]
        );

        await conn.query(
            `
            UPDATE tags_businesses
            SET
                plan_id = ?,
                subscription_status = ?,
                plan_started_at = ?,
                plan_expires_at = ?,
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                plan_id,
                status,
                startedAt,
                expiresAt,
                business_id
            ]
        );

        await conn.commit();

        return Response.json({
            success: true,
            id: result.insertId
        });

    } catch (err) {

        await conn.rollback();

        console.log("SUBSCRIPTION CREATE ERROR:", err);

        return Response.json(
            { error: "Error creando suscripción" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}