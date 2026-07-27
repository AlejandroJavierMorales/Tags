// =====================================
// API: /api/resto/admin/locations/list
// Descripción: Lista sectores, mesas y demás ubicaciones
// configuradas para Tags Resto, resolviendo la tienda
// correspondiente mediante businessId.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get(
                "businessId"
            );

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

        const access =
            await getRestoAccess({
                businessId,
                permission:
                    [
                        "locations.view",
                        "tables.view"
                    ]
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        const [storeRows] =
            await db.query(
                `
                SELECT
                    id,
                    business_id,
                    page_id,
                    name,
                    slug,
                    status
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'resto'
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows[0] || null;

        if (!store) {

            return Response.json({
                ok: true,
                store: null,
                page: null,
                locations: [],
                sectors: [],
                ungrouped: []
            });

        }

        const [locationRows] =
            await db.query(
                `
                SELECT
                    l.*,

                    parent.name AS parent_name,
                    parent.location_type AS parent_type,

                    qr.code AS qr_code,
                    qr.label AS qr_label,
                    qr.status AS qr_status,
                    qr.is_active AS qr_is_active,
                    qr.final_url AS qr_final_url,
                    qr.total_clicks,
                    qr.last_click_at

                FROM tags_resto_locations l

                LEFT JOIN tags_resto_locations parent
                    ON parent.id = l.parent_id
                    AND parent.store_id = l.store_id

                LEFT JOIN tags_qr_codes qr
                    ON qr.id = l.qr_code_id

                WHERE l.store_id = ?

                ORDER BY
                    CASE
                        WHEN l.location_type = 'sector'
                        THEN 0
                        ELSE 1
                    END,

                    COALESCE(
                        parent.sort_order,
                        l.sort_order
                    ),

                    COALESCE(
                        parent.id,
                        l.id
                    ),

                    l.sort_order,
                    l.name
                `,
                [
                    store.id
                ]
            );

        const locations =
            locationRows.map(location => ({

                id:
                    location.id,

                store_id:
                    location.store_id,

                parent_id:
                    location.parent_id,

                qr_code_id:
                    location.qr_code_id,

                location_type:
                    location.location_type,

                name:
                    location.name,

                location_code:
                    location.location_code,

                description:
                    location.description,

                icon:
                    location.icon,

                color:
                    location.color,

                capacity:
                    location.capacity,

                sort_order:
                    Number(
                        location.sort_order || 0
                    ),

                is_active:
                    Number(
                        location.is_active
                    ) === 1,

                parent:
                    location.parent_id
                        ? {
                            id:
                                location.parent_id,

                            name:
                                location.parent_name,

                            location_type:
                                location.parent_type
                        }
                        : null,

                parent_name:
                    location.parent_name || null,

                qr:
                    location.qr_code_id
                        ? {
                            id:
                                location.qr_code_id,

                            code:
                                location.qr_code,

                            label:
                                location.qr_label,

                            status:
                                location.qr_status,

                            is_active:
                                Number(
                                    location.qr_is_active
                                ) === 1,

                            final_url:
                                location.qr_final_url,

                            total_clicks:
                                Number(
                                    location.total_clicks || 0
                                ),

                            last_click_at:
                                location.last_click_at
                        }
                        : null,

                created_at:
                    location.created_at,

                updated_at:
                    location.updated_at

            }));

        const sectors =
            locations
                .filter(
                    location =>
                        location.location_type ===
                        "sector"
                )
                .map(
                    sector => ({
                        ...sector,

                        locations:
                            locations.filter(
                                location =>
                                    Number(
                                        location.parent_id
                                    ) === Number(
                                        sector.id
                                    )
                            )
                    })
                );

        const ungrouped =
            locations.filter(
                location =>
                    location.location_type !==
                    "sector" &&
                    !location.parent_id
            );

        return Response.json({
            ok: true,

            store,

            page: {
                id:
                    store.page_id,

                slug:
                    store.slug,

                status:
                    store.status
            },

            locations,

            sectors,

            ungrouped
        });

    } catch (err) {

        console.error(
            "RESTO ADMIN LOCATIONS LIST ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error obteniendo ubicaciones de Tags Resto"
            },
            {
                status: 500
            }
        );

    }

}
