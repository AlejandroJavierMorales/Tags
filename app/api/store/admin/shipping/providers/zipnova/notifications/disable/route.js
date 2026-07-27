// =====================================
// API: /api/store/admin/shipping/providers/zipnova/notifications/disable
// Descripción: Desactiva notificaciones al destinatario en Zipnova para que Tags maneje todos los emails.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function buildBasicAuth(token, secret) {
    return Buffer
        .from(`${token}:${secret}`)
        .toString("base64");
}

export async function POST(req) {
    try {
        const body =
            await req.json();

        const {
            businessId
        } = body;

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
                AND app_type = 'store'
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

        const [providerRows] =
            await db.query(
                `
                SELECT
                    account_id,
                    api_token,
                    api_secret
                FROM tags_store_shipping_provider_accounts
                WHERE store_id = ?
                AND provider = 'zipnova'
                AND is_active = 1
                AND is_connected = 1
                LIMIT 1
                `,
                [store.id]
            );

        const provider =
            providerRows[0];

        if (!provider) {
            return Response.json(
                { error: "Zipnova no está configurado para esta tienda" },
                { status: 400 }
            );
        }

        const auth =
            buildBasicAuth(
                provider.api_token,
                provider.api_secret
            );

        const settingsRes =
            await fetch(
                `https://api.zipnova.com.ar/v2/accounts/${provider.account_id}/settings`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Basic ${auth}`
                    }
                }
            );

        const currentSettings =
            await settingsRes.json().catch(() => ({}));

        if (!settingsRes.ok) {
            return Response.json(
                {
                    error: "No se pudo leer la configuración de Zipnova",
                    details: currentSettings
                },
                { status: settingsRes.status }
            );
        }

        const disabledSettings = {
            recipient_notifications: {
                shipment_created: false,
                shipment_shipped: false,
                shipment_ready_for_pickup: false,
                shipment_delivery_date_changed: false
            }
        };

        const updateRes =
            await fetch(
                `https://api.zipnova.com.ar/v2/accounts/${provider.account_id}/settings`,
                {
                    method: "PUT",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Basic ${auth}`
                    },
                    body:
                        JSON.stringify(disabledSettings)
                }
            );

        const updateData =
            await updateRes.json().catch(() => ({}));

        if (!updateRes.ok) {
            return Response.json(
                {
                    error: "No se pudo actualizar la configuración de Zipnova",
                    details: updateData
                },
                { status: updateRes.status }
            );
        }

        return Response.json({
            ok: true,
            message: "Notificaciones Zipnova desactivadas",
            settings: updateData
        });

    } catch (err) {
        console.error(
            "ZIPNOVA DISABLE NOTIFICATIONS ERROR:",
            err
        );

        return Response.json(
            { error: "Error desactivando notificaciones Zipnova" },
            { status: 500 }
        );
    }
}
