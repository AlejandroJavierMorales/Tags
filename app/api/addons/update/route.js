// =====================================
// API: /api/addons/update
// Descripción: Actualiza un complemento global del catálogo.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    try {
        const body = await req.json();

        const {
            id,
            code,
            name,
            description,
            default_quantity,
            price,
            currency,
            is_active,
            is_public,
            sort_order
        } = body;

        if (!id || !code || !name) {
            return Response.json(
                { error: "id, code y name son obligatorios" },
                { status: 400 }
            );
        }

        const cleanCode = code.trim().toLowerCase();

        const [existing] = await db.query(
            `
            SELECT id
            FROM tags_addons
            WHERE code = ?
            AND id <> ?
            LIMIT 1
            `,
            [cleanCode, id]
        );

        if (existing.length) {
            return Response.json(
                { error: "Ya existe otro complemento con ese código" },
                { status: 409 }
            );
        }

        await db.query(
            `
            UPDATE tags_addons
            SET
                code = ?,
                name = ?,
                description = ?,
                default_quantity = ?,
                price = ?,
                currency = ?,
                is_active = ?,
                is_public = ?,
                sort_order = ?
            WHERE id = ?
            `,
            [
                cleanCode,
                name.trim(),
                description || null,
                Number(default_quantity || 1),
                Number(price || 0),
                currency || "ARS",
                is_active ? 1 : 0,
                is_public ? 1 : 0,
                Number(sort_order || 0),
                id
            ]
        );

        return Response.json({ ok: true });

    } catch (err) {
        console.log("ADDONS UPDATE ERROR:", err);

        return Response.json(
            { error: "Error actualizando complemento" },
            { status: 500 }
        );
    }
}