// =====================================
// API: /api/store/admin/payments/save
// Descripción: Crea o actualiza configuración de pagos de Tags Tienda.
// Uso: Dashboard Tags Tienda / Pagos.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

const validProviders = [
    "mercado_pago",
    "manual_transfer",
    "cash"
];

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
            provider,
            is_active,
            public_key,
            access_token,
            account_email,
            account_name,
            settings_json
        } = body;

        if (!businessId) {
            return Response.json(
                { error: "businessId es requerido" },
                { status: 400 }
            );
        }

        if (!validProviders.includes(provider)) {
            return Response.json(
                { error: "Proveedor de pago inválido" },
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

        const [existingRows] =
            await db.query(
                `
                SELECT id
                FROM tags_store_payment_settings
                WHERE store_id = ?
                AND provider = ?
                LIMIT 1
                `,
                [
                    store.id,
                    provider
                ]
            );

        const existing =
            existingRows[0];

        if (existing) {
            await db.query(
                `
                UPDATE tags_store_payment_settings
                SET
                    is_active = ?,
                    public_key = ?,
                    access_token = ?,
                    account_email = ?,
                    account_name = ?,
                    settings_json = ?,
                    updated_at = NOW()
                WHERE id = ?
                `,
                [
                    Number(is_active) === 1 ? 1 : 0,
                    safe(public_key),
                    safe(access_token),
                    safe(account_email),
                    safe(account_name),
                    JSON.stringify(settings_json || {}),
                    existing.id
                ]
            );

            return Response.json({
                ok: true,
                message: "Configuración de pago actualizada"
            });
        }

        await db.query(
            `
            INSERT INTO tags_store_payment_settings (
                store_id,
                provider,
                is_active,
                public_key,
                access_token,
                account_email,
                account_name,
                settings_json,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `,
            [
                store.id,
                provider,
                Number(is_active) === 1 ? 1 : 0,
                safe(public_key),
                safe(access_token),
                safe(account_email),
                safe(account_name),
                JSON.stringify(settings_json || {})
            ]
        );

        return Response.json({
            ok: true,
            message: "Configuración de pago creada"
        });

    } catch (err) {
        console.error("STORE PAYMENTS SAVE ERROR:", err);

        return Response.json(
            { error: "Error guardando pagos" },
            { status: 500 }
        );
    }
}