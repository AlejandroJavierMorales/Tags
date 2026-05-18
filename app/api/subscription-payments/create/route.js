import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {

    try {

        const body =
            await req.json();

        const {

            subscription_id,
            amount,
            payment_method,
            reference,
            notes

        } = body;

        if (!subscription_id) {

            return Response.json(
                {
                    error:
                        "Falta suscripción"
                },
                {
                    status: 400
                }
            );
        }

        const [[subscription]] =
            await db.query(`

                SELECT *

                FROM tags_subscriptions

                WHERE id = ?
            `,
                [subscription_id]
            );

        if (!subscription) {

            return Response.json(
                {
                    error:
                        "Suscripción inexistente"
                },
                {
                    status: 404
                }
            );
        }

        // =========================
        // NUEVO VENCIMIENTO
        // =========================

        const currentExpire =
            subscription.expires_at
                ? new Date(subscription.expires_at)
                : new Date();

        const nextExpire =
            new Date(currentExpire);

        nextExpire.setMonth(
            nextExpire.getMonth()
            + (
                subscription.duration_months
                || 1
            )
        );

        // =========================
        // INSERT PAYMENT
        // =========================

        await db.query(`

            INSERT INTO
            tags_subscription_payments (

                subscription_id,
                business_id,
                plan_id,

                amount,
                currency,

                payment_method,
                status,

                paid_at,

                period_start,
                period_end,

                reference,
                notes
            )

            VALUES (

                ?, ?, ?,
                ?, ?,
                ?, 'paid',
                NOW(),
                ?, ?,
                ?, ?
            )
        `, [

            subscription.id,
            subscription.business_id,
            subscription.plan_id,

            amount,
            subscription.currency,

            payment_method,

            subscription.expires_at,
            nextExpire,

            reference,
            notes
        ]);

        // =========================
        // UPDATE SUBSCRIPTION
        // =========================

        await db.query(`

            UPDATE tags_subscriptions

            SET

                expires_at = ?,
                status = 'active',
                updated_at = NOW()

            WHERE id = ?
        `, [

            nextExpire,
            subscription.id
        ]);

        return Response.json({
            success: true
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    "Error registrando pago"
            },
            {
                status: 500
            }
        );
    }
}