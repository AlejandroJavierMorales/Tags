// =====================================
// API: /api/subscriptions/delete
// Descripción: Cancela una suscripción sin borrar historial y sincroniza el estado del cliente.
// =====================================

import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    const conn = await db.getConnection();

    try {

        const body = await req.json();

        const { id } = body;

        if (!id) {
            return Response.json(
                { error: "id requerido" },
                { status: 400 }
            );
        }

        const [rows] = await conn.query(
            `
            SELECT *
            FROM tags_subscriptions
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        const subscription = rows[0];

        if (!subscription) {
            return Response.json(
                { error: "Suscripción inexistente" },
                { status: 404 }
            );
        }

        await conn.beginTransaction();

        await conn.query(
            `
            UPDATE tags_subscriptions
            SET
                status = 'cancelled',
                cancelled_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
            `,
            [id]
        );

        await conn.query(
            `
            UPDATE tags_businesses
            SET
                subscription_status = 'cancelled',
                updated_at = NOW()
            WHERE id = ?
            `,
            [subscription.business_id]
        );

        await conn.commit();

        return Response.json({
            success: true
        });

    } catch (err) {

        await conn.rollback();

        console.log("SUBSCRIPTION DELETE/CANCEL ERROR:", err);

        return Response.json(
            { error: "Error cancelando suscripción" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}