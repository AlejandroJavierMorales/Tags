export const runtime = "nodejs";
import { db } from "@/app/lib/tags-db";
import { requireRestoBuilderAccess, restoAccessResponse } from "@/app/modules/resto/lib/restoBuilderAccess";

export async function POST(req) {
    try {
        const { businessId, sectionIds = [] } = await req.json();
        if (!businessId || !Array.isArray(sectionIds)) return Response.json({ error: "Datos inválidos" }, { status: 400 });
        const access = await requireRestoBuilderAccess({ businessId, permission: "builder.manage" });
        if (!access.allowed) return restoAccessResponse(access);
        const [stores] = await db.query(`SELECT id FROM tags_stores WHERE business_id=? AND app_type='resto' LIMIT 1`, [businessId]);
        if (!stores?.[0]) return Response.json({ error: "Resto no encontrado" }, { status: 404 });
        for (let index = 0; index < sectionIds.length; index += 1) await db.query(`UPDATE tags_store_sections SET sort_order=?, updated_at=NOW() WHERE id=? AND store_id=?`, [index + 1, sectionIds[index], stores[0].id]);
        return Response.json({ ok: true });
    } catch (error) { console.error("RESTO SECTION REORDER ERROR:", error); return Response.json({ error: "Error reordenando secciones" }, { status: 500 }); }
}
