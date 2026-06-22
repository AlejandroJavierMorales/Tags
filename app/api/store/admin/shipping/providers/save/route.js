export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

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
            (!account_id || !origin_id || !api_token || !api_secret)
        ) {
            return Response.json(
                {
                    error: "Para activar Zipnova completá Account ID, Origin ID, API Token y API Secret"
                },
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
                api_token = VALUES(api_token),
                api_secret = VALUES(api_secret),
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
                Number(is_active) === 1 ? 1 : 0
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