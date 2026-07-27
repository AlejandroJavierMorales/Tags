export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
    requireStoreBusinessAccess,
    storeAccessResponse
} from "@/app/modules/store/lib/storeAdminAccess";

function safe(value) {
    return value === undefined || value === ""
        ? null
        : value;
}

export async function POST(req) {
    try {
        const body =
            await req.json();

        const {
            businessId,
            provider = "zipnova",
            account_id,
            origin_id,
            api_token,
            api_secret,
            is_active = 0
        } = body;

        if (!businessId) {
            return Response.json(
                { error: "businessId es requerido" },
                { status: 400 }
            );
        }

        if (provider !== "zipnova") {
            return Response.json(
                { error: "Proveedor no habilitado todavía" },
                { status: 400 }
            );
        }

        if (
            Number(is_active) === 1 &&
            (!account_id || !origin_id)
        ) {
            return Response.json(
                {
                    error: "Para activar Zipnova completá Account ID, Origin ID, API Token y API Secret"
                },
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

        const [existingRows] =
            await db.query(
                `
                SELECT
                    api_token,
                    api_secret
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

        const hasCredentials =
            Boolean(
                api_token ||
                existingRows[0]?.api_token
            ) &&
            Boolean(
                api_secret ||
                existingRows[0]?.api_secret
            );

        if (
            Number(is_active) === 1 &&
            !hasCredentials
        ) {
            return Response.json(
                {
                    error:
                        "Para activar Zipnova completá API Token y API Secret"
                },
                { status: 400 }
            );
        }

        await db.query(
            `
            INSERT INTO tags_store_shipping_provider_accounts (
                store_id,
                provider,
                name,
                auth_type,
                account_id,
                origin_id,
                api_token,
                api_secret,
                is_active,
                is_connected,
                created_at,
                updated_at
            )
            VALUES (
                ?, ?, 'Zipnova', 'basic',
                ?, ?, ?, ?,
                ?, ?,
                NOW(), NOW()
            )
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                auth_type = VALUES(auth_type),
                account_id = VALUES(account_id),
                origin_id = VALUES(origin_id),
                api_token =
                    COALESCE(VALUES(api_token), api_token),
                api_secret =
                    COALESCE(VALUES(api_secret), api_secret),
                is_active = VALUES(is_active),
                is_connected = VALUES(is_connected),
                updated_at = NOW()
            `,
            [
                store.id,
                provider,
                safe(account_id),
                safe(origin_id),
                safe(api_token),
                safe(api_secret),
                Number(is_active) === 1 ? 1 : 0,
                Number(is_active) === 1 &&
                hasCredentials
                    ? 1
                    : 0
            ]
        );

        return Response.json({
            ok: true,
            message: "Proveedor logístico guardado"
        });

    } catch (err) {
        console.error("STORE SHIPPING PROVIDER SAVE ERROR:", err);

        return Response.json(
            { error: "Error guardando proveedor logístico" },
            { status: 500 }
        );
    }
}
