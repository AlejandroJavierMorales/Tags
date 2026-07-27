// =====================================
// FILE: /app/api/resto/admin/orders/get/route.js
// Descripción:
// Obtiene un pedido de Tags Resto con la misma
// estructura normalizada utilizada por el listado.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    getNormalizedOrders
} from "@/app/modules/resto/lib/orders/getNormalizedOrders";

import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

function clean(value) {

    return String(
        value || ""
    ).trim();

}

export async function GET(
    req
) {

    try {

        const {
            searchParams
        } =
            new URL(
                req.url
            );

        const businessId =
            clean(
                searchParams.get(
                    "businessId"
                )
            );

        const orderId =
            clean(
                searchParams.get(
                    "orderId"
                )
            );

        if (
            !businessId ||
            !orderId
        ) {

            return Response.json(
                {
                    error:
                        "businessId y orderId son requeridos"
                },
                {
                    status:
                        400
                }
            );

        }

        const access =
            await getRestoAccess({
                businessId,
                permission:
                    "orders.view"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        const {
            store,
            orders
        } =
            await getNormalizedOrders({
                businessId
            });

        if (!store) {

            return Response.json(
                {
                    error:
                        "Tags Resto no encontrado"
                },
                {
                    status:
                        404
                }
            );

        }

        const order =
            orders.find(
                currentOrder =>
                    Number(
                        currentOrder.id
                    ) ===
                    Number(
                        orderId
                    )
            );

        if (!order) {

            return Response.json(
                {
                    error:
                        "Pedido no encontrado"
                },
                {
                    status:
                        404
                }
            );

        }

        return Response.json({
            ok:
                true,

            storeId:
                store.id,

            store,

            order
        });

    } catch (err) {

        console.error(
            "RESTO ADMIN ORDER GET ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error obteniendo el pedido de Tags Resto"
            },
            {
                status:
                    500
            }
        );

    }

}
