"use client";

// =====================================
// Archivo:
// /app/modules/resto/components/blocks/RestoOrderStatusBlock.jsx
//
// Descripción:
// Estado público del pedido activo
// de Tags Resto.
//
// Muestra número de pedido, estado,
// progreso, cantidad de productos,
// total y tiempo estimado.
//
// No consulta APIs. Utiliza únicamente
// los datos disponibles en
// entity.resto_session.
//
// Contexto:
// resto
// =====================================
import "../../styles/resto-public.css"

const ORDER_STEPS = [
    {
        key: "sent",
        label: "Enviado"
    },
    {
        key: "confirmed",
        label: "Confirmado"
    },
    {
        key: "preparing",
        label: "Preparando"
    },
    {
        key: "ready",
        label: "Listo"
    },
    {
        key: "delivered",
        label: "Entregado"
    }
];

const STATUS_ALIASES = {

    pending:
        "sent",

    new:
        "sent",

    submitted:
        "sent",

    sent:
        "sent",

    accepted:
        "confirmed",

    confirmed:
        "confirmed",

    preparing:
        "preparing",

    preparation:
        "preparing",

    ready:
        "ready",

    completed:
        "delivered",

    served:
        "delivered",

    delivered:
        "delivered"

};

function normalizeStatus(
    value
) {

    const status =
        String(
            value || ""
        )
            .trim()
            .toLowerCase();

    return (
        STATUS_ALIASES[status] ||
        status
    );

}

function getStatusLabel(
    status,
    fallback
) {

    const step =
        ORDER_STEPS.find(
            item =>
                item.key === status
        );

    return (
        fallback ||
        step?.label ||
        "Pedido activo"
    );

}

function formatCurrency(
    value,
    currency = "ARS"
) {

    const amount =
        Number(
            value || 0
        );

    try {

        return new Intl.NumberFormat(
            "es-AR",
            {
                style:
                    "currency",

                currency,

                maximumFractionDigits:
                    2
            }
        ).format(
            amount
        );

    }
    catch {

        return `$${amount.toLocaleString(
            "es-AR"
        )}`;

    }

}

export default function RestoOrderStatusBlock({
    entity,
    content = {},
    styles = {}
}) {

    const session =
        entity?.resto_session ||
        null;

    const order =
        session?.current_order ||
        session?.order ||
        entity?.resto_order ||
        null;

    if (
        !session ||
        !order
    ) {
        return null;
    }

    const rawStatus =
        order?.status ||
        order?.order_status ||
        session?.order_status ||
        session?.status ||
        "";

    const status =
        normalizeStatus(
            rawStatus
        );

    const activeStepIndex =
        ORDER_STEPS.findIndex(
            step =>
                step.key === status
        );

    const orderNumber =
        order?.order_number ||
        order?.number ||
        order?.id ||
        "";

    const statusLabel =
        getStatusLabel(
            status,
            order?.status_label ||
            session?.status_label
        );

    const estimatedMinutes =
        order?.estimated_minutes ??
        order?.preparation_minutes ??
        session?.estimated_minutes ??
        null;

    const items =
        Array.isArray(
            order?.items
        )
            ? order.items
            : [];

    const itemsCount =
        Number(
            order?.items_count ??
            order?.quantity ??
            items.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item?.quantity ||
                        0
                    ),
                0
            )
        );

    const total =
        order?.total ??
        order?.total_amount ??
        0;

    const currency =
        order?.currency ||
        entity?.currency ||
        "ARS";

    const title =
        content?.title ||
        "Tu pedido";

    const showOrderNumber =
        content?.showOrderNumber !==
        false;

    const showPreparationStatus =
        content?.showPreparationStatus !==
        false;

    const showEstimatedTime =
        content?.showEstimatedTime !==
        false;

    const showItemsCount =
        content?.showItemsCount !==
        false;

    const showTotal =
        content?.showTotal !==
        false;

    const showProgress =
        content?.showProgress !==
        false;

    const sectionStyle = {
        backgroundColor: styles?.backgroundColor || styles?.background || undefined,
        color: styles?.textColor || styles?.color || undefined,
        borderColor: styles?.borderColor || undefined,
        padding: styles?.padding || undefined,
        marginTop: styles?.marginTop || undefined,
        marginBottom: styles?.marginBottom || undefined
    };

    return (
        <section
            className="resto_order_status"
            style={sectionStyle}
        >
            <div className="container">

                <div className="resto_order_status_card">

                    <div className="resto_order_status_header">

                        <div className="resto_order_status_heading">

                            <h2 className="resto_order_status_title">
                                {title}
                            </h2>

                            {showOrderNumber &&
                                orderNumber && (

                                <span className="resto_order_status_number">
                                    Pedido #{orderNumber}
                                </span>

                            )}

                        </div>

                        {showPreparationStatus && (

                            <span
                                className={
                                    [
                                        "resto_order_status_badge",
                                        status
                                            ? `is_${status}`
                                            : ""
                                    ]
                                        .filter(Boolean)
                                        .join(" ")
                                }
                            >
                                {statusLabel}
                            </span>

                        )}

                    </div>

                    {showProgress && (

                        <div className="resto_order_status_progress">

                            <div className="resto_order_status_progress_line">

                                {ORDER_STEPS.map(
                                    (
                                        step,
                                        index
                                    ) => {

                                        const isCompleted =
                                            activeStepIndex >=
                                            index;

                                        const isCurrent =
                                            activeStepIndex ===
                                            index;

                                        return (

                                            <div
                                                key={
                                                    step.key
                                                }
                                                className={
                                                    [
                                                        "resto_order_status_step",
                                                        isCompleted
                                                            ? "is_completed"
                                                            : "",
                                                        isCurrent
                                                            ? "is_current"
                                                            : ""
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" ")
                                                }
                                            >
                                                <span className="resto_order_status_step_dot" />

                                                <span className="resto_order_status_step_label">
                                                    {
                                                        step.label
                                                    }
                                                </span>
                                            </div>

                                        );

                                    }
                                )}

                            </div>

                        </div>

                    )}

                    <div className="resto_order_status_details">

                        {showEstimatedTime &&
                            estimatedMinutes !==
                                null && (

                            <div className="resto_order_status_detail">

                                <span className="resto_order_status_detail_label">
                                    Tiempo estimado
                                </span>

                                <strong className="resto_order_status_detail_value">
                                    {
                                        estimatedMinutes
                                    }{" "}
                                    min
                                </strong>

                            </div>

                        )}

                        {showItemsCount && (

                            <div className="resto_order_status_detail">

                                <span className="resto_order_status_detail_label">
                                    Productos
                                </span>

                                <strong className="resto_order_status_detail_value">
                                    {itemsCount}
                                </strong>

                            </div>

                        )}

                        {showTotal && (

                            <div className="resto_order_status_detail">

                                <span className="resto_order_status_detail_label">
                                    Total
                                </span>

                                <strong className="resto_order_status_detail_value">
                                    {
                                        formatCurrency(
                                            total,
                                            currency
                                        )
                                    }
                                </strong>

                            </div>

                        )}

                    </div>

                </div>

            </div>
        </section>
    );

}
