// =====================================
// API: /api/store/admin/carriers/list
// Descripción: Lista transportistas de Tags Tienda por businessId.
// Uso: Dashboard Tags Tienda / Envíos.
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
                carriers: []
            });
        }

        const [carriers] =
            await db.query(
                `
                SELECT *
                FROM tags_store_carriers
                WHERE store_id = ?
                ORDER BY sort_order ASC, id ASC
                `,
                [store.id]
            );

        return Response.json({
            ok: true,
            storeId: store.id,
            carriers: carriers.map(carrier => ({
                ...carrier,
                api_settings_json:
                    parseJson(carrier.api_settings_json, {})
            }))
        });

    } catch (err) {
        console.error(
            "STORE CARRIERS LIST ERROR:",
            err
        );

        return Response.json(
            { error: "Error listando transportistas" },
            { status: 500 }
        );
    }
}