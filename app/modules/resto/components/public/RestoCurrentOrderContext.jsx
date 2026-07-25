// =====================================
// FILE: app/modules/resto/components/public/RestoCurrentOrderContext.jsx
// Descripción:
// Contexto del pedido activo.
// Muestra modalidad, ubicación, QR asociado y cantidad de productos.
// =====================================

"use client";

import {
    FaUtensils,
    FaLocationDot,
    FaQrcode,
    FaBasketShopping,
    FaMotorcycle,
    FaBagShopping
}
    from "react-icons/fa6";



export default function RestoCurrentOrderContext({

    isDineIn,
    serviceMode,
    serviceModeLabel,

    locationName,
    parentLocationName,

    qrLabel,
    qrCode,

    totalItems

}) {

    return (

        <section className="tags_resto_current_order_context">

            <div className="tags_resto_current_order_context_intro">

                <span className="tags_resto_current_order_eyebrow">
                    Pedido activo
                </span>

                <h2>
                    Tu pedido está asociado a esta atención
                </h2>

                <p>
                    Revisá los productos, agregá más opciones o solicitá asistencia.
                </p>

            </div>

            <div className="tags_resto_current_order_context_grid">

                <div className="tags_resto_current_order_context_item tags_resto_current_order_context_item_primary">

                    <span
                        className="tags_resto_current_order_context_icon"
                        aria-hidden="true"
                    >

                        {
                            isDineIn

                                ? <FaUtensils />

                                : serviceMode === "delivery"

                                    ? <FaMotorcycle />

                                    : <FaBagShopping />
                        }

                    </span>

                    <span className="tags_resto_current_order_summary_label">
                        Modalidad
                    </span>

                    <strong className="tags_resto_current_order_summary_value">
                        {serviceModeLabel}
                    </strong>

                </div>

                {

                    locationName && (

                        <div className="tags_resto_current_order_context_item">

                            <span
                                className="tags_resto_current_order_context_icon"
                                aria-hidden="true"
                            >
                                <FaLocationDot />
                            </span>

                            <span className="tags_resto_current_order_summary_label">

                                {
                                    isDineIn
                                        ? "Mesa o ubicación"
                                        : "Ubicación"
                                }

                            </span>

                            <strong className="tags_resto_current_order_summary_value">

                                {locationName}

                                {

                                    parentLocationName && (

                                        <small>
                                            {parentLocationName}
                                        </small>

                                    )

                                }

                            </strong>

                        </div>

                    )

                }

                <div className="tags_resto_current_order_context_item">

                    <span
                        className="tags_resto_current_order_context_icon"
                        aria-hidden="true"
                    >
                        <FaQrcode />
                    </span>

                    <span className="tags_resto_current_order_summary_label">
                        QR asociado
                    </span>

                    <strong className="tags_resto_current_order_summary_value">

                        {
                            qrLabel
                                ? `${qrLabel} · ${qrCode}`
                                : qrCode
                        }

                    </strong>

                </div>

                <div className="tags_resto_current_order_context_item">

                    <span
                        className="tags_resto_current_order_context_icon"
                        aria-hidden="true"
                    >
                        <FaBasketShopping />
                    </span>

                    <span className="tags_resto_current_order_summary_label">
                        Productos
                    </span>

                    <strong className="tags_resto_current_order_summary_value">
                        {totalItems}
                    </strong>

                </div>

            </div>

        </section>

    );

}