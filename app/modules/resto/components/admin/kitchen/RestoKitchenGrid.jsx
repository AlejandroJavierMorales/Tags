// =====================================
// FILE: /app/modules/resto/components/admin/kitchen/RestoKitchenGrid.jsx
// Descripción:
// Grilla principal del módulo Cocina.
// Renderiza una tarjeta por cada pedido pendiente de preparación.
// =====================================

"use client";

import RestoKitchenCard
    from "./RestoKitchenCard";

export default function RestoKitchenGrid({
    orders = [],
    kitchenSettings = {},
    updatingItemId = null,
    onMarkReady,
    canMarkReady = true,
    onPrintOrder
}) {

    if (!orders.length) {

        return (

            <section className="tags_resto_kitchen_grid">

                <div className="qr-card tags_resto_kitchen_empty">

                    <div className="tags_resto_kitchen_empty_content text-center">

                        <div className="tags_resto_kitchen_empty_icon">

                            🎉

                        </div>

                        <h4 className="tags_resto_kitchen_empty_title mb-2">

                            No hay pedidos en preparación

                        </h4>

                        <p className="tags_resto_kitchen_empty_text text-muted mb-0">

                            La cocina está al día.

                        </p>

                    </div>

                </div>

            </section>

        );

    }

    return (

        <section className="tags_resto_kitchen_grid">

            <div className="row g-3 tags_resto_kitchen_grid_row">

                {
                    orders.map(order => (

                        <div
                            key={order.id}
                            className="col-12 col-md-6 col-xl-4 tags_resto_kitchen_grid_col"
                        >

                            <RestoKitchenCard
                                order={order}
                                kitchenSettings={kitchenSettings}
                                updatingItemId={updatingItemId}
                                onMarkReady={onMarkReady}
                                canMarkReady={canMarkReady}
                                onPrintOrder={onPrintOrder}
                            />

                        </div>

                    ))
                }

            </div>

        </section>

    );

}
