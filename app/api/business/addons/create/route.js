// =====================================
// API: /api/business/addons/create
// Descripción: Crea/asigna un addon activo a un cliente validando contra el catálogo global.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { syncBusinessQRPageEnabled }
    from "@/app/modules/addons/lib/syncBusinessQRPageEnabled";

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

        const businessId =
            Number(business_id);

        if (!businessId) {
            return Response.json(
                { error: "business_id inválido" },
                { status: 400 }
            );
        }

        const cleanAddonCode =
            String(addon_code)
                .trim()
                .toLowerCase();

/*         console.log("CREATE ADDON:", {
            business_id,
            addon_code,
            cleanAddonCode
        }); */

        // =========================
        // VALIDAR ADDON DESDE DB
        // =========================

        const [addonRows] =
            await db.query(
                `
                SELECT
                    id,
                    code,
                    name,
                    default_quantity,
                    price,
                    currency
                FROM tags_addons
                WHERE TRIM(LOWER(code)) = ?
                AND is_active = 1
                LIMIT 1
                `,
                [
                    cleanAddonCode
                ]
            );

        const addon =
            addonRows[0];

        if (!addon) {
            return Response.json(
                { error: "addon_code inválido" },
                { status: 400 }
            );
        }

        const finalQuantity =
            Number(
                quantity ||
                addon.default_quantity ||
                1
            );

        if (finalQuantity < 1) {
            return Response.json(
                { error: "Cantidad inválida" },
                { status: 400 }
            );
        }

        // =========================
        // VALIDAR CLIENTE
        // =========================

        const [businessRows] =
            await db.query(
                `
                SELECT
                    id
                FROM tags_businesses
                WHERE id = ?
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        if (!businessRows.length) {
            return Response.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            );
        }

        // =========================
        // REGLA: TAGSID ÚNICO POR CLIENTE
        // =========================

        if (
            cleanAddonCode === "tags_id" ||
            cleanAddonCode === "tagsid"
        ) {

            const [existingTagsId] =
                await db.query(
                    `
                    SELECT
                        id
                    FROM tags_business_addons
                    WHERE business_id = ?
                    AND TRIM(LOWER(addon_code)) = 'tags_id'
                    AND status = 'active'
                    AND (
                        expires_at IS NULL
                        OR expires_at >= CURDATE()
                    )
                    LIMIT 1
                    `,
                    [
                        businessId
                    ]
                );

            if (existingTagsId.length) {
                return Response.json(
                    { error: "El cliente ya tiene TagsID activo" },
                    { status: 409 }
                );
            }
        }

        // =========================
        // CREAR ADDON
        // =========================

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
                businessId,
                cleanAddonCode,
                finalQuantity,
                started_at || null,
                expires_at || null,
                amount ?? addon.price ?? 0,
                currency || addon.currency || "ARS",
                notes || null
            ]
        );

        const qrPageEnabled =
            await syncBusinessQRPageEnabled(
                businessId
            );

        return Response.json({
            ok: true,
            qr_page_enabled: qrPageEnabled
        });

    } catch (err) {

        console.log(
            "BUSINESS ADDONS CREATE ERROR:",
            err
        );

        return Response.json(
            { error: "Error creando addon" },
            { status: 500 }
        );
    }
}