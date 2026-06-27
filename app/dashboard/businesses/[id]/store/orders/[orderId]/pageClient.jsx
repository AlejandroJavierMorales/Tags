// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/store/orders/[orderId]
// Descripción: Detalle y gestión de pedido de Tags Tienda con tabs separados.
// =====================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import "../../../../../../modules/store/styles/tags_store_orders.css";

import {
    FaBoxOpen,
    FaTruck,
    FaUser,
    FaMoneyBillWave,
    FaWhatsapp,
    FaMapMarkerAlt,
    FaClipboardList,
    FaSyncAlt,
    FaBell,
    FaReceipt
} from "react-icons/fa";

import showAlert from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";
import StoreOrderActivity from "@/app/modules/store/components/admin/StoreOrderActivity";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/styles/tags_store_admin.css";

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

function safeParseJson(value) {
    if (!value) {
        return null;
    }

    if (typeof value === "object") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

const orderStatusLabels = {
    new: "Nuevo",
    confirmed: "Confirmado",
    preparing: "Preparando",
    shipped: "Enviado",
    completed: "Completado",
    cancelled: "Cancelado"
};

const paymentStatusLabels = {
    pending: "Pendiente",
    paid: "Pagado",
    cancelled: "Cancelado",
    refunded: "Reintegrado"
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

const tabs = [
    {
        key: "summary",
        label: "Resumen"
    },
    {
        key: "logistics",
        label: "Gestión y logística"
    },
    {
        key: "activity",
        label: "Actividad"
    }
];

export default function StoreOrderDetailClient({
    businessId,
    orderId
}) {
    const router = useRouter();

    const [activeTab, setActiveTab] = useState("summary");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creatingShipment, setCreatingShipment] = useState(false);
    const [store, setStore] = useState(null);
    const [order, setOrder] = useState(null);
    const [items, setItems] = useState([]);
    const [activity, setActivity] = useState([]);
    const [carriers, setCarriers] = useState([]);
    const [managementData, setManagementData] =
        useState({
            order_status: "new",
            payment_status: "pending"
        });

    useEffect(() => {
        loadOrder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId, orderId]);

    async function loadActivity() {
        try {
            const res =
                await fetch(
                    `/api/store/admin/orders/activity?businessId=${businessId}&orderId=${orderId}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (data.ok) {
                setActivity(data.activity || []);
            }

        } catch (err) {
            console.error("ORDER ACTIVITY ERROR:", err);
        }
    }

    async function loadOrder() {
        setLoading(true);

        try {
            const carriersRes =
                await fetch(
                    `/api/store/admin/carriers/list?businessId=${businessId}`,
                    {
                        cache: "no-store"
                    }
                );

            const carriersData =
                await carriersRes.json().catch(() => ({}));

            setCarriers(carriersData.carriers || []);

            const res =
                await fetch(
                    `/api/store/admin/orders/get?businessId=${businessId}&orderId=${orderId}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    "No se pudo cargar el pedido"
                );
            }

            setStore(data.store || null);
            setOrder(data.order || null);
            setItems(data.items || []);

            setManagementData({
                order_status:
                    data.order?.order_status || "new",
                payment_status:
                    data.order?.payment_status || "pending"
            });

            await loadActivity();

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setLoading(false);
        }
    }

    async function updateManagement() {
        if (!order) {
            return;
        }

        const result =
            await showAlert({
                title: "Guardar cambios",
                text:
                    "¿Deseas actualizar el estado del pedido?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Guardar",
                cancelButtonText: "Cancelar"
            });

        if (!result) {
            return;
        }

        setSaving(true);

        try {
            const res =
                await fetch(
                    "/api/store/admin/orders/status",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            orderId: order.id,
                            order_status:
                                managementData.order_status,
                            payment_status:
                                managementData.payment_status
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo actualizar el pedido"
                );
            }

            await loadOrder();

            showAlert({
                title: "Actualizado",
                text:
                    "Estado actualizado correctamente.",
                icon: "success",
                timer: 1200
            });

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setSaving(false);
        }
    }

    async function updateShipping() {
        try {
            const res =
                await fetch(
                    "/api/store/admin/orders/shipping-status",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            orderId: order.id,
                            shipping_status: order.shipping_status,
                            tracking_code: order.tracking_code,
                            tracking_url: order.tracking_url,
                            carrier_id: order.carrier_id,
                            carrier_name: order.carrier_name,
                            shipping_label_url: order.shipping_label_url
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo guardar la logística"
                );
            }

            await loadOrder();

            showAlert({
                title: "Guardado",
                text: "Datos logísticos actualizados.",
                icon: "success",
                timer: 1200
            });

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        }
    }

    async function downloadShippingLabel() {
        try {
            const res =
                await fetch(
                    "/api/store/admin/orders/shipping/document",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            orderId: order.id,
                            what: "label",
                            format: "pdf"
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo descargar la etiqueta"
                );
            }

            const link =
                document.createElement("a");

            link.href =
                data.fileUrl;

            link.download =
                data.filename || "etiqueta.pdf";

            document.body.appendChild(link);
            link.click();
            link.remove();

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        }
    }

    async function createShipment() {
        if (!order?.id) {
            return;
        }

        const confirmed =
            await showAlert({
                title: "Crear envío",
                text: "Se generará el envío real en Zipnova. ¿Continuar?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Crear envío",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) {
            return;
        }

        setCreatingShipment(true);

        try {
            const res =
                await fetch(
                    "/api/store/admin/orders/shipping/create-shipment",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            orderId: order.id
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error || "No se pudo crear el envío"
                );
            }

            await loadOrder();

            showAlert({
                title: data.skipped ? "Envío ya generado" : "Envío creado",
                text: data.skipped
                    ? "Este pedido ya tenía un envío generado."
                    : "Zipnova generó el envío correctamente.",
                icon: "success",
                timer: 1600
            });

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setCreatingShipment(false);
        }
    }

    async function syncTracking() {
        try {
            const res =
                await fetch(
                    "/api/store/admin/orders/shipping/sync-tracking",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            orderId: order.id
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo actualizar el tracking"
                );
            }

            await loadOrder();

            showAlert({
                title: "Tracking actualizado",
                icon: "success",
                timer: 1500
            });

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        }
    }

    async function resendEmail(type) {
        try {
            const res =
                await fetch(
                    "/api/store/admin/orders/resend-email",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            orderId: order.id,
                            type
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo reenviar el email"
                );
            }

            showAlert({
                title: "Email reenviado",
                text: "El email fue enviado nuevamente al cliente.",
                icon: "success",
                timer: 1400
            });

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        }
    }

    function buildWhatsappText() {
        if (!order || !store) {
            return "";
        }

        const lines = [
            `Hola! Te escribo por el pedido *${order.order_number}*`,
            "",
            `Estado actual: ${orderStatusLabels[order.order_status] || order.order_status}`,
            `Pago: ${paymentStatusLabels[order.payment_status] || order.payment_status}`,
            "",
            "Detalle:",
            "",
            ...items.flatMap((item, index) => [
                `*${index + 1}. ${item.title}*`,
                item.variant_title
                    ? `Variante: ${item.variant_title}`
                    : null,
                `Cantidad: ${item.quantity}`,
                `Subtotal: ${formatPrice(item.total_price, store.currency || "ARS")}`,
                ""
            ].filter(Boolean)),
            `*Total:* ${formatPrice(order.total, store.currency || "ARS")}`
        ];

        return lines.join("\n");
    }

    function openWhatsapp() {
        const phone =
            String(order?.customer_phone || "")
                .replace(/\D/g, "");

        if (!phone) {
            showAlert({
                title: "Sin teléfono",
                text: "Este pedido no tiene teléfono de cliente cargado.",
                icon: "info"
            });

            return;
        }

        const text =
            encodeURIComponent(
                buildWhatsappText()
            );

        window.open(
            `https://wa.me/${phone}?text=${text}`,
            "_blank"
        );
    }

    const quote = useMemo(() =>
        safeParseJson(order?.shipping_quote_json),
        [order?.shipping_quote_json]
    );

    if (loading) {
        return (
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="qr_page_builder store_order_detail_v2">
                <div className="store_orders_empty_state">
                    Pedido no encontrado.
                </div>
            </div>
        );
    }

    const currency =
        store?.currency || "ARS";

    const destinationLabel = [
        order.customer_address,
        order.customer_zip ? `CP ${order.customer_zip}` : null
    ].filter(Boolean).join(" · ");

    const serviceName =
        quote?.service_name ||
        quote?.service_type?.name ||
        order.shipping_method_name ||
        "A coordinar";

    const carrierName =
        quote?.carrier_name ||
        quote?.carrier?.name ||
        order.carrier_name ||
        "Sin transportista";

    const deliveryDays =
        quote?.delivery_days_min && quote?.delivery_days_max
            ? `${quote.delivery_days_min} a ${quote.delivery_days_max} días`
            : null;

    return (
        <div className="qr_page_builder store_order_detail_v2">

            <header className="store_order_detail_header">
                <div className="store_order_detail_title_area">
                    <span className="store_order_detail_eyebrow">Pedido</span>
                    <h1>
                        <FaClipboardList />
                        <span>{order.order_number}</span>
                    </h1>
                    <p>
                        {formatDate(order.created_at)}
                        {order.customer_name ? ` · ${order.customer_name}` : ""}
                    </p>
                </div>

                <div className="store_order_detail_total_box">
                    <small>Total</small>
                    <strong>{formatPrice(order.total, currency)}</strong>
                </div>

                <div className="store_order_detail_actions">
                    <button
                        type="button"
                        className="store_orders_btn secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/store/orders`
                            )
                        }
                    >
                        Volver
                    </button>

                    <button
                        type="button"
                        className="store_orders_btn secondary"
                        onClick={loadOrder}
                    >
                        Actualizar
                    </button>

                    <button
                        type="button"
                        className="store_orders_btn success"
                        onClick={openWhatsapp}
                    >
                        <FaWhatsapp />
                        <span>WhatsApp cliente</span>
                    </button>
                </div>
            </header>

            <section className="store_order_status_line">
                <div>
                    <small>Estado pedido</small>
                    <strong>{orderStatusLabels[order.order_status] || order.order_status}</strong>
                </div>
                <div>
                    <small>Pago</small>
                    <strong>{paymentStatusLabels[order.payment_status] || order.payment_status}</strong>
                </div>
                <div>
                    <small>Envío</small>
                    <strong>{shippingStatusLabels[order.shipping_status] || order.shipping_status || "Pendiente"}</strong>
                </div>
                <div>
                    <small>Método pago</small>
                    <strong>{order.payment_method || "-"}</strong>
                </div>
            </section>

            <nav className="store_order_tabs" aria-label="Secciones del pedido">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        className={activeTab === tab.key ? "active" : ""}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {activeTab === "summary" && (
                <main className="store_order_tab_panel">
                    <section className="store_order_summary_layout">

                        <div className="store_order_stack">
                            <section className="store_order_panel">
                                <div className="store_order_section_head compact">
                                    <h2>
                                        <FaBoxOpen />
                                        <span>Productos</span>
                                    </h2>
                                    <span>{items.length} producto(s)</span>
                                </div>

                                <div className="store_order_products_panel clean">
                                    {items.map(item => (
                                        <article
                                            key={item.id}
                                            className="store_order_product_row"
                                        >
                                            <div>
                                                <strong>{item.title}</strong>
                                                <small>
                                                    {item.variant_title ? `Variante: ${item.variant_title}` : "Sin variante"}
                                                    {item.sku ? ` · SKU: ${item.sku}` : ""}
                                                </small>
                                            </div>

                                            <span>{item.quantity} × {formatPrice(item.unit_price, currency)}</span>
                                            <strong>{formatPrice(item.total_price, currency)}</strong>
                                        </article>
                                    ))}

                                    {!items.length && (
                                        <div className="store_orders_empty_state">
                                            Este pedido no tiene productos.
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="store_order_panel">
                                <div className="store_order_section_head compact">
                                    <h2>
                                        <FaUser />
                                        <span>Cliente</span>
                                    </h2>
                                </div>

                                <div className="store_order_customer_panel">
                                    <div>
                                        <small>Nombre</small>
                                        <strong>{order.customer_name || "-"}</strong>
                                    </div>

                                    <div>
                                        <small>Teléfono</small>
                                        <strong>{order.customer_phone || "-"}</strong>
                                    </div>

                                    <div>
                                        <small>Email</small>
                                        <strong>{order.customer_email || "-"}</strong>
                                    </div>

                                    <div className="wide">
                                        <small>Dirección</small>
                                        <strong>{order.customer_address || "-"}</strong>
                                    </div>

                                    {order.notes && (
                                        <div className="wide">
                                            <small>Notas</small>
                                            <p>{order.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        <aside className="store_order_stack">
                            <section className="store_order_panel">
                                <div className="store_order_section_head compact">
                                    <h2>
                                        <FaMoneyBillWave />
                                        <span>Totales</span>
                                    </h2>
                                </div>

                                <div className="store_order_totals_panel clean">
                                    <div>
                                        <span>Subtotal</span>
                                        <strong>{formatPrice(order.subtotal, currency)}</strong>
                                    </div>

                                    <div>
                                        <span>Envío</span>
                                        <strong>{formatPrice(order.shipping_total, currency)}</strong>
                                    </div>

                                    {Number(order.discount_total || 0) > 0 && (
                                        <div>
                                            <span>Descuento</span>
                                            <strong>-{formatPrice(order.discount_total, currency)}</strong>
                                        </div>
                                    )}

                                    <div className="store_order_total_final">
                                        <span>Total</span>
                                        <strong>{formatPrice(order.total, currency)}</strong>
                                    </div>
                                </div>
                            </section>

                            <section className="store_order_delivery_panel clean">
                                <h3>
                                    <FaTruck />
                                    <span>Entrega</span>
                                </h3>

                                <dl>
                                    <div>
                                        <dt>Método</dt>
                                        <dd>{order.shipping_method_name || "A coordinar"}</dd>
                                    </div>

                                    <div>
                                        <dt>Transportista</dt>
                                        <dd>{carrierName}</dd>
                                    </div>

                                    <div>
                                        <dt>Servicio</dt>
                                        <dd>{serviceName}</dd>
                                    </div>

                                    {deliveryDays && (
                                        <div>
                                            <dt>Tiempo estimado</dt>
                                            <dd>{deliveryDays}</dd>
                                        </div>
                                    )}

                                    <div className="wide">
                                        <dt><FaMapMarkerAlt /> Destino</dt>
                                        <dd>{destinationLabel || "Sin dirección"}</dd>
                                    </div>
                                </dl>
                            </section>
                        </aside>
                    </section>
                </main>
            )}

            {activeTab === "logistics" && (
                <main className="store_order_tab_panel">
                    <section className="store_order_ops_layout">

                        <section className="store_order_management_panel clean">
                            <h2>
                                <FaClipboardList />
                                <span>Gestión comercial</span>
                            </h2>

                            <p className="store_order_panel_hint">
                                Cambios administrativos del pedido y del pago.
                            </p>

                            <label>
                                Estado pedido
                                <select
                                    value={managementData.order_status}
                                    disabled={saving}
                                    onChange={(e) =>
                                        setManagementData(prev => ({
                                            ...prev,
                                            order_status: e.target.value
                                        }))
                                    }
                                >
                                    {Object.entries(orderStatusLabels).map(([value, label]) => (
                                        <option
                                            key={value}
                                            value={value}
                                        >
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Estado pago
                                <select
                                    value={managementData.payment_status}
                                    disabled={saving}
                                    onChange={(e) =>
                                        setManagementData(prev => ({
                                            ...prev,
                                            payment_status: e.target.value
                                        }))
                                    }
                                >
                                    {Object.entries(paymentStatusLabels).map(([value, label]) => (
                                        <option
                                            key={value}
                                            value={value}
                                        >
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <button
                                type="button"
                                className="store_orders_btn primary full mt-4"
                                disabled={saving}
                                onClick={updateManagement}
                            >
                                Guardar gestión
                            </button>
                        </section>

                        <section className="store_order_management_panel clean featured">
                            <h2>
                                <FaTruck />
                                <span>Logística del envío</span>
                            </h2>

                            <p className="store_order_panel_hint">
                                Tracking, transportista, estado del envío y documentación.
                            </p>

                            <label>
                                Estado envío
                                <select
                                    value={order.shipping_status || "pending"}
                                    onChange={(e) =>
                                        setOrder(prev => ({
                                            ...prev,
                                            shipping_status: e.target.value
                                        }))
                                    }
                                >
                                    {Object.entries(shippingStatusLabels).map(([value, label]) => (
                                        <option
                                            key={value}
                                            value={value}
                                        >
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Transportista
                                <select
                                    value={order.carrier_id || ""}
                                    onChange={(e) => {
                                        const carrier =
                                            carriers.find(
                                                c =>
                                                    String(c.id) ===
                                                    String(e.target.value)
                                            );

                                        setOrder(prev => ({
                                            ...prev,
                                            carrier_id: e.target.value,
                                            carrier_name: carrier?.name || null
                                        }));
                                    }}
                                >
                                    <option value="">Sin transportista</option>
                                    {carriers.map(carrier => (
                                        <option
                                            key={carrier.id}
                                            value={carrier.id}
                                        >
                                            {carrier.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="store_order_form_grid two">
                                <label>
                                    Código tracking
                                    <input
                                        value={order.tracking_code || ""}
                                        onChange={(e) =>
                                            setOrder(prev => ({
                                                ...prev,
                                                tracking_code: e.target.value
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    URL tracking
                                    <input
                                        value={order.tracking_url || ""}
                                        onChange={(e) =>
                                            setOrder(prev => ({
                                                ...prev,
                                                tracking_url: e.target.value
                                            }))
                                        }
                                    />
                                </label>
                            </div>

                            <div className="store_order_action_grid">
                                {quote?.provider === "zipnova" && !order.tracking_code && !order.tracking_url && (
                                    <button
                                        type="button"
                                        className="store_orders_btn primary"
                                        disabled={creatingShipment}
                                        onClick={createShipment}
                                    >
                                        <FaTruck />
                                        {creatingShipment
                                            ? "Creando envío..."
                                            : "Crear envío Zipnova"}
                                    </button>
                                )}

                                {order.tracking_code && (
                                    <button
                                        type="button"
                                        className="store_orders_btn secondary"
                                        onClick={syncTracking}
                                    >
                                        <FaSyncAlt />
                                        Actualizar tracking
                                    </button>
                                )}

                                {order.tracking_code && (
                                    <button
                                        type="button"
                                        className="store_orders_btn secondary"
                                        onClick={downloadShippingLabel}
                                    >
                                        <FaReceipt />
                                        Descargar etiqueta
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="store_orders_btn primary"
                                    onClick={updateShipping}
                                >
                                    Guardar logística
                                </button>
                            </div>
                        </section>

                        <section className="store_order_management_panel clean">
                            <h2>
                                <FaBell />
                                <span>Notificaciones</span>
                            </h2>

                            <p className="store_order_panel_hint">
                                Reenvío manual de comunicaciones al cliente.
                            </p>

                            <div className="store_order_notification_actions">
                                <button
                                    type="button"
                                    className="store_orders_btn secondary full"
                                    onClick={() => resendEmail("order_created")}
                                >
                                    Reenviar confirmación de pedido
                                </button>

                                <button
                                    type="button"
                                    className="store_orders_btn secondary full"
                                    onClick={() => resendEmail("payment_paid")}
                                >
                                    Reenviar pago confirmado
                                </button>

                                <button
                                    type="button"
                                    className="store_orders_btn secondary full"
                                    onClick={() => resendEmail("order_shipped")}
                                >
                                    Reenviar email de envío
                                </button>
                            </div>
                        </section>

                        {quote && (
                            <section className="store_order_quote_panel clean">
                                <h2>
                                    <FaTruck />
                                    <span>Cotización guardada</span>
                                </h2>
                                <p>{carrierName}</p>
                                <strong>{serviceName}</strong>
                                <small>{formatPrice(quote.price || order.shipping_total, currency)}</small>
                            </section>
                        )}
                    </section>
                </main>
            )}

            {activeTab === "activity" && (
                <main className="store_order_tab_panel">
                    <StoreOrderActivity activity={activity} />
                </main>
            )}

        </div>
    );
}
