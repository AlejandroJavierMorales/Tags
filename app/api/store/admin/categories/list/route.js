// =====================================
// API: /api/store/admin/categories/list
// Descripción:
// Lista las categorías por businessId y appType.
// Compatible con Tags Store y Tags Resto.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";
import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

const VALID_APP_TYPES = [
    "store",
    "resto"
];

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get(
                "businessId"
            );

        const appType =
            searchParams.get(
                "appType"
            ) || "store";

        if (!businessId) {

            return Response.json(
                {
                    error:
                        "businessId es requerido"
                },
                {
                    status: 400
                }
            );

        }

        if (
            !VALID_APP_TYPES.includes(
                appType
            )
        ) {

            return Response.json(
                {
                    error:
                        "appType inválido"
                },
                {
                    status: 400
                }
            );

        }

        if (appType === "resto") {
            const access =
                await getRestoAccess({
                    businessId,
                    permission:
                        "categories.view"
                });

            if (!access.allowed) {
                return restoAccessResponse(access);
            }
        }

        const [storeRows] =
            await db.query(
                `
                SELECT
                    id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = ?
                LIMIT 1
                `,
                [
                    businessId,
                    appType
                ]
            );

        const store =
            storeRows[0];

        if (!store) {

            return Response.json({
                ok: true,
                storeId: null,
                storeMissing: true,
                categories: []
            });

        }

        const [categories] =
            await db.query(
                `
                SELECT
                    *
                FROM tags_store_categories
                WHERE store_id = ?
                ORDER BY
                    sort_order ASC,
                    name ASC
                `,
                [
                    store.id
                ]
            );

        return Response.json({
            ok: true,
            storeId: store.id,
            appType,
            categories
        });

    } catch (err) {

        console.error(
            "STORE CATEGORIES LIST ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error listando categorías"
            },
            {
                status: 500
            }
        );

    }

}
