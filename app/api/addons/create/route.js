// =====================================
// API: /api/addons/create
// Descripción: Crea un complemento global del catálogo.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    try {
        const body = await req.json();

        const {
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

        if (!code || !name) {
            return Response.json(
                { error: "code y name son obligatorios" },
                { status: 400 }
            );
        }

        const cleanCode = code.trim().toLowerCase();

        const [existing] = await db.query(
            `
            SELECT id
            FROM tags_addons
            WHERE code = ?
            LIMIT 1
            `,
            [cleanCode]
        );

        if (existing.length) {
            return Response.json(
                { error: "Ya existe un complemento con ese código" },
                { status: 409 }
            );
        }

        await db.query(
            `
            INSERT INTO tags_addons (
                code,
                name,
                description,
                default_quantity,
                price,
                currency,
                is_active,
                is_public,
                sort_order,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
                Number(sort_order || 0)
            ]
        );

        return Response.json({ ok: true });

    } catch (err) {
        console.log("ADDONS CREATE ERROR:", err);

        return Response.json(
            { error: "Error creando complemento" },
            { status: 500 }
        );
    }
}