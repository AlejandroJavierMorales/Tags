export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    const conn = await db.getConnection();
    try {
        const body = await req.json().catch(() => null);
        const businessId = Number(body?.businessId || 0);
        const portalId = Number(body?.portalId || 0);
        const routeIds = Array.isArray(body?.routeIds)
            ? body.routeIds.map(Number).filter(Boolean)
            : [];

        if (!businessId || !portalId || !routeIds.length) {
            return Response.json({ error: "Orden inválido" }, { status: 400 });
        }

        const [rows] = await conn.query(
            "SELECT id FROM tags_portal_routes WHERE portal_id=? AND business_id=?",
            [portalId, businessId]
        );
        const allowed = new Set(rows.map((row) => Number(row.id)));
        if (routeIds.some((id) => !allowed.has(id))) {
            return Response.json({ error: "Una de las rutas no pertenece al Portal" }, { status: 403 });
        }

        await conn.beginTransaction();
        for (let index = 0; index < routeIds.length; index += 1) {
            await conn.query(
                "UPDATE tags_portal_routes SET sort_order=?,updated_at=NOW() WHERE id=? AND portal_id=? AND business_id=?",
                [index + 1, routeIds[index], portalId, businessId]
            );
        }
        await conn.commit();
        return Response.json({ ok: true });
    } catch (err) {
        await conn.rollback().catch(() => null);
        return Response.json({ error: err.message || "No se pudo ordenar el menú" }, { status: 500 });
    } finally {
        conn.release();
    }
}
