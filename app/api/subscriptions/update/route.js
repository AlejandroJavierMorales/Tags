import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {
            id,
            plan_id,
            status,
            payment_provider,
            duration_months,
            amount,
            currency
        } = body;

        // =====================================
        // SOLO ACTUALIZAR STATUS
        // =====================================

        if (
            status &&
            plan_id === undefined
        ) {

            await db.execute(`
                UPDATE tags_subscriptions
                SET
                    status = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [
                status,
                id
            ]);

            return Response.json({
                success: true
            });
        }

        // =====================================
        // UPDATE COMPLETO
        // =====================================

        await db.execute(`
            UPDATE tags_subscriptions
            SET
                plan_id = ?,
                status = ?,
                payment_provider = ?,
                duration_months = ?,
                amount = ?,
                currency = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [
            plan_id,
            status,
            payment_provider,
            duration_months,
            amount,
            currency,
            id
        ]);

        return Response.json({
            success: true
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    "Error actualizando suscripción"
            },
            {
                status: 500
            }
        );
    }
}