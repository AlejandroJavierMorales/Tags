// =====================================
// API: /api/subscriptions/update
// Descripción: Actualiza una suscripción y sincroniza datos comerciales del cliente cuando corresponde.
// =====================================

import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    const conn = await db.getConnection();

    try {

        const body = await req.json();

        const {
            id,
            plan_id,
            status,
            payment_provider,
            duration_months,
            amount,
            currency,
            started_at,
            expires_at,
            next_billing_at,
            auto_renew,
            auto_disable_on_expire,
            grace_days,
            admin_override_until,
            admin_override_notes
        } = body;

        if (!id) {
            return Response.json(
                { error: "id requerido" },
                { status: 400 }
            );
        }

        const [currentRows] = await conn.query(
            `
            SELECT *
            FROM tags_subscriptions
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        const current = currentRows[0];

        if (!current) {
            return Response.json(
                { error: "Suscripción inexistente" },
                { status: 404 }
            );
        }

        const finalPlanId =
            plan_id ?? current.plan_id;

        const [planRows] = await conn.query(
            `
            SELECT *
            FROM tags_plans
            WHERE id = ?
            LIMIT 1
            `,
            [finalPlanId]
        );

        const plan = planRows[0];

        if (!plan) {
            return Response.json(
                { error: "Plan inexistente" },
                { status: 404 }
            );
        }

        await conn.beginTransaction();

        await conn.query(
            `
            UPDATE tags_subscriptions
            SET
                plan_id = ?,
                status = ?,
                payment_provider = ?,
                duration_months = ?,
                amount = ?,
                currency = ?,
                started_at = ?,
                expires_at = ?,
                next_billing_at = ?,
                auto_renew = ?,
                auto_disable_on_expire = ?,
                grace_days = ?,
                admin_override_until = ?,
                admin_override_notes = ?,
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                finalPlanId,
                status ?? current.status,
                payment_provider ?? current.payment_provider,
                duration_months ?? current.duration_months,
                amount ?? current.amount ?? plan.price ?? 0,
                currency ?? current.currency ?? plan.currency ?? "ARS",
                started_at ?? current.started_at,
                expires_at === undefined ? current.expires_at : expires_at,
                next_billing_at === undefined ? current.next_billing_at : next_billing_at,
                auto_renew === undefined ? current.auto_renew : (auto_renew ? 1 : 0),
                auto_disable_on_expire === undefined ? current.auto_disable_on_expire : (auto_disable_on_expire ? 1 : 0),
                grace_days === undefined ? current.grace_days : Number(grace_days || 0),
                admin_override_until === undefined ? current.admin_override_until : admin_override_until,
                admin_override_notes === undefined ? current.admin_override_notes : admin_override_notes,
                id
            ]
        );

        const finalStatus =
            status ?? current.status;

        if (finalStatus === "active") {
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
                    finalPlanId,
                    finalStatus,
                    started_at ?? current.started_at,
                    expires_at === undefined ? current.expires_at : expires_at,
                    current.business_id
                ]
            );
        } else {
            await conn.query(
                `
                UPDATE tags_businesses
                SET
                    subscription_status = ?,
                    updated_at = NOW()
                WHERE id = ?
                `,
                [
                    finalStatus,
                    current.business_id
                ]
            );
        }

        await conn.commit();

        return Response.json({
            success: true
        });

    } catch (err) {

        await conn.rollback();

        console.log("SUBSCRIPTION UPDATE ERROR:", err);

        return Response.json(
            { error: "Error actualizando suscripción" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}