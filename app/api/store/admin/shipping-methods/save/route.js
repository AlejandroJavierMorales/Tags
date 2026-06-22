// =====================================
// API: /api/store/admin/shipping-methods/save
// Descripción: Crea o actualiza métodos de envío.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function safe(value) {
    return value === undefined || value === ""
        ? null
        : value;
}

const validTypes = [
    "pickup",
    "local_delivery",
    "shipping",
    "custom"
];

const validDeliveryTypes = [
    "pickup",
    "home",
    "branch",
    "custom"
];

export async function POST(req) {
    try {
        const body =
            await req.json();

        const {
            businessId,
            methodId,
            carrier_id,
            name,
            description,
            type,
            service_code,
            delivery_type,
            price,
            free_from,
            delivery_days_min,
            delivery_days_max,
            requires_address,
            requires_zip,
            is_api_rate,
            is_active,
            sort_order
        } = body;

        if (!businessId) {
            return Response.json(
                { error: "businessId es requerido" },
                { status: 400 }
            );
        }

        if (!name) {
            return Response.json(
                { error: "El nombre del método es requerido" },
                { status: 400 }
            );
        }

        if (type && !validTypes.includes(type)) {
            return Response.json(
                { error: "Tipo de método inválido" },
                { status: 400 }
            );
        }

        if (
            delivery_type &&
            !validDeliveryTypes.includes(delivery_type)
        ) {
            return Response.json(
                { error: "Tipo de entrega inválido" },
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

        if (carrier_id) {
            const [carrierRows] =
                await db.query(
                    `
                    SELECT id
                    FROM tags_store_carriers
                    WHERE id = ?
                    AND store_id = ?
                    LIMIT 1
                    `,
                    [
                        carrier_id,
                        store.id
                    ]
                );

            if (!carrierRows.length) {
                return Response.json(
                    { error: "Transportista inválido" },
                    { status: 400 }
                );
            }
        }

        if (methodId) {
            await db.query(
                `
                UPDATE tags_store_shipping_methods
                SET
                    carrier_id = ?,
                    name = ?,
                    description = ?,
                    type = ?,
                    service_code = ?,
                    delivery_type = ?,
                    price = ?,
                    free_from = ?,
                    delivery_days_min = ?,
                    delivery_days_max = ?,
                    requires_address = ?,
                    requires_zip = ?,
                    is_api_rate = ?,
                    is_active = ?,
                    sort_order = ?,
                    updated_at = NOW()
                WHERE id = ?
                AND store_id = ?
                `,
                [
                    safe(carrier_id),
                    name,
                    safe(description),
                    type || "custom",
                    safe(service_code),
                    delivery_type || "custom",
                    Number(price || 0),
                    safe(free_from),
                    safe(delivery_days_min),
                    safe(delivery_days_max),
                    Number(requires_address) === 0 ? 0 : 1,
                    Number(requires_zip) === 1 ? 1 : 0,
                    Number(is_api_rate) === 1 ? 1 : 0,
                    Number(is_active) === 0 ? 0 : 1,
                    Number(sort_order || 0),
                    methodId,
                    store.id
                ]
            );

            return Response.json({
                ok: true,
                message: "Método actualizado correctamente",
                methodId
            });
        }

        const [result] =
            await db.query(
                `
                INSERT INTO tags_store_shipping_methods (
                    store_id,
                    carrier_id,
                    name,
                    description,
                    type,
                    service_code,
                    delivery_type,
                    price,
                    free_from,
                    delivery_days_min,
                    delivery_days_max,
                    requires_address,
                    requires_zip,
                    is_api_rate,
                    is_active,
                    sort_order,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
                )
                `,
                [
                    store.id,
                    safe(carrier_id),
                    name,
                    safe(description),
                    type || "custom",
                    safe(service_code),
                    delivery_type || "custom",
                    Number(price || 0),
                    safe(free_from),
                    safe(delivery_days_min),
                    safe(delivery_days_max),
                    Number(requires_address) === 0 ? 0 : 1,
                    Number(requires_zip) === 1 ? 1 : 0,
                    Number(is_api_rate) === 1 ? 1 : 0,
                    Number(is_active) === 0 ? 0 : 1,
                    Number(sort_order || 0)
                ]
            );

        return Response.json({
            ok: true,
            message: "Método creado correctamente",
            methodId: result.insertId
        });

    } catch (err) {
        console.error(
            "STORE SHIPPING METHOD SAVE ERROR:",
            err
        );

        return Response.json(
            { error: "Error guardando método de envío" },
            { status: 500 }
        );
    }
}