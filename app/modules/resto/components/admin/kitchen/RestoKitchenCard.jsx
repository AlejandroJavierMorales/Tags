// =====================================
// FILE: /app/modules/resto/components/admin/kitchen/RestoKitchenCard.jsx
// Descripción:
// Tarjeta operativa del Kitchen Display System.
// Presenta el pedido, ubicación, tiempo en cocina,
// productos pendientes y acciones de preparación.
// =====================================

"use client";


import {
    FaCheck,
    FaClock,
    FaCommentDots,
    FaFire,
    FaShoppingBag,
    FaUsers
} from "react-icons/fa";



export default function RestoKitchenCard({
    order,
    kitchenSettings = {},
    updatingItemId = null,
    onMarkReady,
    canMarkReady = true
}) {


    const warningMinutes =
        Number(
            kitchenSettings
                ?.warningMinutes
        ) || 10;

    const urgentMinutes =
        Number(
            kitchenSettings
                ?.urgentMinutes
        ) || 20;

    const cardHeight =
        Number(
            kitchenSettings
                ?.cardHeight
        ) || 620;

    const pendingItems =
        Array.isArray(order?.items)
            ? order.items.filter(
                item =>
                    Number(
                        item?.requires_preparation ||
                        0
                    ) === 1 &&
                    item?.preparation_status ===
                    "sent"
            )
            : [];

    const preparationStartedAt =

        pendingItems.length

            ? Math.min(

                ...pendingItems.map(
                    item =>
                        new Date(
                            item.preparation_sent_at
                        ).getTime()
                )

            )

            : null;

    const minutesAgo =
        Number.isFinite(
            preparationStartedAt
        )
            ? Math.max(
                0,
                Math.floor(
                    (
                        Date.now() -
                        preparationStartedAt
                    ) / 60000
                )
            )
            : 0;

    const totalPendingQuantity =
        pendingItems.reduce(
            (total, item) =>
                total +
                Number(
                    item?.quantity ||
                    0
                ),
            0
        );

    const urgencyClass =
        minutesAgo >= urgentMinutes
            ? "tags_resto_kitchen_card_urgent"
            : minutesAgo >= warningMinutes
                ? "tags_resto_kitchen_card_warning"
                : "tags_resto_kitchen_card_normal";

    const cardClassName = [
        "tags_resto_kitchen_card",
        urgencyClass
    ]
        .filter(Boolean)
        .join(" ");

    const sectorName =
        order?.parent_location_name ||
        null;

    const locationName =
        order?.table_name ||
        (
            order?.table_number
                ? `Mesa ${order.table_number}`
                : order?.location_name ||
                "Pedido sin ubicación"
        );

    const orderNumber =
        order?.order_number ||
        `#${order?.id}`;

    return (

        <article
            className={cardClassName}
            style={{
                height:
                    `${cardHeight}px`
            }}
        >

            <header className="tags_resto_kitchen_card_header">

                <div className="tags_resto_kitchen_card_identity">

                    <div className="tags_resto_kitchen_card_main_icon">

                        <FaFire />

                    </div>

                    <div className="tags_resto_kitchen_card_identity_content">

                        <span className="tags_resto_kitchen_card_location_label">

                            Ubicación

                        </span>

                        {
                            sectorName && (

                                <span className="tags_resto_kitchen_card_sector">

                                    {sectorName}

                                </span>

                            )
                        }

                        <h2 className="tags_resto_kitchen_card_location">

                            {locationName}

                        </h2>

                        <span className="tags_resto_kitchen_card_order_number">

                            Pedido {orderNumber}

                        </span>

                    </div>

                </div>

                <div className="tags_resto_kitchen_card_timer">

                    <div className="tags_resto_kitchen_card_timer_icon">

                        {
                            minutesAgo >= warningMinutes
                                ? <FaFire />
                                : <FaClock />
                        }
                    </div>

                    <div className="tags_resto_kitchen_card_timer_content">

                        <span className="tags_resto_kitchen_card_timer_label">

                            En cocina

                        </span>

                        <strong className="tags_resto_kitchen_card_timer_value">

                            {minutesAgo} min

                        </strong>

                    </div>

                </div>

            </header>

            <div className="tags_resto_kitchen_card_summary">

                {
                    Number(
                        order?.people_count ||
                        0
                    ) > 0 && (

                        <div className="tags_resto_kitchen_card_summary_item">

                            <div className="tags_resto_kitchen_card_summary_icon">

                                <FaUsers />

                            </div>

                            <div className="tags_resto_kitchen_card_summary_content">

                                <span className="tags_resto_kitchen_card_summary_label">

                                    Comensales

                                </span>

                                <strong>

                                    {
                                        Number(
                                            order.people_count
                                        ) === 1
                                            ? "1 persona"
                                            : `${order.people_count} personas`
                                    }

                                </strong>

                            </div>

                        </div>

                    )
                }

                <div className="tags_resto_kitchen_card_summary_item">

                    <div className="tags_resto_kitchen_card_summary_icon">

                        <FaShoppingBag />

                    </div>

                    <div className="tags_resto_kitchen_card_summary_content">

                        <span className="tags_resto_kitchen_card_summary_label">

                            Productos pendientes

                        </span>

                        <strong>

                            {
                                totalPendingQuantity === 1
                                    ? "1 producto"
                                    : `${totalPendingQuantity} productos`
                            }

                        </strong>

                    </div>

                </div>

            </div>

            {
                order?.notes && (

                    <div className="tags_resto_kitchen_card_notes">

                        <div className="tags_resto_kitchen_card_notes_header">

                            <FaCommentDots />

                            <strong>

                                Observaciones del pedido

                            </strong>

                        </div>

                        <p>

                            {order.notes}

                        </p>

                    </div>

                )
            }

            <div className="tags_resto_kitchen_card_items">

                <div className="tags_resto_kitchen_card_items_header">

                    <div className="tags_resto_kitchen_card_items_title">

                        <FaFire />

                        <strong>

                            Preparación

                        </strong>

                    </div>

                    <span className="tags_resto_kitchen_card_items_count">

                        {totalPendingQuantity}

                    </span>

                </div>

                <div className="tags_resto_kitchen_card_items_list">

                    {
                        pendingItems.map(
                            item => {

                                const isUpdating =
                                    Number(
                                        updatingItemId
                                    ) ===
                                    Number(
                                        item.id
                                    );

                                return (

                                    <div
                                        key={item.id}
                                        className="tags_resto_kitchen_item"
                                    >

                                        <div className="tags_resto_kitchen_item_content">

                                            <div className="tags_resto_kitchen_item_main">

                                                <span className="tags_resto_kitchen_item_quantity">

                                                    {item.quantity}×

                                                </span>

                                                <div className="tags_resto_kitchen_item_identity">

                                                    <strong className="tags_resto_kitchen_item_title">

                                                        {
                                                            item.title ||
                                                            item.product_title ||
                                                            "Producto"
                                                        }

                                                    </strong>

                                                    {
                                                        item.variant_title && (

                                                            <span className="tags_resto_kitchen_item_variant">

                                                                {item.variant_title}

                                                            </span>

                                                        )
                                                    }

                                                </div>

                                            </div>

                                            {
                                                item.notes && (

                                                    <div className="tags_resto_kitchen_item_notes">

                                                        <FaCommentDots />

                                                        <span>

                                                            {item.notes}

                                                        </span>

                                                    </div>

                                                )
                                            }

                                        </div>

                                        {canMarkReady && <div className="tags_resto_kitchen_item_actions">

                                            <button
                                                type="button"
                                                className="tags_resto_btn tags_resto_kitchen_ready_btn"
                                                disabled={
                                                    isUpdating
                                                }
                                                onClick={() =>
                                                    onMarkReady(
                                                        item
                                                    )
                                                }
                                            >

                                                <FaCheck />

                                                <span>

                                                    {
                                                        isUpdating
                                                            ? "Actualizando..."
                                                            : "Preparado"
                                                    }

                                                </span>

                                            </button>

                                        </div>}

                                    </div>

                                );

                            }
                        )
                    }

                </div>

            </div>

        </article>

    );

}
