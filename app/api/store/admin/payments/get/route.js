// =====================================
// API: /api/store/admin/payments/get
// Descripción: Obtiene configuración de pagos de Tags Tienda.
// Uso: Dashboard Tags Tienda / Pagos.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
    requireStoreBusinessAccess,
    storeAccessResponse
} from "@/app/modules/store/lib/storeAdminAccess";

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

        const access =
            await requireStoreBusinessAccess(
                businessId
            );

        if (!access.allowed) {
            return storeAccessResponse(access);
        }

        const store = access.store;

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
                SELECT
                    id,
                    store_id,
                    provider,
                    is_active,
                    public_key,
                    account_email,
                    account_name,
                    settings_json,
                    created_at,
                    updated_at
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
