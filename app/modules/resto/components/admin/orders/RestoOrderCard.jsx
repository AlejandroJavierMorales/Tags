// =====================================
// FILE: /app/modules/resto/components/admin/orders/RestoOrderCard.jsx
// Descripción:
// Tarjeta operativa reutilizable de pedidos de Tags Resto.
// Presenta mesa, cliente, tiempos, alertas, estado,
// progreso de cocina, importe y acciones administrativas.
// =====================================

"use client";

import {
    FaBell,
    FaCashRegister,
    FaCheck,
    FaComments,
    FaClock,
    FaEye,
    FaFire,
    FaPen,
    FaPrint,
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
} from "@/app/modules/resto/lib/orders";

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

function safeNumber(
    value
) {

    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : 0;

}

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
    onSendToKitchen,
    onMarkAsPaid,
    onConfirmSession,
    onResolveServiceRequest,
    onPrintBill,
    capabilities = {}
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
        ) ||
        [
            "closed",
            "cancelled"
        ].includes(
            order?.session_status
        );

    const pendingKitchenItems =
        Array.isArray(
            order?.items
        )
            ? order.items.filter(
                item =>
                    Number(
                        item?.requires_preparation
                    ) === 1 &&
                    item?.preparation_status ===
                    "pending"
            )
            : [];

    const pendingKitchenCount =
        pendingKitchenItems.reduce(
            (
                total,
                item
            ) =>
                total +
                safeNumber(
                    item?.quantity
                ),
            0
        );

    const canActuallySendToKitchen =
        !isClosed &&
        order?.session_status !==
            "pending_activation" &&
        order?.session_status !==
            "pending_confirmation" &&
        pendingKitchenItems.length > 0;

    const needsConfirmation =
        order?.session_status ===
            "pending_activation" ||
        order?.session_status ===
            "pending_confirmation";

    const canDeliver =
        order?.order_status ===
        "ready";

    const canCharge =
        !isClosed &&
        order?.payment_status !==
        "paid";

    const hasBlockingItems =
        (
            Array.isArray(
                order?.items
            )
                ? order.items
                : []
        ).some(
            item =>
                [
                    "pending",
                    "sent",
                    "ready"
                ].includes(
                    item?.preparation_status
                )
        );

    const canClose =
        !isClosed &&
        safeNumber(
            order?.pending_amount
        ) <= 0 &&
        !hasBlockingItems &&
        !order?.bill_requested &&
        !order?.staff_requested;

    const kitchen =
        order?.kitchen || {};

    const kitchenTotalItems =
        Math.max(
            0,
            safeNumber(
                kitchen.total
            ) -
            safeNumber(
                kitchen.cancelled
            )
        );

    const kitchenReadyItems =
        Math.min(
            kitchenTotalItems,
            safeNumber(
                kitchen.ready
            ) +
            safeNumber(
                kitchen.served
            )
        );

    const kitchenPendingItems =
        Math.max(
            0,
            safeNumber(
                kitchen.pending
            ) +
            safeNumber(
                kitchen.sent
            )
        );

    const kitchenProgress =
        kitchenTotalItems > 0
            ? Math.min(
                100,
                Math.max(
                    0,
                    Math.round(
                        (
                            kitchenReadyItems /
                            kitchenTotalItems
                        ) * 100
                    )
                )
            )
            : 0;

    const hasKitchenItems =
        kitchenTotalItems > 0;

    const showKitchenProgress =
        hasKitchenItems &&
        [
            "preparing",
            "ready",
            "shipped"
        ].includes(
            order?.order_status
        );

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

                    <div className="tags_resto_order_card_summary_content">

                        <span className="tags_resto_order_card_summary_label">

                            Pedido

                        </span>

                        <strong>

                            {
                                itemsCount === 1
                                    ? "1 producto"
                                    : `${itemsCount} productos`
                            }

                        </strong>

                        {
                            hasKitchenItems && (

                                <span className="tags_resto_order_card_summary_detail">

                                    {
                                        kitchenTotalItems === 1
                                            ? "1 plato pasa por cocina"
                                            : `${kitchenTotalItems} platos pasan por cocina`
                                    }

                                </span>

                            )
                        }

                        {
                            order?.products_text && (

                                <span className="tags_resto_order_card_summary_detail">
                                    {order.products_text}
                                </span>

                            )
                        }

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

            {
                showKitchenProgress && (

                    <div className="tags_resto_order_kitchen_progress">

                        <div className="tags_resto_order_kitchen_progress_header">

                            <div className="tags_resto_order_kitchen_progress_title">

                                {
                                    order?.order_status ===
                                    "ready"

                                        ? <FaCheck />

                                        : <FaFire />
                                }

                                <span>

                                    {
                                        order?.order_status ===
                                        "ready"

                                            ? "Pedido preparado"

                                            : "Preparación en cocina"
                                    }

                                </span>

                            </div>

                            <strong className="tags_resto_order_kitchen_progress_count">

                                {kitchenReadyItems} / {kitchenTotalItems} preparados

                            </strong>

                        </div>

                        <div
                            className="tags_resto_order_kitchen_progress_track"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={kitchenProgress}
                            aria-label="Progreso de preparación del pedido"
                        >

                            <div
                                className="tags_resto_order_kitchen_progress_bar"
                                style={{
                                    width:
                                        `${kitchenProgress}%`
                                }}
                            />

                        </div>

                        <div className="tags_resto_order_kitchen_progress_footer">

                            <span>

                                {kitchenProgress}% preparado

                            </span>

                            {
                                order?.order_status ===
                                "preparing" &&
                                kitchenPendingItems > 0 && (

                                    <span>

                                        {
                                            kitchenPendingItems === 1
                                                ? "1 plato pendiente"
                                                : `${kitchenPendingItems} platos pendientes`
                                        }

                                    </span>

                                )
                            }

                            {
                                order?.order_status ===
                                "ready" && (

                                    <span>

                                        Listo para entregar

                                    </span>

                                )
                            }

                        </div>

                    </div>

                )
            }

            <div className="tags_resto_order_card_total">

                <span>

                    Total

                </span>

                <strong>

                    {
                        formatRestoOrderPrice(
                            order?.total,
                            store?.currency || "ARS"
                        )
                    }

                </strong>

            </div>

            <div className="tags_resto_order_card_badges">

                {
                    Number(order?.message_count || 0) > 0 && (

                        <div className={
                            `tags_resto_order_alert tags_resto_order_alert_messages ` +
                            (
                                Number(order?.unread_message_count || 0) > 0
                                    ? "tags_resto_order_alert_messages_unread"
                                    : ""
                            )
                        }>

                            <div className="tags_resto_order_alert_icon">
                                <FaComments />
                            </div>

                            <div className="tags_resto_order_alert_content">
                                <strong>
                                    {
                                        Number(order?.unread_message_count || 0) > 0
                                            ? `${order.unread_message_count} mensaje${Number(order.unread_message_count) === 1 ? "" : "s"} nuevo${Number(order.unread_message_count) === 1 ? "" : "s"}`
                                            : order?.has_unanswered_messages
                                                ? "Mensaje sin responder"
                                                : "Conversación activa"
                                    }
                                </strong>

                                {
                                    order?.last_message_preview && (
                                        <span>
                                            {String(order.last_message_preview).slice(0, 80)}
                                        </span>
                                    )
                                }
                            </div>

                        </div>

                    )
                }

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
                                                        timeOnly: true
                                                    }
                                                )
                                            }

                                        </span>

                                    )
                                }

                                {
                                    capabilities.resolveService &&
                                    onResolveServiceRequest && (
                                        <button
                                            type="button"
                                            className="tags_resto_order_alert_action"
                                            disabled={updating}
                                            onClick={() =>
                                                onResolveServiceRequest(
                                                    order,
                                                    "resolve_bill"
                                                )
                                            }
                                        >
                                            Marcar atendida
                                        </button>
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
                                                        timeOnly: true
                                                    }
                                                )
                                            }

                                        </span>

                                    )
                                }

                                {
                                    capabilities.resolveService &&
                                    onResolveServiceRequest && (
                                        <button
                                            type="button"
                                            className="tags_resto_order_alert_action"
                                            disabled={updating}
                                            onClick={() =>
                                                onResolveServiceRequest(
                                                    order,
                                                    "resolve_call"
                                                )
                                            }
                                        >
                                            Marcar atendido
                                        </button>
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

                                {
                                    hasKitchenItems
                                        ? `${kitchenReadyItems} / ${kitchenTotalItems} preparados`
                                        : "En cocina"
                                }

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

                    {capabilities.view !== false && <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_primary"
                        disabled={updating}
                        onClick={() =>
                            onOpenOrder(
                                order
                            )
                        }
                    >

                        <FaEye />

                        <span>

                            Ver detalle

                        </span>

                    </button>}

                    {
                        capabilities.view !== false &&
                        onPrintBill && (
                            <button
                                type="button"
                                className="tags_resto_btn tags_resto_btn_secondary"
                                disabled={updating}
                                onClick={() =>
                                    onPrintBill(
                                        order
                                    )
                                }
                            >
                                <FaPrint />
                                <span>
                                    Imprimir cuenta
                                </span>
                            </button>
                        )
                    }

                    {
                        capabilities.edit !== false &&
                        !isClosed &&
                        order?.payment_status !==
                            "paid" && <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_secondary"
                        disabled={updating}
                        onClick={() =>
                            onEditOrder(
                                order
                            )
                        }
                    >

                        <FaPen />

                        <span>

                            Editar pedido

                        </span>

                    </button>
                    }

                </div>

                <div className="tags_resto_order_card_operational_actions">

                    {
                        needsConfirmation &&
                        capabilities.confirm !== false && (

                            <button
                                type="button"
                                className={[
                                    "tags_resto_btn",
                                    order.session_status ===
                                        "pending_confirmation"
                                        ? "tags_resto_btn_danger"
                                        : "tags_resto_btn_success"
                                ].join(" ")}
                                disabled={updating}
                                onClick={() =>
                                    onConfirmSession(
                                        order
                                    )
                                }
                            >
                                <FaCheck />

                                <span>
                                    {
                                        order.session_status ===
                                            "pending_activation"
                                            ? "Habilitar atención"
                                            : "Confirmar pedido"
                                    }
                                </span>
                            </button>

                        )
                    }

                    {
                        canActuallySendToKitchen &&
                        capabilities.sendToKitchen !== false && (

                            <button
                                type="button"
                                className="tags_resto_btn tags_resto_btn_warning"
                                disabled={updating}
                                onClick={() =>
                                    onSendToKitchen(
                                        order
                                    )
                                }
                            >

                                <FaFire />

                                <span className="tags_resto_order_send_kitchen_label">

                                    <strong>

                                        Enviar a Cocina

                                    </strong>

                                    <small>

                                        {
                                            pendingKitchenCount === 1
                                                ? "1 plato"
                                                : `${pendingKitchenCount} platos`
                                        }

                                    </small>

                                </span>

                            </button>

                        )
                    }

                    {
                        canDeliver &&
                        capabilities.deliver !== false && (

                            <button
                                type="button"
                                className="tags_resto_btn tags_resto_btn_primary"
                                disabled={updating}
                                onClick={() =>
                                    onUpdateStatus(
                                        order,
                                        "shipped"
                                    )
                                }
                            >

                                <FaUtensils />

                                <span>

                                    Entregar pedido

                                </span>

                            </button>

                        )
                    }

                    {
                        canCharge &&
                        capabilities.charge !== false && (

                            <button
                                type="button"
                                className="tags_resto_btn tags_resto_btn_success"
                                disabled={updating}
                                onClick={() =>
                                    onMarkAsPaid(
                                        order
                                    )
                                }
                            >

                                <FaCashRegister />

                                <span>

                                    Registrar cobro

                                </span>

                            </button>

                        )
                    }

                    {
                        canClose &&
                        capabilities.close !== false && (

                            <button
                                type="button"
                                className="tags_resto_btn tags_resto_btn_secondary"
                                disabled={updating}
                                onClick={() =>
                                    onUpdateStatus(
                                        order,
                                        "completed"
                                    )
                                }
                            >

                                <FaCheck />

                                <span>

                                    Cerrar pedido

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
