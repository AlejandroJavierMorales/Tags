export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function GET(req) {
    try {
        const domainId = new URL(req.url).searchParams.get("domain_id");
        if (!domainId) return Response.json({ error: "domain_id requerido" }, { status: 400 });
        const [rows] = await db.query(`
            SELECT r.*, a.name AS addon_name, a.addon_type, a.page_type, d.domain
            FROM tags_domain_routes r
            INNER JOIN tags_domains d ON d.id = r.domain_id
            LEFT JOIN tags_addons a ON a.code = r.addon_code
            WHERE r.domain_id = ?
            ORDER BY CASE WHEN r.path = '/' THEN 0 ELSE 1 END, LENGTH(r.path), r.path
        `, [domainId]);
        return Response.json(rows);
    } catch (error) {
        console.error("DOMAIN ROUTES LIST ERROR:", error);
        return Response.json({ error: "Error listando rutas" }, { status: 500 });
    }
}
