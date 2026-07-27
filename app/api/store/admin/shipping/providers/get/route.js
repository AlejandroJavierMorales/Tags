export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
    requireStoreBusinessAccess,
    storeAccessResponse
} from "@/app/modules/store/lib/storeAdminAccess";

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("businessId");

        const provider =
            searchParams.get("provider") || "zipnova";

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
            return Response.json(
                { error: "Tienda no encontrada" },
                { status: 404 }
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT
                    id,
                    store_id,
                    provider,
                    name,
                    auth_type,
                    account_id,
                    origin_id,
                    CASE
                        WHEN api_token IS NOT NULL
                        AND api_token != ''
                        THEN 1
                        ELSE 0
                    END AS has_api_token,
                    is_active,
                    is_connected,
                    settings_json,
                    created_at,
                    updated_at
                FROM tags_store_shipping_provider_accounts
                WHERE store_id = ?
                AND provider = ?
                LIMIT 1
                `,
                [
                    store.id,
                    provider
                ]
            );

        return Response.json({
            ok: true,
            storeId: store.id,
            provider: rows[0] || null
        });

    } catch (err) {
        console.error("STORE SHIPPING PROVIDER GET ERROR:", err);

        return Response.json(
            { error: "Error obteniendo proveedor logístico" },
            { status: 500 }
        );
    }
}
