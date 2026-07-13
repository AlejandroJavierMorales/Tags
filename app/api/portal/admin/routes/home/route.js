// =====================================
// API: /api/portal/admin/routes/home
// Descripción: Define una ruta como Home del Portal.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    try {
        const body = await req.json();

        const { portalId, routeId, businessId } = body;

        if (!portalId || !routeId || !businessId) {
            return Response.json(
                { error: "portalId, routeId y businessId son requeridos" },
                { status: 400 }
            );
        }

        const [routes] = await db.query(
            `
            SELECT id
            FROM tags_portal_routes
            WHERE id = ?
            AND portal_id = ?
            AND business_id = ?
            LIMIT 1
            `,
            [routeId, portalId, businessId]
        );

        if (!routes.length) {
            return Response.json(
                { error: "Ruta no encontrada" },
                { status: 404 }
            );
        }

        await db.query(
            `
            UPDATE tags_portal_routes
            SET is_home = 0
            WHERE portal_id = ?
            AND business_id = ?
            `,
            [portalId, businessId]
        );

        await db.query(
            `
            UPDATE tags_portal_routes
            SET is_home = 1,
                is_visible = 1,
                updated_at = NOW()
            WHERE id = ?
            `,
            [routeId]
        );

        await db.query(
            `
            UPDATE tags_portals
            SET home_route_id = ?,
                updated_at = NOW()
            WHERE id = ?
            AND business_id = ?
            `,
            [routeId, portalId, businessId]
        );

        return Response.json({
            ok: true
        });

    } catch (err) {
        console.error("PORTAL SET HOME ERROR:", err);

        return Response.json(
            { error: "Error definiendo Home del Portal" },
            { status: 500 }
        );
    }
}