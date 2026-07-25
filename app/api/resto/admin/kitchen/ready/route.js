// =====================================
// FILE: /app/api/resto/admin/kitchen/ready/route.js
// Descripción:
// Marca un producto como preparado y, si corresponde,
// deja el pedido listo para entregar.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";
import { getRestoAccess, restoAccessResponse } from "@/app/modules/resto/lib/staff/getRestoAccess";

function clean(value) {

    return String(
        value || ""
    ).trim();

}

export async function POST(req) {

    const connection =
        await db.getConnection();

    try {

        const body =
            await req.json();

        const businessId =
            clean(body?.businessId);

        const itemId =
            Number(body?.itemId);

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

        if (!itemId) {

            return Response.json(
                {
                    error:
                        "itemId es requerido"
                },
                {
                    status: 400
                }
            );

        }

        const access = await getRestoAccess({ businessId, permission: "kitchen.ready" });
        if (!access.allowed) return restoAccessResponse(access);

        await connection.beginTransaction();

        const [
            storeRows
        ] =
            await connection.query(
                `
                SELECT
                    id
                FROM tags_stores
                WHERE business_id = ?
                  AND app_type='resto'
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows[0];

        if (!store) {

            throw new Error(
                "Tags Resto no encontrado."
            );

        }

        const [
            itemRows
        ] =
            await connection.query(
                `
                SELECT
                    i.id,
                    i.session_id,
                    i.preparation_status,
                    s.store_id
                FROM tags_resto_session_items i

                INNER JOIN tags_resto_sessions s
                    ON s.id=i.session_id

                WHERE
                    i.id=?
                    AND s.store_id=?

                LIMIT 1
                `,
                [
                    itemId,
                    store.id
                ]
            );

        const item =
            itemRows[0];

        if (!item) {

            throw new Error(
                "Producto no encontrado."
            );

        }

        if (
            item.preparation_status ===
            "ready"
        ) {

            await connection.rollback();

            return Response.json({

                ok: true,

                alreadyReady: true

            });

        }

        await connection.query(
            `
            UPDATE
                tags_resto_session_items
            SET
                preparation_status='ready'
            WHERE
                id=?
            `,
            [
                item.id
            ]
        );

        const [
            pendingRows
        ] =
            await connection.query(
                `
                SELECT
                    COUNT(*) total
                FROM tags_resto_session_items
                WHERE
                    session_id=?
                    AND requires_preparation=1
                    AND preparation_status='sent'
                `,
                [
                    item.session_id
                ]
            );
                    const pending =
            Number(
                pendingRows?.[0]?.total || 0
            );

        /* if (pending === 0) {

            await connection.query(
                `
                UPDATE
                    tags_resto_sessions
                SET
                    order_status='ready'
                WHERE
                    id=?
                `,
                [
                    item.session_id
                ]
            );

        } */

        await connection.commit();

        return Response.json({

            ok: true,

            sessionId:
                item.session_id,

            orderReady:
                pending === 0,

            pendingItems:
                pending

        });

    }

    catch (err) {

        await connection.rollback();

        console.error(
            "RESTO KITCHEN READY ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "No se pudo actualizar el producto."
            },
            {
                status: 500
            }
        );

    }

    finally {

        connection.release();

    }

}
