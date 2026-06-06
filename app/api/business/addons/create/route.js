// =====================================
// API: /api/business/addons/create
// Descripción: Crea/asigna un addon a un cliente.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

const VALID_ADDONS = [
    "qr_page",
    "tagsid",
    "custom_domain",
    "analytics_plus"
];

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {
            business_id,
            addon_code,
            quantity,
            amount,
            currency,
            started_at,
            expires_at,
            notes
        } = body;

        if (!business_id) {
            return Response.json(
                { error: "business_id requerido" },
                { status: 400 }
            );
        }

        if (!addon_code) {
            return Response.json(
                { error: "addon_code requerido" },
                { status: 400 }
            );
        }

        if (!VALID_ADDONS.includes(addon_code)) {
            return Response.json(
                { error: "addon_code inválido" },
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

        const [businessRows] =
            await db.query(
                `
                SELECT id
                FROM tags_businesses
                WHERE id = ?
                LIMIT 1
                `,
                [business_id]
            );

        if (!businessRows.length) {
            return Response.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            );
        }

        if (addon_code === "tagsid") {

            const [existingTagsId] =
                await db.query(
                    `
                    SELECT id
                    FROM tags_business_addons
                    WHERE business_id = ?
                    AND addon_code = 'tagsid'
                    AND status = 'active'
                    LIMIT 1
                    `,
                    [business_id]
                );

            if (existingTagsId.length) {
                return Response.json(
                    { error: "El cliente ya tiene TagsID activo" },
                    { status: 409 }
                );
            }
        }

        await db.query(
            `
            INSERT INTO tags_business_addons (
                business_id,
                addon_code,
                quantity,
                status,
                started_at,
                expires_at,
                amount,
                currency,
                notes,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, NOW(), NOW())
            `,
            [
                business_id,
                addon_code,
                finalQuantity,
                started_at || null,
                expires_at || null,
                amount || 0,
                currency || "ARS",
                notes || null
            ]
        );

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.log("BUSINESS ADDONS CREATE ERROR:", err);

        return Response.json(
            { error: "Error creando addon" },
            { status: 500 }
        );
    }
}