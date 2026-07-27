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

    totalItems,
    orderNumber,
    canReview = false,
    reviewLoading = false,
    onReview,
    review = null

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

                <div className="tags_resto_current_order_context_item tags_resto_current_order_order_number">
                    <span className="tags_resto_current_order_summary_label">Número de pedido</span>
                    <strong className="tags_resto_current_order_summary_value">{orderNumber || "Pendiente de confirmar"}</strong>
                </div>

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

            <div className={`tags_resto_current_order_review_cta ${review ? "is-complete" : ""}`}>
                <div className="tags_resto_current_order_review_stars" aria-label={`${review ? Number(review.average_rating).toFixed(1) : 5} estrellas`}>{review ? `${"★".repeat(Math.max(0, Math.min(5, Math.round(Number(review.average_rating || 0)))))}${"☆".repeat(Math.max(0, 5 - Math.round(Number(review.average_rating || 0))))}` : "★★★★★"}</div>
                <div>{review ? <><strong>¡Muchas gracias!</strong><span>Tu calificación: ({Number(review.average_rating || 0).toFixed(1)}/5)</span></> : <><strong>¿Cómo fue tu experiencia?</strong><span>Tu opinión nos ayuda a mejorar.</span></>}</div>
                {!review && <button type="button" onClick={onReview} disabled={!canReview || reviewLoading}>{reviewLoading ? "Preparando…" : "Calificar mi experiencia"}</button>}
            </div>

        </section>

    );

}
