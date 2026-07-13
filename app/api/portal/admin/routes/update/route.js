// =====================================
// API: /api/portal/admin/routes/update
// Descripción: Actualiza configuración visible de una ruta del Portal.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    try {
        const {
            businessId,
            routeId,
            showInNav
        } = await req.json();

        if (!businessId || !routeId) {
            return Response.json(
                { error: "businessId y routeId requeridos" },
                { status: 400 }
            );
        }

        await db.query(
            `
            UPDATE tags_portal_routes
            SET
                show_in_nav = ?,
                updated_at = NOW()
            WHERE id = ?
            AND business_id = ?
            `,
            [
                Number(showInNav) === 1 ? 1 : 0,
                routeId,
                businessId
            ]
        );

        return Response.json({ ok: true });

    } catch (err) {
        return Response.json(
            { error: err.message },
            { status: 500 }
        );
    }
}