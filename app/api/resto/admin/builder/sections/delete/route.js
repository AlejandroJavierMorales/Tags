export const runtime = "nodejs";
import { db } from "@/app/lib/tags-db";
import { requireRestoBuilderAccess, restoAccessResponse } from "@/app/modules/resto/lib/restoBuilderAccess";

export async function POST(req) {
    try {
        const { businessId, sectionId } = await req.json();
        if (!businessId || !sectionId) return Response.json({ error: "Datos requeridos" }, { status: 400 });
        const access = await requireRestoBuilderAccess({ businessId, permission: "builder.manage" });
        if (!access.allowed) return restoAccessResponse(access);
        await db.query(`DELETE b FROM tags_store_blocks b INNER JOIN tags_store_sections s ON s.id=b.section_id INNER JOIN tags_stores st ON st.id=s.store_id WHERE s.id=? AND st.business_id=? AND st.app_type='resto'`, [sectionId, businessId]);
        await db.query(`DELETE s FROM tags_store_sections s INNER JOIN tags_stores st ON st.id=s.store_id WHERE s.id=? AND st.business_id=? AND st.app_type='resto'`, [sectionId, businessId]);
        return Response.json({ ok: true });
    } catch (error) { console.error("RESTO SECTION DELETE ERROR:", error); return Response.json({ error: "Error eliminando sección" }, { status: 500 }); }
}
