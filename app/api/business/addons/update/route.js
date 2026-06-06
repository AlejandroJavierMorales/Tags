// =====================================
// API: /api/business/addons/update
// Descripción: Actualiza un addon asignado a un cliente.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

const VALID_STATUS = [
    "active",
    "inactive",
    "cancelled",
    "expired"
];

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {
            id,
            quantity,
            status,
            started_at,
            expires_at,
            amount,
            currency,
            notes
        } = body;

        if (!id) {
            return Response.json(
                { error: "id requerido" },
                { status: 400 }
            );
        }

        if (status && !VALID_STATUS.includes(status)) {
            return Response.json(
                { error: "Estado inválido" },
                { status: 400 }
            );
        }

        const finalQuantity =
            Number(quantity || 1);

        if (finalQuantity < 1) {
            return Response.json(
                { error: "Cantidad inválida" },
                { status: 400 }
            );
        }

        const [addonRows] =
            await db.query(
                `
                SELECT id
                FROM tags_business_addons
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );

        if (!addonRows.length) {
            return Response.json(
                { error: "Addon no encontrado" },
                { status: 404 }
            );
        }

        await db.query(
            `
            UPDATE
                tags_business_addons
            SET
                quantity = ?,
                status = ?,
                started_at = ?,
                expires_at = ?,
                amount = ?,
                currency = ?,
                notes = ?,
                updated_at = NOW()
            WHERE
                id = ?
            `,
            [
                finalQuantity,
                status || "active",
                started_at || null,
                expires_at || null,
                amount || 0,
                currency || "ARS",
                notes || null,
                id
            ]
        );

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.log("BUSINESS ADDONS UPDATE ERROR:", err);

        return Response.json(
            { error: "Error actualizando addon" },
            { status: 500 }
        );
    }
}