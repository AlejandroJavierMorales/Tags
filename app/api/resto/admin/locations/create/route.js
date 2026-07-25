// =====================================
// API: /api/resto/admin/locations/create
// Descripción:
// Crea una ubicación de Tags Resto.
// Los sectores no generan QR.
// Las mesas y puntos de atención generan
// automáticamente un QR único hacia
// la página pública de la ubicación.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { canCreateQR }
    from "@/app/modules/qr-page/lib/canCreateQR";

function generateCode() {

    return Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();

}

function safe(value) {

    return (
        value === undefined ||
        value === null ||
        value === ""
    )
        ? null
        : value;

}

function getBaseUrl() {

    return process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL_PROD;

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

        const body =
            await req.json();

        const {
            businessId,
            name,
            location_type = "table",
            parent_id = null,
            location_code = null,
            description = null,
            capacity = null,
            sort_order = 0,
            is_active = 1
        } = body;

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
                        "Tipo de ubicación inválido"
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
                    id,
                    business_id,
                    page_id,
                    slug,
                    name,
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
            storeRows[0];

        if (!store) {

            return Response.json(
                {
                    error:
                        "Tags Resto no está creado"
                },
                {
                    status: 404
                }
            );

        }

        if (!store.slug) {

            return Response.json(
                {
                    error:
                        "Tags Resto no tiene un slug configurado"
                },
                {
                    status: 400
                }
            );

        }

        // -----------------------------
        // UBICACIÓN PADRE
        // -----------------------------

        if (parent_id) {

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
                            "Ubicación padre inválida"
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
        // CÓDIGO DE UBICACIÓN
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
                    LIMIT 1
                    `,
                    [
                        store.id,
                        location_code.trim()
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

        const needsQR =
            location_type !== "sector";

        let product = null;

        // -----------------------------
        // PRODUCTO QR Y CUPO
        // -----------------------------

        if (needsQR) {

            const [productRows] =
                await conn.query(
                    `
                    SELECT
                        p.id,
                        p.name,
                        p.qr_type_id
                    FROM tags_products p

                    INNER JOIN tags_qr_types qt
                        ON qt.id = p.qr_type_id

                    WHERE qt.code = 'tags_resto'

                    LIMIT 1
                    `
                );

            product =
                productRows[0];

            if (!product) {

                return Response.json(
                    {
                        error:
                            "Producto QR Tags Resto inexistente"
                    },
                    {
                        status: 500
                    }
                );

            }

            const canCreate =
                await canCreateQR({
                    businessId,
                    quantity: 1
                });

            if (!canCreate.ok) {

                return Response.json(
                    {
                        error:
                            canCreate.error,

                        currentTotal:
                            canCreate.currentTotal || 0,

                        maxAllowed:
                            canCreate.maxAllowed || 0
                    },
                    {
                        status:
                            canCreate.status
                    }
                );

            }

        }

        // -----------------------------
        // TRANSACCIÓN
        // -----------------------------

        await conn.beginTransaction();

        let qrCodeId = null;
        let qrCode = null;
        let finalUrl = null;

        // -----------------------------
        // CREAR UBICACIÓN
        // -----------------------------

        const [locationResult] =
            await conn.query(
                `
                INSERT INTO tags_resto_locations (
                    store_id,
                    parent_id,
                    qr_code_id,
                    location_type,
                    name,
                    location_code,
                    description,
                    capacity,
                    sort_order,
                    is_active,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?,
                    ?,
                    NULL,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    NOW(),
                    NOW()
                )
                `,
                [
                    store.id,

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
                        : 1
                ]
            );

        const locationId =
            locationResult.insertId;

        // -----------------------------
        // CREAR QR DEFINITIVO
        // -----------------------------

        if (needsQR) {

            let exists = true;

            while (exists) {

                qrCode =
                    generateCode();

                const [checkRows] =
                    await conn.query(
                        `
                        SELECT
                            id
                        FROM tags_qr_codes
                        WHERE code = ?
                        LIMIT 1
                        `,
                        [
                            qrCode
                        ]
                    );

                exists =
                    checkRows.length > 0;

            }

            finalUrl =
                `${getBaseUrl()}/p/${store.slug}?locationId=${locationId}&qr=${qrCode}`;

            const [qrResult] =
                await conn.query(
                    `
                    INSERT INTO tags_qr_codes (
                        code,
                        label,
                        business_id,
                        product_id,
                        value,
                        final_url,
                        status,
                        is_active,
                        tracking_enabled,
                        created_at
                    )
                    VALUES (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        'active',
                        1,
                        1,
                        NOW()
                    )
                    `,
                    [
                        qrCode,
                        name.trim(),
                        businessId,
                        product.id,
                        finalUrl,
                        finalUrl
                    ]
                );

            qrCodeId =
                qrResult.insertId;

            await conn.query(
                `
                UPDATE tags_resto_locations
                SET
                    qr_code_id = ?,
                    updated_at = NOW()
                WHERE id = ?
                AND store_id = ?
                `,
                [
                    qrCodeId,
                    locationId,
                    store.id
                ]
            );

        }

        // -----------------------------
        // RESPUESTA
        // -----------------------------

        const [rows] =
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
                    locationId,
                    store.id
                ]
            );

        await conn.commit();

        return Response.json({
            ok: true,

            location:
                rows[0],

            qrCreated:
                needsQR,

            qrCode,

            finalUrl
        });

    } catch (err) {

        try {

            await conn.rollback();

        } catch {

            // La transacción puede no haberse iniciado.

        }

        console.error(
            "RESTO LOCATION CREATE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error creando ubicación"
            },
            {
                status:
                    err.status ||
                    500
            }
        );

    } finally {

        conn.release();

    }

}