export const runtime = "nodejs";
import { db } from "@/app/lib/tags-db";
import { requireRestoBuilderAccess, restoAccessResponse } from "@/app/modules/resto/lib/restoBuilderAccess";

export async function POST(req) {
    try {
        const { businessId, sectionId, blockIds = [] } = await req.json();
        if (!businessId || !sectionId || !Array.isArray(blockIds)) return Response.json({ error: "Datos inválidos" }, { status: 400 });
        const access = await requireRestoBuilderAccess({ businessId, permission: "builder.manage" });
        if (!access.allowed) return restoAccessResponse(access);
        for (let index = 0; index < blockIds.length; index += 1) await db.query(`UPDATE tags_store_blocks b INNER JOIN tags_store_sections s ON s.id=b.section_id INNER JOIN tags_stores st ON st.id=s.store_id SET b.sort_order=?, b.updated_at=NOW() WHERE b.id=? AND b.section_id=? AND st.business_id=? AND st.app_type='resto'`, [index + 1, blockIds[index], sectionId, businessId]);
        return Response.json({ ok: true });
    } catch (error) { console.error("RESTO BLOCK REORDER ERROR:", error); return Response.json({ error: "Error reordenando bloques" }, { status: 500 }); }
}
