// =====================================
// FILE: /app/modules/resto/components/admin/orders/RestoOrderCard.jsx
// Descripción:
// Tarjeta operativa reutilizable de pedidos de Tags Resto.
// Presenta mesa, cliente, tiempos, alertas, estado,
// importe y acciones administrativas del pedido.
// =====================================

"use client";

import {
    FaBell,
    FaCashRegister,
    FaCheck,
    FaClock,
    FaEye,
    FaFire,
    FaPen,
    FaReceipt,
    FaShoppingBag,
    FaUser,
    FaUtensils
} from "react-icons/fa";

import {
    formatRestoOrderDate,
    formatRestoOrderPrice,
    getRestoBillRequestTime,
    getRestoOrderElapsedTime,
    getRestoOrderItemsCount,
    getRestoOrderLocationName,
    getRestoOrderServiceModeLabel,
    getRestoStaffRequestTime,
    hasRestoBillRequest,
    hasRestoStaffRequest
} from "@/app/modules/resto/lib/restoOrderHelpers";

const orderStatusLabels = {
    new:
        "Nuevo",

    confirmed:
        "Confirmado",

    preparing:
        "En cocina",

    ready:
        "Listo para entregar",

    shipped:
        "Entregado",

    completed:
        "Cerrado",

    cancelled:
        "Cancelado"
};

const paymentStatusLabels = {
    pending:
        "Pago pendiente",

    paid:
        "Pagado",

    cancelled:
        "Pago cancelado",

    refunded:
        "Reintegrado"
};

function OrderStatusIcon({
    status
}) {

    if (
        status ===
        "preparing"
    ) {

        return (
            <FaFire />
        );

    }

    if (
        status ===
        "ready" ||
        status ===
        "shipped" ||
        status ===
        "completed"
    ) {

        return (
            <FaCheck />
        );

    }

    return (
        <FaUtensils />
    );

}

export default function RestoOrderCard({
    order,
    store,
    updating,
    onOpenOrder,
    onEditOrder,
    onUpdateStatus,
    onMarkAsPaid
}) {

    const locationName =
        getRestoOrderLocationName(
            order
        );

    const serviceModeLabel =
        getRestoOrderServiceModeLabel(
            order
        );

    const itemsCount =
        getRestoOrderItemsCount(
            order
        );

    const billRequested =
        hasRestoBillRequest(
            order
        );

    const staffRequested =
        hasRestoStaffRequest(
            order
        );

    const billRequestTime =
        getRestoBillRequestTime(
            order
        );

    const staffRequestTime =
        getRestoStaffRequestTime(
            order
        );

    const isClosed =
        [
            "completed",
            "cancelled"
        ].includes(
            order?.order_status
        );

    const canSendToKitchen =
        [
            "new",
            "confirmed"
        ].includes(
            order?.order_status
        );

    const canMarkReady =
        order?.order_status ===
        "preparing";

    const canDeliver =
        order?.order_status ===
        "ready";

    const canCharge =
        !isClosed &&
        order?.payment_status !==
        "paid";

    const canClose =
        !isClosed;

    const cardClassName = [
        "tags_resto_order_card",

        billRequested
            ? "tags_resto_order_card_bill_requested"
            : "",

        staffRequested
            ? "tags_resto_order_card_staff_requested"
            : "",

        order?.order_status ===
        "ready"
            ? "tags_resto_order_card_ready"
            : ""
    ]
        .filter(
            Boolean
        )
        .join(
            " "
        );

    return (
        <article className={cardClassName}>

            <header className="tags_resto_order_card_header">

                <div className="tags_resto_order_card_identity">

                    <div className="tags_resto_order_card_main_icon">

                        <FaUtensils />

                    </div>

                    <div className="tags_resto_order_card_identity_content">

                        <span className="tags_resto_order_card_location_label">

                            {
                                locationName
                                    ? "Ubicación"
                                    : "Modalidad"
                            }

                        </span>

                        <h2 className="tags_resto_order_card_location">

                            {
                                locationName ||
                                serviceModeLabel
                            }

                        </h2>

                        {
                            locationName && (

                                <span className="tags_resto_order_card_service_mode">

                                    {serviceModeLabel}

                                </span>

                            )
                        }

                    </div>

                </div>

                <div
                    className={
                        `tags_resto_order_status ` +
                        `tags_resto_order_status_${order?.order_status || "new"}`
                    }
                >

                    <OrderStatusIcon
                        status={
                            order?.order_status
                        }
                    />

                    <span>

                        {
                            orderStatusLabels[
                                order?.order_status
                            ] ||
                            "Nuevo"
                        }

                    </span>

                </div>

            </header>

            <div className="tags_resto_order_card_number">

                <span>

                    Pedido

                </span>

                <strong>

                    {
                        order?.order_number ||
                        `#${order?.id}`
                    }

                </strong>

            </div>

            <div className="tags_resto_order_card_summary">

                <div className="tags_resto_order_card_summary_item">

                    <div className="tags_resto_order_card_summary_icon">

                        <FaUser />

                    </div>

                    <div>

                        <span className="tags_resto_order_card_summary_label">

                            Cliente

                        </span>

                        <strong>

                            {
                                order?.customer_name ||
                                "Cliente sin nombre"
                            }

                        </strong>

                    </div>

                </div>

                <div className="tags_resto_order_card_summary_item">

                    <div className="tags_resto_order_card_summary_icon">

                        <FaShoppingBag />

                    </div>

                    <div>

                        <span className="tags_resto_order_card_summary_label">

                            Productos

                        </span>

                        <strong>

                            {
                                itemsCount ===
                                1
                                    ? "1 producto"
                                    : `${itemsCount} productos`
                            }

                        </strong>

                    </div>

                </div>

                <div className="tags_resto_order_card_summary_item">

                    <div className="tags_resto_order_card_summary_icon">

                        <FaClock />

                    </div>

                    <div>

                        <span className="tags_resto_order_card_summary_label">

                            Tiempo

                        </span>

                        <strong>

                            {
                                getRestoOrderElapsedTime(
                                    order?.created_at
                                )
                            }

                        </strong>

                    </div>

                </div>

            </div>

            <div className="tags_resto_order_card_total">

                <span>

                    Total

                </span>

                <strong>

                    {
                        formatRestoOrderPrice(
                            order?.total,
                            store?.currency ||
                            "ARS"
                        )
                    }

                </strong>

            </div>

            <div className="tags_resto_order_card_badges">

                {
                    billRequested && (

                        <div className="tags_resto_order_alert tags_resto_order_alert_bill">

                            <div className="tags_resto_order_alert_icon">

                                <FaReceipt />

                            </div>

                            <div className="tags_resto_order_alert_content">

                                <strong>

                                    Cuenta solicitada

                                </strong>

                                {
                                    billRequestTime && (

                                        <span>

                                            {
                                                formatRestoOrderDate(
                                                    billRequestTime,
                                                    {
                                                        timeOnly:
                                                            true
                                                    }
                                                )
                                            }

                                        </span>

                                    )
                                }

                            </div>

                        </div>

                    )
                }

                {
                    staffRequested && (

                        <div className="tags_resto_order_alert tags_resto_order_alert_staff">

                            <div className="tags_resto_order_alert_icon">

                                <FaBell />

                            </div>

                            <div className="tags_resto_order_alert_content">

                                <strong>

                                    Solicitud de atención

                                </strong>

                                {
                                    staffRequestTime && (

                                        <span>

                                            {
                                                formatRestoOrderDate(
                                                    staffRequestTime,
                                                    {
                                                        timeOnly:
                                                            true
                                                    }
                                                )
                                            }

                                        </span>

                                    )
                                }

                            </div>

                        </div>

                    )
                }

                {
                    order?.order_status ===
                    "preparing" && (

                        <div className="tags_resto_order_chip tags_resto_order_chip_kitchen">

                            <FaFire />

                            <span>

                                En cocina

                            </span>

                        </div>

                    )
                }

                {
                    order?.order_status ===
                    "ready" && (

                        <div className="tags_resto_order_chip tags_resto_order_chip_ready">

                            <FaCheck />

                            <span>

                                Listo para entregar

                            </span>

                        </div>

                    )
                }

                <div
                    className={
                        `tags_resto_order_chip ` +
                        `tags_resto_order_chip_payment_${order?.payment_status || "pending"}`
                    }
                >

                    <FaCashRegister />

                    <span>

                        {
                            paymentStatusLabels[
                                order?.payment_status
                            ] ||
                            "Pago pendiente"
                        }

                    </span>

                </div>

            </div>

            {
                order?.notes && (

                    <div className="tags_resto_order_card_notes">

                        <strong>

                            Observaciones

                        </strong>

                        <p>

                            {order.notes}

                        </p>

                    </div>

                )
            }

            <footer className="tags_resto_order_card_footer">

                <div className="tags_resto_order_card_primary_actions">

                    <button
                        type="button"
                        className="tags_resto_order_action tags_resto_order_action_primary"
                        disabled={updating}
                        onClick={
                            () =>
                                onOpenOrder(
                                    order
                                )
                        }
                    >

                        <FaEye />

                        <span>

                            Ver pedido

                        </span>

                    </button>

                    <button
                        type="button"
                        className="tags_resto_order_action tags_resto_order_action_secondary"
                        disabled={updating}
                        onClick={
                            () =>
                                onEditOrder(
                                    order
                                )
                        }
                    >

                        <FaPen />

                        <span>

                            Editar

                        </span>

                    </button>

                </div>

                <div className="tags_resto_order_card_operational_actions">

                    {
                        canSendToKitchen && (

                            <button
                                type="button"
                                className="tags_resto_order_action tags_resto_order_action_kitchen"
                                disabled={updating}
                                onClick={
                                    () =>
                                        onUpdateStatus(
                                            order,
                                            "preparing"
                                        )
                                }
                            >

                                <FaFire />

                                <span>

                                    Enviar a cocina

                                </span>

                            </button>

                        )
                    }

                    {
                        canMarkReady && (

                            <button
                                type="button"
                                className="tags_resto_order_action tags_resto_order_action_ready"
                                disabled={updating}
                                onClick={
                                    () =>
                                        onUpdateStatus(
                                            order,
                                            "ready"
                                        )
                                }
                            >

                                <FaCheck />

                                <span>

                                    Marcar listo

                                </span>

                            </button>

                        )
                    }

                    {
                        canDeliver && (

                            <button
                                type="button"
                                className="tags_resto_order_action tags_resto_order_action_delivery"
                                disabled={updating}
                                onClick={
                                    () =>
                                        onUpdateStatus(
                                            order,
                                            "shipped"
                                        )
                                }
                            >

                                <FaUtensils />

                                <span>

                                    Entregar

                                </span>

                            </button>

                        )
                    }

                    {
                        canCharge && (

                            <button
                                type="button"
                                className="tags_resto_order_action tags_resto_order_action_payment"
                                disabled={updating}
                                onClick={
                                    () =>
                                        onMarkAsPaid(
                                            order
                                        )
                                }
                            >

                                <FaCashRegister />

                                <span>

                                    Cobrar

                                </span>

                            </button>

                        )
                    }

                    {
                        canClose && (

                            <button
                                type="button"
                                className="tags_resto_order_action tags_resto_order_action_close"
                                disabled={updating}
                                onClick={
                                    () =>
                                        onUpdateStatus(
                                            order,
                                            "completed"
                                        )
                                }
                            >

                                <FaReceipt />

                                <span>

                                    Cerrar

                                </span>

                            </button>

                        )
                    }

                </div>

                <div className="tags_resto_order_card_created">

                    <FaClock />

                    <span>

                        Creado{" "}

                        {
                            formatRestoOrderDate(
                                order?.created_at
                            )
                        }

                    </span>

                </div>

            </footer>

        </article>
    );

}