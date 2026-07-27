export const runtime = "nodejs";
import { db } from "@/app/lib/tags-db";
import { requireRestoBuilderAccess, restoAccessResponse } from "@/app/modules/resto/lib/restoBuilderAccess";

export async function POST(req) {
    try {
        const { businessId, section_type = "content", title = "Nueva sección", settings_json = {} } = await req.json();
        if (!businessId) return Response.json({ error: "businessId requerido" }, { status: 400 });
        const access = await requireRestoBuilderAccess({ businessId, permission: "builder.manage" });
        if (!access.allowed) return restoAccessResponse(access);
        const [stores] = await db.query(`SELECT id FROM tags_stores WHERE business_id = ? AND app_type='resto' LIMIT 1`, [businessId]);
        const storeId = stores?.[0]?.id;
        if (!storeId) return Response.json({ error: "Resto no encontrado" }, { status: 404 });
        const [maxRows] = await db.query(`SELECT COALESCE(MAX(sort_order),0) max_order FROM tags_store_sections WHERE store_id=?`, [storeId]);
        const [result] = await db.query(`INSERT INTO tags_store_sections (store_id, section_type, title, settings_json, is_visible, sort_order, created_at, updated_at) VALUES (?,?,?,?,1,?,NOW(),NOW())`, [storeId, section_type, title, JSON.stringify(settings_json), Number(maxRows?.[0]?.max_order || 0) + 1]);
        return Response.json({ ok: true, sectionId: result.insertId });
    } catch (error) { console.error("RESTO SECTION CREATE ERROR:", error); return Response.json({ error: "Error creando sección" }, { status: 500 }); }
}
