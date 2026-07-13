// =====================================
// API: /api/store/admin/get
// Descripción: Obtiene la tienda de un cliente por businessId.
// Uso: Dashboard admin / cliente.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function parseJson(value, fallback = {}) {
    if (!value) {
        return fallback;
    }

    if (typeof value === "object") {
        return value;
    }

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
                {
                    error: "businessId es requerido"
                },
                {
                    status: 400
                }
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT
                    s.*,
                    p.slug AS page_slug,
                    p.status AS page_status,
                    p.page_type AS page_type
                FROM tags_stores s

                LEFT JOIN tags_qr_pages p
                    ON p.id = s.page_id

                WHERE s.business_id = ?
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const store =
            rows[0] || null;

        if (store) {
            store.settings_json =
                parseJson(
                    store.settings_json,
                    {}
                );

            store.styles_json =
                parseJson(
                    store.styles_json,
                    {}
                );
        }

        return Response.json({
            ok: true,
            store
        });

    } catch (err) {
        console.error(
            "STORE ADMIN GET ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error obteniendo tienda"
            },
            {
                status: 500
            }
        );
    }
}