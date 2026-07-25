// =====================================
// FILE: app/modules/resto/components/public/RestoCurrentOrderItem.jsx
// Descripción:
// Item individual del pedido.
// Diseño moderno con precio protagonista.
// =====================================

"use client";

import { Button } from "react-bootstrap";

import { FaTrashCan } from "react-icons/fa6";



export default function RestoCurrentOrderItem({

    item,

    sending,

    isSessionOpen,

    formatMoney,

    updateItem,

    removeItem

}) {

    const statusLabels = {
        pending: "Pendiente",
        sent: "En preparación",
        ready: "Listo para entregar",
        served: "Entregado",
        cancelled: "Cancelado"
    };

    const canEdit =
        isSessionOpen &&
        Number(
            item.pending_quantity || 0
        ) > 0;

    return (

        <article className="tags_resto_current_order_item">

            <div className="tags_resto_current_order_item_header">

                <div className="tags_resto_current_order_item_content">

                    <h3 className="tags_resto_current_order_item_title">
                        {item.title}
                    </h3>

                    <span
                        className={
                            `tags_resto_current_order_item_status tags_resto_current_order_item_status_${item.preparation_status}`
                        }
                    >
                        {
                            statusLabels[
                                item.preparation_status
                            ] ||
                            "Pendiente"
                        }
                    </span>

                    {

                        item.variant_title && (

                            <div className="tags_resto_current_order_item_chip">
                                {item.variant_title}
                            </div>

                        )

                    }

                    {

                        item.notes && (

                            <div className="tags_resto_current_order_item_note">

                                <strong>
                                    Observación
                                </strong>

                                <span>
                                    {item.notes}
                                </span>

                            </div>

                        )

                    }

                </div>

                <div className="tags_resto_current_order_item_price">

                    <small>Total</small>

                    <strong>

                        $

                        {formatMoney(
                            item.total_price
                        )}

                    </strong>

                </div>

            </div>

            <div className="tags_resto_current_order_item_footer">

                <div className="tags_resto_current_order_quantity">

                    <Button
                        type="button"
                        className="tags_resto_current_order_quantity_button"
                        disabled={
                            sending ||
                            !canEdit
                        }
                        onClick={() =>
                            updateItem(
                                item,
                                Number(item.quantity) - 1
                            )
                        }
                    >
                        −
                    </Button>

                    <span className="tags_resto_current_order_quantity_value">

                        {item.quantity}

                    </span>

                    <Button
                        type="button"
                        className="tags_resto_current_order_quantity_button"
                        disabled={
                            sending ||
                            !canEdit
                        }
                        onClick={() =>
                            updateItem(
                                item,
                                Number(item.quantity) + 1
                            )
                        }
                    >
                        +
                    </Button>

                </div>

                <Button
                    type="button"
                    className="tags_resto_current_order_remove_button"
                    disabled={
                        sending ||
                        !canEdit
                    }
                    onClick={() => removeItem(item)}
                >
                    <FaTrashCan />
                </Button>

            </div>

        </article>

    );

}
