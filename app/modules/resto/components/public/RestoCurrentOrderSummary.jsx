// =====================================
// FILE: app/modules/resto/components/public/RestoCurrentOrderSummary.jsx
// Descripción:
// Resumen visual del pedido.
// =====================================

"use client";

export default function RestoCurrentOrderSummary({

    totals,

    formatMoney

}) {

    return (

        <section className="tags_resto_current_order_totals">

            <div className="tags_resto_current_order_totals_header">

                <span className="tags_resto_current_order_section_eyebrow">
                    Resumen del pedido
                </span>

                <h2 className="tags_resto_current_order_section_eyebrow_h2">
                    Total a pagar
                </h2>

            </div>

            <div className="tags_resto_current_order_totals_body">

                <div className="tags_resto_current_order_total_row">

                    <span>
                        Productos
                    </span>

                    <strong>
                        ${formatMoney(totals.subtotal)}
                    </strong>

                </div>

                {

                    Number(totals.discount) > 0 && (

                        <div className="tags_resto_current_order_total_row tags_resto_current_order_total_discount">

                            <span>
                                Descuento
                            </span>

                            <strong>

                                − ${formatMoney(
                                    totals.discount
                                )}

                            </strong>

                        </div>

                    )

                }

            </div>

            <div className="tags_resto_current_order_total_final text-center mt-3">

                {/* <span>
                    TOTAL
                </span> */}

                <strong>

                    $

                    {formatMoney(
                        totals.total
                    )}

                </strong>

            </div>

        </section>

    );

}