// =====================================
// API: /api/addons/delete
// Descripción: Desactiva un complemento global del catálogo.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);

        const id = searchParams.get("id");

        if (!id) {
            return Response.json(
                { error: "id requerido" },
                { status: 400 }
            );
        }

        await db.query(
            `
            UPDATE tags_addons
            SET
                is_active = 0,
                is_public = 0
            WHERE id = ?
            `,
            [id]
        );

        return Response.json({ ok: true });

    } catch (err) {
        console.log("ADDONS DELETE ERROR:", err);

        return Response.json(
            { error: "Error desactivando complemento" },
            { status: 500 }
        );
    }
}