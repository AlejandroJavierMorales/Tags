// =====================================
// File: app/modules/store/components/admin/StoreOrderActivity.jsx
// Descripción: Historial visual de actividad de un pedido.
// =====================================

import {
    FaBoxOpen,
    FaTruck,
    FaCodeBranch,
    FaStar,
    FaBoxes,
    FaCreditCard,
    FaClipboardList
} from "react-icons/fa";

import "../../styles/store-public.css"
const sourceLabels = {
    zipnova: "Zipnova",
    "Webhook zipnova": "Webhook Zipnova",
    Tienda: "Tienda",
    Pago: "Pago",
    Stock: "Stock",
    Reviews: "Tags Reviews",
    Simulación: "Simulación"
};

const eventLabels = {
    "Pedido creado": "Pedido creado",
    shipped: "Despachado",
    in_transit: "En tránsito",
    delivered: "Entregado",
    cancelled: "Cancelado",
    ready: "Listo para despacho",
    label_available: "Etiqueta disponible",
    shipment_created: "Envío generado",
    "Review programada": "Review programada"
};

const statusLabels = {
    completed: "Completado",
    processed: "Procesado",
    shipped: "Despachado",
    in_transit: "En tránsito",
    delivered: "Entregado",
    cancelled: "Cancelado",
    pending: "Pendiente",
    ok: "OK",
    error: "Error",
    ignored: "Ignorado"
};

function formatActivityDate(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getActivityIcon(type) {
    const icons = {
        order: <FaClipboardList />,
        payment: <FaCreditCard />,
        shipping_event: <FaTruck />,
        webhook: <FaCodeBranch />,
        stock: <FaBoxes />,
        review: <FaStar />
    };

    return icons[type] || <FaBoxOpen />;
}

function getStatusClass(status) {
    if (["processed", "ok", "paid", "completed", "delivered", "shipped", "in_transit"].includes(status)) {
        return "success";
    }

    if (["error", "cancelled"].includes(status)) {
        return "danger";
    }

    if (["ignored", "duplicate", "pending"].includes(status)) {
        return "warning";
    }

    return "neutral";
}

export default function StoreOrderActivity({ activity = [] }) {
    return (
        <section className="store_order_activity_box">
            <div className="store_order_section_head">
                <h2>
                    <FaClipboardList />
                    <span>Actividad del pedido</span>
                </h2>

                <span>{activity.length} movimiento(s)</span>
            </div>

            <div className="store_order_activity_list">
                {activity.map((item, index) => (
                    <article
                        key={`${item.type}-${item.event}-${index}`}
                        className="store_order_activity_card"
                    >
                        <div className={`store_order_activity_badge ${getStatusClass(item.status)}`}>
                            {getActivityIcon(item.type)}
                        </div>

                        <div className="store_order_activity_col date">
                            <small>Fecha</small>
                            <strong>{formatActivityDate(item.created_at)}</strong>
                        </div>

                        <div className="store_order_activity_col">
                            <small>Origen</small>
                            <strong>{sourceLabels[item.source] || item.source || "-"}</strong>
                        </div>

                        <div className="store_order_activity_col">
                            <small>Evento</small>
                            <strong>{eventLabels[item.event] || item.event || "-"}</strong>
                        </div>

                        <div className="store_order_activity_col">
                            <small>Estado</small>
                            <span className={`store_order_activity_pill ${getStatusClass(item.status)}`}>
                                {statusLabels[item.status] || item.status || "-"}
                            </span>
                        </div>

                        <div className="store_order_activity_col detail">
                            <small>Detalle</small>
                            <strong>{item.detail || "-"}</strong>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}