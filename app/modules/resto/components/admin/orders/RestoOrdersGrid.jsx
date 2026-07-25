// =====================================
// FILE: /app/modules/resto/components/admin/orders/RestoOrdersGrid.jsx
// Descripción:
// Grilla principal de pedidos de Tags Resto.
// Renderiza las tarjetas operativas y el estado vacío.
// =====================================

"use client";

import {
    FaClipboardList
} from "react-icons/fa";

import RestoOrderCard
    from "./RestoOrderCard";

export default function RestoOrdersGrid({

    orders,

    store,

    updatingOrderId,

    onOpenOrder,

    onEditOrder,

    onUpdateStatus,

    onSendToKitchen,

    onMarkAsPaid,

    onConfirmSession,

    capabilities

}) {

    if (
        !orders ||
        orders.length === 0
    ) {

        return (

            <section className="tags_resto_orders_grid">

                <div className="tags_resto_orders_grid_empty">

                    <div className="tags_resto_orders_grid_empty_icon">

                        <FaClipboardList />

                    </div>

                    <h2 className="tags_resto_orders_grid_empty_title">

                        No hay pedidos para mostrar

                    </h2>

                    <p className="tags_resto_orders_grid_empty_text">

                        Los nuevos pedidos aparecerán aquí automáticamente
                        cuando los clientes comiencen a realizar pedidos.

                    </p>

                </div>

            </section>

        );

    }

    return (

        <section className="tags_resto_orders_grid">

            <div className="tags_resto_orders_grid_results">

                <div className="tags_resto_orders_grid_counter">

                    <strong>

                        {orders.length}

                    </strong>

                    pedido
                    {
                        orders.length !== 1
                            ? "s"
                            : ""
                    }

                </div>

            </div>

            <div className="row g-4">

                {
                    orders.map(
                        order => (

                            <div
                                key={order.id}
                                className="col-12 col-xl-6 tags_resto_orders_grid_col"
                            >

                                <RestoOrderCard

                                    order={order}

                                    store={store}

                                    updating={
                                        Number(
                                            updatingOrderId
                                        ) ===
                                        Number(
                                            order.id
                                        )
                                    }

                                    onOpenOrder={
                                        onOpenOrder
                                    }

                                    onEditOrder={
                                        onEditOrder
                                    }

                                    onUpdateStatus={
                                        onUpdateStatus
                                    }

                                    onSendToKitchen={
                                        onSendToKitchen
                                    }

                                    onMarkAsPaid={
                                        onMarkAsPaid
                                    }

                                    onConfirmSession={
                                        onConfirmSession
                                    }

                                    capabilities={
                                        capabilities
                                    }

                                />

                            </div>

                        )
                    )
                }

            </div>

        </section>

    );

}
