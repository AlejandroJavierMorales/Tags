// =====================================
// FILE: app/modules/resto/components/public/RestoCurrentOrderProducts.jsx
// Descripción:
// Listado de productos del pedido.
// =====================================

"use client";

import RestoCurrentOrderItem
    from "./RestoCurrentOrderItem";

export default function RestoCurrentOrderProducts({

    items,

    totalItems,

    sending,

    isSessionOpen,

    formatMoney,

    updateItem,

    removeItem

}) {

    return (

        <section className="tags_resto_current_order_products">

            <div className="tags_resto_current_order_section_header">

                <div>

                    <span className="tags_resto_current_order_section_eyebrow">
                        Detalle
                    </span>

                    <h2>
                        PRODUCTOS DEL PEDIDO
                    </h2>

                </div>

                <span className="tags_resto_current_order_product_count">

                    {totalItems}

                    {
                        totalItems === 1
                            ? " producto"
                            : " productos"
                    }

                </span>

            </div>

            {

                !items.length && (

                    <div className="tags_resto_current_order_no_items">

                        <div className="tags_resto_current_order_no_items_icon">
                            🛒
                        </div>

                        <h3>
                            No hay productos
                        </h3>

                        <p>
                            Agregá productos desde la carta para comenzar.
                        </p>

                    </div>

                )

            }

            {

                items.length > 0 && (

                    <div className="tags_resto_current_order_items">

                        {

                            items.map(item => (

                                <RestoCurrentOrderItem

                                    key={item.id}

                                    item={item}

                                    sending={sending}

                                    isSessionOpen={isSessionOpen}

                                    formatMoney={formatMoney}

                                    updateItem={updateItem}

                                    removeItem={removeItem}

                                />

                            ))

                        }

                    </div>

                )

            }

        </section>

    );

}