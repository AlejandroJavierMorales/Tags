export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    try {
        const body = await req.json().catch(() => null);
        const businessId = Number(body?.businessId || 0);
        const active = body?.active === true || Number(body?.active) === 1;

        if (!businessId) {
            return Response.json({ error: "businessId requerido" }, { status: 400 });
        }

        const [portalRows] = await db.query(
            "SELECT id,home_route_id FROM tags_portals WHERE business_id=? LIMIT 1",
            [businessId]
        );
        const portal = portalRows[0];

        if (!portal) {
            return Response.json({ error: "Portal no encontrado" }, { status: 404 });
        }

        if (active) {
            const [homeRows] = await db.query(
                `SELECT r.id
                 FROM tags_portal_routes r
                 INNER JOIN tags_qr_pages p ON p.id=r.page_id
                 WHERE r.id=? AND r.portal_id=? AND r.business_id=?
                 AND r.is_visible=1 AND p.status='published' LIMIT 1`,
                [portal.home_route_id, portal.id, businessId]
            );

            if (!homeRows.length) {
                return Response.json(
                    { error: "Para activar el Portal definí una Home que esté incorporada y publicada." },
                    { status: 409 }
                );
            }
        }

        await db.query(
            "UPDATE tags_portals SET status=?,updated_at=NOW() WHERE id=? AND business_id=?",
            [active ? "published" : "disabled", portal.id, businessId]
        );

        return Response.json({ ok: true, status: active ? "published" : "disabled" });
    } catch (err) {
        return Response.json(
            { error: err.message || "No se pudo cambiar el estado del Portal" },
            { status: 500 }
        );
    }
}
