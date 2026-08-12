export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function DELETE(req) {
    try {
        const id = new URL(req.url).searchParams.get("id");
        if (!id) return Response.json({ error: "id requerido" }, { status: 400 });
        await db.query("UPDATE tags_domains SET is_active = 0 WHERE id = ?", [id]);
        await db.query("UPDATE tags_domain_routes SET is_active = 0 WHERE domain_id = ?", [id]);
        return Response.json({ ok: true });
    } catch (error) {
        console.error("DOMAINS DELETE ERROR:", error);
        return Response.json({ error: "Error desactivando dominio" }, { status: 500 });
    }
}
