export const runtime = "nodejs";
import { db } from "@/app/lib/tags-db";
import { isRestoModule } from "@/app/modules/resto/lib/restoModuleRegistry";
import { requireRestoBuilderAccess, restoAccessResponse } from "@/app/modules/resto/lib/restoBuilderAccess";

export async function POST(req) {
    try {
        const { businessId, sectionId, block_type, title, content_json = {}, styles_json = {}, animation_json = {} } = await req.json();
        if (!businessId || !sectionId || !block_type || !isRestoModule(block_type)) return Response.json({ error: "Sección o bloque inválido" }, { status: 400 });
        const access = await requireRestoBuilderAccess({ businessId, permission: "builder.manage" });
        if (!access.allowed) return restoAccessResponse(access);
        const [rows] = await db.query(`SELECT COALESCE(MAX(b.sort_order),0) max_order FROM tags_store_blocks b INNER JOIN tags_store_sections s ON s.id=b.section_id INNER JOIN tags_stores st ON st.id=s.store_id WHERE b.section_id=? AND st.business_id=? AND st.app_type='resto'`, [sectionId, businessId]);
        const [result] = await db.query(`INSERT INTO tags_store_blocks (section_id, block_type, title, content_json, styles_json, animation_json, is_visible, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,1,?,NOW(),NOW())`, [sectionId, block_type, title || null, JSON.stringify(content_json), JSON.stringify(styles_json), JSON.stringify(animation_json), Number(rows?.[0]?.max_order || 0) + 1]);
        return Response.json({ ok: true, blockId: result.insertId });
    } catch (error) { console.error("RESTO BLOCK CREATE ERROR:", error); return Response.json({ error: "Error creando bloque" }, { status: 500 }); }
}
