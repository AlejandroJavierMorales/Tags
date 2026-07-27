// Abre una mesa de forma proactiva desde la operación del Mozo.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto
    from "crypto";

import {
    db
} from "@/app/lib/tags-db";
import { getRestoAccess, restoAccessResponse } from "@/app/modules/resto/lib/staff/getRestoAccess";
import { logRestoAudit } from "@/app/modules/resto/lib/staff/restoAudit";

function clean(value) {

    return String(
        value || ""
    ).trim();

}

export async function POST(req) {

    const connection =
        await db.getConnection();

    let transactionStarted =
        false;

    try {

        const body =
            await req.json();

        const businessId =
            clean(
                body?.businessId
            );

        const locationId =
            Number(
                body?.locationId
            );

        const customerName =
            clean(
                body?.customerName
            );

        if (
            !businessId ||
            !Number.isInteger(locationId) ||
            locationId <= 0 ||
            !customerName
        ) {

            return Response.json(
                {
                    error:
                        "Comercio, mesa y nombre son requeridos"
                },
                {
                    status: 400
                }
            );

        }

        const access = await getRestoAccess({ businessId, permission: "tables.open" });
        if (!access.allowed) return restoAccessResponse(access);

        await connection.beginTransaction();
        transactionStarted = true;

        const [locationRows] =
            await connection.query(
                `
                SELECT
                    l.id,
                    l.store_id,
                    l.qr_code_id,
                    l.location_type
                FROM tags_resto_locations l
                INNER JOIN tags_stores s
                    ON s.id = l.store_id
                WHERE l.id = ?
                AND s.business_id = ?
                AND s.app_type = 'resto'
                AND l.is_active = 1
                LIMIT 1
                FOR UPDATE
                `,
                [
                    locationId,
                    businessId
                ]
            );

        const location =
            locationRows[0];

        if (
            !location ||
            ![
                "table",
                "counter",
                "other"
            ].includes(
                location.location_type
            )
        ) {

            throw new Error(
                "La mesa no existe o está deshabilitada"
            );

        }

        const [activeRows] =
            await connection.query(
                `
                SELECT id
                FROM tags_resto_sessions
                WHERE location_id = ?
                AND status IN (
                    'pending_activation',
                    'open',
                    'bill_requested'
                )
                LIMIT 1
                FOR UPDATE
                `,
                [
                    location.id
                ]
            );

        if (activeRows.length) {

            throw new Error(
                "La mesa ya tiene una sesión activa"
            );

        }

        const token =
            crypto
                .randomBytes(32)
                .toString("hex");

        const [result] =
            await connection.query(
                `
                INSERT INTO tags_resto_sessions (
                    store_id,
                    location_id,
                    source_qr_code_id,
                    session_token,
                    service_mode,
                    guests,
                    status,
                    customer_name,
                    subtotal,
                    discount_total,
                    total,
                    opened_at,
                    confirmed_at,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    'table',
                    1,
                    'open',
                    ?,
                    0,
                    0,
                    0,
                    NOW(),
                    NOW(),
                    NOW(),
                    NOW()
                )
                `,
                [
                    location.store_id,
                    location.id,
                    location.qr_code_id ||
                        null,
                    token,
                    customerName
                ]
            );

        const orderNumber =
            `R-${String(
                result.insertId
            ).padStart(6, "0")}`;

        await connection.query(
            `
            UPDATE tags_resto_sessions
            SET order_number = ?
            WHERE id = ?
            `,
            [
                orderNumber,
                result.insertId
            ]
        );

        await logRestoAudit(
            connection,
            {
                storeId:
                    location.store_id,
                access,
                actionCode:
                    "table.opened",
                entityType:
                    "session",
                entityId:
                    result.insertId,
                description:
                    `Mesa abierta: ${orderNumber}`,
                metadata: {
                    locationId:
                        location.id,
                    customerName
                },
                req
            }
        );

        await connection.commit();
        transactionStarted = false;

        return Response.json({
            ok: true,
            sessionId:
                result.insertId,
            order_number:
                orderNumber
        });

    } catch (err) {

        if (transactionStarted) {

            await connection
                .rollback()
                .catch(
                    () => {}
                );

        }

        console.error(
            "RESTO WAITER OPEN TABLE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "No se pudo abrir la mesa"
            },
            {
                status: 409
            }
        );

    } finally {

        connection.release();

    }

}
