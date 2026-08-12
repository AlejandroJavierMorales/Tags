export const runtime = "nodejs";
import { db } from "@/app/lib/tags-db";
import { isRestoModule } from "@/app/modules/resto/lib/restoModuleRegistry";
import { requireRestoBuilderAccess, restoAccessResponse } from "@/app/modules/resto/lib/restoBuilderAccess";

export async function POST(req) {
    try {
        const payload = await req.json();
        let { businessId, sectionId, blockId, title, content_json = {}, styles_json = {}, animation_json = {}, is_visible } = payload;
        const resolvedBlockType = payload.block_type || payload.blockType || payload.type;
        if (!sectionId || !blockId || !isRestoModule(resolvedBlockType)) return Response.json({ error: "Datos o bloque inválido" }, { status: 400 });

        if (!businessId) {
            const [ownerRows] = await db.query(`
                SELECT st.business_id
                FROM tags_store_blocks b
                INNER JOIN tags_store_sections s ON s.id = b.section_id
                INNER JOIN tags_stores st ON st.id = s.store_id
                WHERE b.id = ?
                AND b.section_id = ?
                AND st.app_type = 'resto'
                LIMIT 1
            `, [blockId, sectionId]);
            businessId = ownerRows?.[0]?.business_id || null;
        }

        if (!businessId) return Response.json({ error: "Bloque de Resto no encontrado" }, { status: 404 });
        const access = await requireRestoBuilderAccess({ businessId, permission: "builder.manage" });
        if (!access.allowed) return restoAccessResponse(access);
        await db.query(`UPDATE tags_store_blocks b INNER JOIN tags_store_sections s ON s.id=b.section_id INNER JOIN tags_stores st ON st.id=s.store_id SET b.block_type=?, b.title=?, b.content_json=?, b.styles_json=?, b.animation_json=?, b.is_visible=?, b.updated_at=NOW() WHERE b.id=? AND b.section_id=? AND st.business_id=? AND st.app_type='resto'`, [resolvedBlockType, title || null, JSON.stringify(content_json), JSON.stringify(styles_json), JSON.stringify(animation_json), is_visible ? 1 : 0, blockId, sectionId, businessId]);
        return Response.json({ ok: true, block: { id: blockId, section_id: sectionId, block_type: resolvedBlockType, title: title || null, content_json, styles_json, animation_json, is_visible: is_visible ? 1 : 0 } });
    } catch (error) {
        console.error("RESTO BLOCK UPDATE ERROR:", error);
        return Response.json({ error: "Error actualizando bloque" }, { status: 500 });
    }
}
