// =====================================
// API: /api/addons/list
// Descripción: Lista el catálogo global de complementos disponibles.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function GET() {
    try {
        const [rows] = await db.query(`
            SELECT
                id,
                code,
                name,
                description,
                default_quantity,
                price,
                currency,
                addon_type,
                page_type,
                is_active,
                is_public,
                sort_order,
                created_at
            FROM tags_addons
            ORDER BY sort_order ASC, price ASC
        `);

        return Response.json(rows);

    } catch (err) {
        console.log("ADDONS LIST ERROR:", err);

        return Response.json(
            { error: "Error listando complementos" },
            { status: 500 }
        );
    }
}
