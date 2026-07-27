// =====================================
// PAGE CLIENT: /p/[slug]/orders/track
// Descripción: Consulta pública de seguimiento de pedido.
// =====================================

"use client";

import { useState } from "react";
import Link from "next/link";

import showAlert from "@/app/components/showAlert";

import "@/app/styles/tags_store_public.css";

const orderStatusLabels = {
    new: "Pedido recibido",
    confirmed: "Confirmado",
    preparing: "En preparación",
    shipped: "Enviado",
    completed: "Completado",
    cancelled: "Cancelado"
};

const paymentStatusLabels = {
    pending: "Pago pendiente",
    paid: "Pago aprobado",
    cancelled: "Pago cancelado",
    refunded: "Pago reintegrado"
};

const shippingStatusLabels = {
    pending: "Pendiente",
    ready: "Listo para despacho",
    shipped: "Despachado",
    in_transit: "En tránsito",
    delivered: "Entregado",
    returned: "Devuelto",
    cancelled: "Cancelado"
};

function formatPrice(value, currency = "ARS") {
    return `${currency} ${Number(value || 0).toLocaleString("es-AR")}`;
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

export default function StoreOrderTrackClient({
    slug,
    store,
    prefilledOrder = ""
}) {

    const [orderNumber, setOrderNumber] =
        useState(prefilledOrder);

    const [contact, setContact] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [result, setResult] =
        useState(null);

    async function handleSearch(e) {
        e.preventDefault();

        if (!orderNumber.trim() || !contact.trim()) {
            showAlert({
                title: "Datos requeridos",
                text: "Ingresá número de pedido y email o teléfono.",
                icon: "warning"
            });

            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const res = await fetch(
                "/api/store/public/orders/track",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        slug,
                        orderNumber,
                        contact
                    })
                }
            );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo consultar el pedido."
                );
            }
            setResult(data);

        } catch (err) {
            showAlert({
                title: "Pedido no encontrado",
                text: err.message,
                icon: "info"
            });

        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="store_track_page">

            <section className="store_track_card">
                {store && (
                    <div className="store_track_store_header">

                        {store.logo_url && (
                            <div className="store_track_store_logo_wrap">
                                <img
                                    src={store.logo_url}
                                    alt={store.name}
                                    className="store_track_store_logo"
                                />
                            </div>
                        )}

                        <div className="store_track_store_info">
                            <strong>
                                {store.name}
                            </strong>

                            <span>
                                Seguimiento de pedidos
                            </span>
                        </div>

                    </div>
                )}
                <div className="store_track_header">
                    <span>📦</span>

                    <h1>
                        Seguimiento de pedido
                    </h1>

                    <p>
                        Consultá el estado de tu compra con el número de pedido y tu email o teléfono.
                    </p>
                </div>

                <form
                    className="store_track_form"
                    onSubmit={handleSearch}
                >
                    <div>
                        <label>
                            Número de pedido
                        </label>

                        <input
                            value={orderNumber}
                            onChange={(e) =>
                                setOrderNumber(e.target.value)
                            }
                            placeholder="Ej: ST1-81769809"
                        />
                    </div>

                    <div>
                        <label>
                            Email o teléfono
                        </label>

                        <input
                            value={contact}
                            onChange={(e) =>
                                setContact(e.target.value)
                            }
                            placeholder="Email o teléfono usado en la compra"
                        />
                    </div>

                    <button
                        type="submit"
                        className="store_public_btn"
                        disabled={loading}
                    >
                        {loading
                            ? "Consultando..."
                            : "Consultar pedido"}
                    </button>
                </form>

                <Link
                    href={`/p/${slug}`}
                    className="store_track_back"
                >
                    Volver a la tienda
                </Link>

            </section>

            {result?.order && (
                <section className="store_track_result">

                    <div className="store_track_result_head">
                        <div>
                            <h2>
                                Pedido {result.order.order_number}
                            </h2>

                            <p>
                                {result.order.store_name} · {formatDate(result.order.created_at)}
                            </p>
                        </div>

                        <strong>
                            {formatPrice(
                                result.order.total,
                                result.order.currency
                            )}
                        </strong>
                    </div>

                    <div className="store_track_status_grid">

                        <article>
                            <span>Pedido</span>

                            <strong>
                                {orderStatusLabels[result.order.order_status] || result.order.order_status}
                            </strong>
                        </article>

                        <article>
                            <span>Pago</span>

                            <strong>
                                {paymentStatusLabels[result.order.payment_status] || result.order.payment_status}
                            </strong>
                        </article>

                        <article>
                            <span>Envío</span>

                            <strong>
                                {shippingStatusLabels[result.order.shipping_status] || result.order.shipping_status}
                            </strong>
                        </article>

                    </div>

                    <div className="store_track_shipping">
                        <h3>Entrega</h3>

                        <p>
                            Método: {result.order.shipping_method_name || "No informado"}
                        </p>

                        <p>
                            Transportista: {result.order.carrier_name || "No informado"}
                        </p>

                        {result.order.tracking_code && (
                            <p>
                                Seguimiento:{" "}
                                <strong>
                                    {result.order.tracking_code}
                                </strong>
                            </p>
                        )}

                        {result.order.tracking_url && (
                            <a
                                href={result.order.tracking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Ver seguimiento externo
                            </a>
                        )}
                    </div>

                    <div className="store_track_items">
                        <h3>Productos</h3>

                        {result.items.map(item => (
                            <div
                                key={item.id}
                                className="store_track_item"
                            >
                                <div>
                                    <strong>
                                        {item.title}
                                    </strong>

                                    {item.variant_title && (
                                        <small>
                                            {item.variant_title}
                                        </small>
                                    )}
                                </div>

                                <span>
                                    {item.quantity} × {formatPrice(
                                        item.unit_price,
                                        result.order.currency
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="store_track_totals">

                        <div>
                            <span>Subtotal</span>
                            <strong>
                                {formatPrice(result.order.subtotal, result.order.currency)}
                            </strong>
                        </div>

                        {Number(result.order.discount_total || 0) > 0 && (
                            <div>
                                <span>Descuento</span>
                                <strong>
                                    - {formatPrice(result.order.discount_total, result.order.currency)}
                                </strong>
                            </div>
                        )}

                        {Number(result.order.shipping_total || 0) > 0 && (
                            <div>
                                <span>Envío</span>
                                <strong>
                                    {formatPrice(result.order.shipping_total, result.order.currency)}
                                </strong>
                            </div>
                        )}

                        <div className="total">
                            <span>Total</span>
                            <strong>
                                {formatPrice(result.order.total, result.order.currency)}
                            </strong>
                        </div>

                    </div>

                </section>
            )}

        </main>
    );
}
