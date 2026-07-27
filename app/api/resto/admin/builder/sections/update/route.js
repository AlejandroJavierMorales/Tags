export const runtime = "nodejs";
import { db } from "@/app/lib/tags-db";
import { requireRestoBuilderAccess, restoAccessResponse } from "@/app/modules/resto/lib/restoBuilderAccess";

export async function POST(req) {
    try {
        const { businessId, sectionId, section_type, title, settings_json = {}, is_visible } = await req.json();
        if (!businessId || !sectionId) return Response.json({ error: "businessId y sectionId requeridos" }, { status: 400 });
        const access = await requireRestoBuilderAccess({ businessId, permission: "builder.manage" });
        if (!access.allowed) return restoAccessResponse(access);
        await db.query(`UPDATE tags_store_sections s INNER JOIN tags_stores st ON st.id=s.store_id SET s.section_type=?, s.title=?, s.settings_json=?, s.is_visible=?, s.updated_at=NOW() WHERE s.id=? AND st.business_id=? AND st.app_type='resto'`, [section_type || "content", title || null, JSON.stringify(settings_json), is_visible ? 1 : 0, sectionId, businessId]);
        return Response.json({ ok: true });
    } catch (error) { console.error("RESTO SECTION UPDATE ERROR:", error); return Response.json({ error: "Error actualizando sección" }, { status: 500 }); }
}
