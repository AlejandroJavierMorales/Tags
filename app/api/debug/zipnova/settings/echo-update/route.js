// =====================================
// API: /api/debug/zipnova/settings/echo-update
// Descripción: Diagnóstico temporal para reenviar a Zipnova exactamente los settings actuales.
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
    const { businessId } =
        await req.json();

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

    const [providerRows] =
        await db.query(
            `
            SELECT account_id, api_token, api_secret
            FROM tags_store_shipping_provider_accounts
            WHERE store_id = ?
            AND provider = 'zipnova'
            LIMIT 1
            `,
            [store.id]
        );

    const provider =
        providerRows[0];

    const auth =
        buildBasicAuth(
            provider.api_token,
            provider.api_secret
        );

    const getRes =
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

    const current =
        await getRes.json().catch(() => ({}));

    const putRes =
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
                    JSON.stringify(current)
            }
        );

    const update =
        await putRes.json().catch(() => ({}));

    return Response.json({
        get: {
            ok: getRes.ok,
            status: getRes.status,
            data: current
        },
        put: {
            ok: putRes.ok,
            status: putRes.status,
            data: update
        }
    });
}