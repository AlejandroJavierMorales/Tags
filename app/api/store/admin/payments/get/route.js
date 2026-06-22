// =====================================
// API: /api/store/admin/payments/get
// Descripción: Obtiene configuración de pagos de Tags Tienda.
// Uso: Dashboard Tags Tienda / Pagos.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function parseJson(value, fallback = {}) {
    if (!value) return fallback;
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("businessId");

        if (!businessId) {
            return Response.json(
                { error: "businessId es requerido" },
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
            return Response.json({
                ok: true,
                storeMissing: true,
                settings: []
            });
        }

        const [settings] =
            await db.query(
                `
                SELECT *
                FROM tags_store_payment_settings
                WHERE store_id = ?
                ORDER BY provider ASC
                `,
                [store.id]
            );

        return Response.json({
            ok: true,
            storeId: store.id,
            settings: settings.map(item => ({
                ...item,
                settings_json:
                    parseJson(item.settings_json, {})
            }))
        });

    } catch (err) {
        console.error("STORE PAYMENTS GET ERROR:", err);

        return Response.json(
            { error: "Error obteniendo pagos" },
            { status: 500 }
        );
    }
}