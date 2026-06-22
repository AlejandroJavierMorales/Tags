// =====================================
// API: /api/store/admin/carriers/save
// Descripción: Crea o actualiza transportistas de Tags Tienda.
// Uso: Dashboard Tags Tienda / Envíos.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function safe(value) {
    return value === undefined || value === ""
        ? null
        : value;
}

const validTypes = [
    "manual",
    "api",
    "pickup",
    "own_delivery"
];

export async function POST(req) {
    try {
        const body =
            await req.json();

        const {
            businessId,
            carrierId,
            name,
            code,
            type,
            logo_url,
            tracking_url_template,
            api_provider,
            api_settings_json,
            is_active,
            sort_order
        } = body;

        if (!businessId) {
            return Response.json(
                { error: "businessId es requerido" },
                { status: 400 }
            );
        }

        if (!name) {
            return Response.json(
                { error: "El nombre del transportista es requerido" },
                { status: 400 }
            );
        }

        if (
            type &&
            !validTypes.includes(type)
        ) {
            return Response.json(
                { error: "Tipo de transportista inválido" },
                { status: 400 }
            );
        }

        const [storeRows] =
            await db.query(
                `
                SELECT id
                FROM tags_stores
                WHERE business_id = ?
                LIMIT 1
                `,
                [businessId]
            );

        const store =
            storeRows[0];

        if (!store) {
            return Response.json(
                { error: "Tienda no encontrada" },
                { status: 404 }
            );
        }

        if (carrierId) {
            await db.query(
                `
                UPDATE tags_store_carriers
                SET
                    name = ?,
                    code = ?,
                    type = ?,
                    logo_url = ?,
                    tracking_url_template = ?,
                    api_provider = ?,
                    api_settings_json = ?,
                    is_active = ?,
                    sort_order = ?,
                    updated_at = NOW()
                WHERE id = ?
                AND store_id = ?
                `,
                [
                    name,
                    safe(code),
                    type || "manual",
                    safe(logo_url),
                    safe(tracking_url_template),
                    safe(api_provider),
                    JSON.stringify(api_settings_json || {}),
                    Number(is_active) === 0 ? 0 : 1,
                    Number(sort_order || 0),
                    carrierId,
                    store.id
                ]
            );

            return Response.json({
                ok: true,
                message: "Transportista actualizado correctamente",
                carrierId
            });
        }

        const [result] =
            await db.query(
                `
                INSERT INTO tags_store_carriers (
                    store_id,
                    name,
                    code,
                    type,
                    logo_url,
                    tracking_url_template,
                    api_provider,
                    api_settings_json,
                    is_active,
                    sort_order,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `,
                [
                    store.id,
                    name,
                    safe(code),
                    type || "manual",
                    safe(logo_url),
                    safe(tracking_url_template),
                    safe(api_provider),
                    JSON.stringify(api_settings_json || {}),
                    Number(is_active) === 0 ? 0 : 1,
                    Number(sort_order || 0)
                ]
            );

        return Response.json({
            ok: true,
            message: "Transportista creado correctamente",
            carrierId: result.insertId
        });

    } catch (err) {
        console.error(
            "STORE CARRIER SAVE ERROR:",
            err
        );

        return Response.json(
            { error: "Error guardando transportista" },
            { status: 500 }
        );
    }
}