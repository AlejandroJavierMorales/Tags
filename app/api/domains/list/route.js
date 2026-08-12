export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function GET() {
    try {
        const [rows] = await db.query(`
            SELECT d.*, b.name AS business_name, b.email AS business_email,
                   t.code AS theme_code, t.name AS theme_name,
                   COUNT(r.id) AS route_count
            FROM tags_domains d
            LEFT JOIN tags_businesses b ON b.id = d.business_id
            LEFT JOIN tags_qr_page_themes t ON t.id = d.theme_id
            LEFT JOIN tags_domain_routes r ON r.domain_id = d.id
            GROUP BY d.id, b.name, b.email, t.code, t.name
            ORDER BY d.id DESC
        `);
        return Response.json(rows);
    } catch (error) {
        console.error("DOMAINS LIST ERROR:", error);
        return Response.json({ error: "Error listando dominios" }, { status: 500 });
    }
}
