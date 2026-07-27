export const runtime = "nodejs";
import { db } from "@/app/lib/tags-db";
import { requireRestoBuilderAccess, restoAccessResponse } from "@/app/modules/resto/lib/restoBuilderAccess";

export async function POST(req) {
    try {
        const { businessId, sectionId, blockId } = await req.json();
        if (!businessId || !sectionId || !blockId) return Response.json({ error: "Datos requeridos" }, { status: 400 });
        const access = await requireRestoBuilderAccess({ businessId, permission: "builder.manage" });
        if (!access.allowed) return restoAccessResponse(access);
        await db.query(`DELETE b FROM tags_store_blocks b INNER JOIN tags_store_sections s ON s.id=b.section_id INNER JOIN tags_stores st ON st.id=s.store_id WHERE b.id=? AND b.section_id=? AND st.business_id=? AND st.app_type='resto'`, [blockId, sectionId, businessId]);
        return Response.json({ ok: true });
    } catch (error) { console.error("RESTO BLOCK DELETE ERROR:", error); return Response.json({ error: "Error eliminando bloque" }, { status: 500 }); }
}
