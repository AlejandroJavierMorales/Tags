// =====================================
// API: /api/resto/admin/locations/update/route.js
// Descripción:
// Actualiza una ubicación de Tags Resto.
// Valida pertenencia al restaurante,
// sector padre y código único.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

function safe(value) {

    return (
        value === undefined ||
        value === null ||
        value === ""
    )
        ? null
        : value;

}

const VALID_LOCATION_TYPES = [
    "sector",
    "table",
    "counter",
    "pickup",
    "other"
];

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const {
            id,
            businessId,
            name,
            location_type,
            parent_id,
            location_code,
            description,
            capacity,
            sort_order,
            is_active
        } = await req.json();

        if (!id) {

            return Response.json(
                {
                    error:
                        "id requerido"
                },
                {
                    status: 400
                }
            );

        }

        if (!businessId) {

            return Response.json(
                {
                    error:
                        "businessId requerido"
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
                    "locations.manage"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        if (!name?.trim()) {

            return Response.json(
                {
                    error:
                        "Nombre requerido"
                },
                {
                    status: 400
                }
            );

        }

        if (
            !VALID_LOCATION_TYPES.includes(
                location_type
            )
        ) {

            return Response.json(
                {
                    error:
                        "Tipo inválido"
                },
                {
                    status: 400
                }
            );

        }

        // -----------------------------
        // RESTAURANTE
        // -----------------------------

        const [storeRows] =
            await conn.query(
                `
                SELECT
                    id
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
            storeRows[0];

        if (!store) {

            return Response.json(
                {
                    error:
                        "Tags Resto inexistente"
                },
                {
                    status: 404
                }
            );

        }

        // -----------------------------
        // UBICACIÓN ACTUAL
        // -----------------------------

        const [locationRows] =
            await conn.query(
                `
                SELECT
                    *
                FROM tags_resto_locations
                WHERE id = ?
                AND store_id = ?
                LIMIT 1
                `,
                [
                    id,
                    store.id
                ]
            );

        const currentLocation =
            locationRows[0];

        if (!currentLocation) {

            return Response.json(
                {
                    error:
                        "Ubicación inexistente"
                },
                {
                    status: 404
                }
            );

        }

        // -----------------------------
        // VALIDAR PADRE
        // -----------------------------

        if (parent_id) {

            if (
                String(parent_id) ===
                String(id)
            ) {

                return Response.json(
                    {
                        error:
                            "Una ubicación no puede ser su propio sector padre"
                    },
                    {
                        status: 400
                    }
                );

            }

            const [parentRows] =
                await conn.query(
                    `
                    SELECT
                        id,
                        location_type
                    FROM tags_resto_locations
                    WHERE id = ?
                    AND store_id = ?
                    LIMIT 1
                    `,
                    [
                        parent_id,
                        store.id
                    ]
                );

            const parent =
                parentRows[0];

            if (!parent) {

                return Response.json(
                    {
                        error:
                            "Sector inválido"
                    },
                    {
                        status: 400
                    }
                );

            }

            if (
                parent.location_type !==
                "sector"
            ) {

                return Response.json(
                    {
                        error:
                            "La ubicación padre debe ser un sector"
                    },
                    {
                        status: 400
                    }
                );

            }

        }

        if (
            location_type === "sector" &&
            parent_id
        ) {

            return Response.json(
                {
                    error:
                        "Un sector no puede pertenecer a otro sector"
                },
                {
                    status: 400
                }
            );

        }

        // -----------------------------
        // VALIDAR CÓDIGO
        // -----------------------------

        if (location_code?.trim()) {

            const [codeRows] =
                await conn.query(
                    `
                    SELECT
                        id
                    FROM tags_resto_locations
                    WHERE store_id = ?
                    AND location_code = ?
                    AND id <> ?
                    LIMIT 1
                    `,
                    [
                        store.id,
                        location_code.trim(),
                        id
                    ]
                );

            if (codeRows.length) {

                return Response.json(
                    {
                        error:
                            "El código ya existe"
                    },
                    {
                        status: 409
                    }
                );

            }

        }

        // -----------------------------
        // ACTUALIZAR
        // -----------------------------

        await conn.query(
            `
            UPDATE tags_resto_locations
            SET
                parent_id = ?,
                location_type = ?,
                name = ?,
                location_code = ?,
                description = ?,
                capacity = ?,
                sort_order = ?,
                is_active = ?,
                updated_at = NOW()
            WHERE id = ?
            AND store_id = ?
            `,
            [
                location_type === "sector"
                    ? null
                    : safe(parent_id),

                location_type,

                name.trim(),

                safe(
                    location_code?.trim()
                ),

                safe(description),

                safe(capacity),

                Number(
                    sort_order || 0
                ),

                Number(is_active) === 0
                    ? 0
                    : 1,

                id,

                store.id
            ]
        );

        // -----------------------------
        // ACTUALIZAR ETIQUETA DEL QR
        // -----------------------------

        if (
            currentLocation.qr_code_id
        ) {

            await conn.query(
                `
                UPDATE tags_qr_codes
                SET label = ?
                WHERE id = ?
                AND business_id = ?
                `,
                [
                    name.trim(),
                    currentLocation.qr_code_id,
                    businessId
                ]
            );

        }

        // -----------------------------
        // RESPUESTA
        // -----------------------------

        const [updatedRows] =
            await conn.query(
                `
                SELECT
                    l.*,

                    parent.name
                        AS parent_name,

                    parent.location_type
                        AS parent_type,

                    qr.code
                        AS qr_code,

                    qr.label
                        AS qr_label,

                    qr.status
                        AS qr_status,

                    qr.is_active
                        AS qr_is_active,

                    qr.final_url
                        AS qr_final_url

                FROM tags_resto_locations l

                LEFT JOIN tags_resto_locations parent
                    ON parent.id = l.parent_id
                    AND parent.store_id = l.store_id

                LEFT JOIN tags_qr_codes qr
                    ON qr.id = l.qr_code_id

                WHERE l.id = ?
                AND l.store_id = ?
                LIMIT 1
                `,
                [
                    id,
                    store.id
                ]
            );

        return Response.json({
            ok: true,
            location:
                updatedRows[0]
        });

    } catch (err) {

        console.error(
            "RESTO LOCATION UPDATE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error actualizando ubicación"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();

    }

}
