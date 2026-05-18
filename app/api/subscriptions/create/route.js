import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {

    try {

        const body =
            await req.json();

        const {

            business_id,
            plan_id,
            status,
            payment_provider,
            duration_months,
            amount,
            currency

        } = body;

        if (!business_id) {

            return Response.json(
                {
                    error:
                        "Falta cliente"
                },
                {
                    status: 400
                }
            );
        }

        if (!plan_id) {

            return Response.json(
                {
                    error:
                        "Falta plan"
                },
                {
                    status: 400
                }
            );
        }

        // =====================================
        // FECHAS
        // =====================================

        const startedAt =
            new Date();

        const expiresAt =
            new Date();

        expiresAt.setMonth(
            expiresAt.getMonth()
            + Number(duration_months || 1)
        );

        // =====================================
        // EL CLIENTE YA TIENE SUBSCRIPCION?
        // =====================================
        const [existing] =
            await db.execute(`
        SELECT id
        FROM tags_subscriptions
        WHERE business_id = ?
        AND status IN (
            'active',
            'trial',
            'past_due'
        )
        LIMIT 1
    `,
                [business_id]
            );

        if (existing.length > 0) {

            return Response.json(
                {
                    error:
                        "El cliente ya posee una suscripción activa"
                },
                {
                    status: 400
                }
            );
        }

        // =====================================
        // INSERT
        // =====================================

        const [result] =
            await db.query(`

                INSERT INTO
                tags_subscriptions (

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

                    created_at,
                    updated_at
                )

                VALUES (

                    ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?,
                    ?,
                    'manual',
                    NOW(),
                    NOW()
                )
            `, [

                business_id,
                plan_id,

                status,
                payment_provider,

                amount,
                currency,

                startedAt,
                expiresAt,

                duration_months
            ]);

        return Response.json({
            success: true,
            id: result.insertId
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    "Error creando suscripción"
            },
            {
                status: 500
            }
        );
    }
}