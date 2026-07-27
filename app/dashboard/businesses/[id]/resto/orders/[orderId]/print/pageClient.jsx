"use client";

import {
    FaArrowLeft,
    FaPrint
} from "react-icons/fa";

import "@/app/modules/resto/styles/resto-order-print.css";

const serviceModeLabels = {
    table:
        "Consumo en el lugar",
    takeaway:
        "Retiro en el local",
    delivery:
        "Envío a domicilio"
};

const preparationLabels = {
    pending:
        "Pendiente de envío",
    sent:
        "En preparación",
    ready:
        "Listo",
    served:
        "Entregado"
};

function number(value) {
    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}

function money(
    value,
    currency
) {
    const fixed =
        Math.abs(
            number(value)
        ).toFixed(2);

    const [
        integer,
        decimals
    ] =
        fixed.split(".");

    const formattedInteger =
        integer.replace(
            /\B(?=(\d{3})+(?!\d))/g,
            "."
        );

    const code =
        currency ||
        "ARS";

    const symbol =
        code === "ARS"
            ? "$"
            : code === "USD"
                ? "US$"
                : code;

    const sign =
        number(value) < 0
            ? "-"
            : "";

    return `${sign}${symbol} ${formattedInteger},${decimals}`;
}

function dateTime(value) {
    if (!value) {
        return "—";
    }

    const parts =
        new Intl.DateTimeFormat(
        "es-AR",
        {
            timeZone:
                "America/Argentina/Buenos_Aires",
            year:
                "numeric",
            month:
                "2-digit",
            day:
                "2-digit",
            hour:
                "2-digit",
            minute:
                "2-digit",
            hourCycle:
                "h23"
        }
    ).formatToParts(
            new Date(value)
        )
        .reduce(
            (
                result,
                part
            ) => ({
                ...result,
                [part.type]:
                    part.value
            }),
            {}
        );

    return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

function getLocation(order) {
    return [
        order.parent_location_name,
        order.table_name ||
        order.location_name
    ]
        .filter(Boolean)
        .join(" · ") ||
        serviceModeLabels[
            order.service_mode
        ] ||
        "Sin ubicación";
}

export default function RestoOrderPrintClient({
    businessId,
    documentType,
    store,
    order
}) {
    const isKitchen =
        documentType ===
        "kitchen";

    const items =
        (
            Array.isArray(order.items)
                ? order.items
                : []
        ).filter(
            item =>
                item.preparation_status !==
                "cancelled" &&
                (
                    !isKitchen ||
                    (
                        Number(
                            item.requires_preparation
                        ) === 1 &&
                        item.preparation_status ===
                        "sent"
                    )
                )
        );

    const contact =
        store.contact ||
        {};
    const location =
        store.location ||
        {};
    const currency =
        order.currency ||
        store.currency ||
        "ARS";

    return (
        <main
            className={[
                "resto_order_print_page",
                isKitchen
                    ? "is_kitchen"
                    : "is_bill"
            ].join(" ")}
        >
            <nav className="resto_order_print_toolbar">
                <button
                    type="button"
                    onClick={() =>
                        window.location.href =
                            isKitchen
                                ? `/dashboard/businesses/${businessId}/resto/kitchen`
                                : `/dashboard/businesses/${businessId}/resto/orders/${order.id}`
                    }
                >
                    <FaArrowLeft />
                    {
                        isKitchen
                            ? "Volver a Cocina"
                            : "Volver al pedido"
                    }
                </button>

                <button
                    type="button"
                    className="is_primary"
                    onClick={() =>
                        window.print()
                    }
                >
                    <FaPrint />
                    Imprimir
                </button>
            </nav>

            <article className="resto_order_print_document">
                <header className="resto_order_print_header">
                    {
                        store.logo_url && (
                            <img
                                src={store.logo_url}
                                alt={store.name}
                            />
                        )
                    }

                    <h1>
                        {store.name}
                    </h1>

                    {!isKitchen && (
                        <div className="resto_order_print_contact">
                            <span>
                                {
                                    location.address ||
                                    store.address ||
                                    ""
                                }
                            </span>
                            <span>
                                {
                                    contact.phone ||
                                    contact.whatsapp ||
                                    store.whatsapp ||
                                    ""
                                }
                            </span>
                            <span>
                                {
                                    contact.email ||
                                    store.email ||
                                    ""
                                }
                            </span>
                        </div>
                    )}
                </header>

                <section className="resto_order_print_title">
                    <strong>
                        {
                            isKitchen
                                ? "COMANDA DE COCINA"
                                : "CUENTA"
                        }
                    </strong>

                    {!isKitchen && (
                        <small>
                            Documento no válido como factura
                        </small>
                    )}
                </section>

                <dl className="resto_order_print_metadata">
                    <div>
                        <dt>Pedido</dt>
                        <dd>
                            {
                                order.order_number ||
                                `#${order.id}`
                            }
                        </dd>
                    </div>
                    <div>
                        <dt>Fecha</dt>
                        <dd>
                            {dateTime(
                                order.created_at
                            )}
                        </dd>
                    </div>
                    <div>
                        <dt>Modalidad</dt>
                        <dd>
                            {
                                serviceModeLabels[
                                    order.service_mode
                                ] ||
                                order.service_mode ||
                                "—"
                            }
                        </dd>
                    </div>
                    <div>
                        <dt>Ubicación</dt>
                        <dd>
                            {getLocation(order)}
                        </dd>
                    </div>
                    {
                        order.customer_name && (
                            <div>
                                <dt>Cliente</dt>
                                <dd>
                                    {order.customer_name}
                                </dd>
                            </div>
                        )
                    }
                </dl>

                <section className="resto_order_print_items">
                    {
                        items.map(
                            item => (
                                <div
                                    key={item.id}
                                    className="resto_order_print_item"
                                >
                                    <div className="resto_order_print_item_main">
                                        <strong>
                                            {number(item.quantity)} × {item.title}
                                        </strong>

                                        {!isKitchen && (
                                            <span>
                                                {money(
                                                    item.total_price,
                                                    currency
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    {
                                        item.variant_title && (
                                            <small>
                                                {item.variant_title}
                                            </small>
                                        )
                                    }

                                    {
                                        isKitchen && (
                                            <small>
                                                {
                                                    preparationLabels[
                                                        item.preparation_status
                                                    ] ||
                                                    item.preparation_status
                                                }
                                            </small>
                                        )
                                    }

                                    {
                                        item.notes && (
                                            <p>
                                                Nota: {item.notes}
                                            </p>
                                        )
                                    }
                                </div>
                            )
                        )
                    }

                    {
                        items.length === 0 && (
                            <p className="resto_order_print_empty">
                                {
                                    isKitchen
                                        ? "No hay productos para cocina."
                                        : "No hay productos vigentes."
                                }
                            </p>
                        )
                    }
                </section>

                {
                    order.notes && (
                        <section className="resto_order_print_notes">
                            <strong>
                                Observaciones generales
                            </strong>
                            <p>
                                {order.notes}
                            </p>
                        </section>
                    )
                }

                {!isKitchen && (
                    <section className="resto_order_print_totals">
                        <div>
                            <span>Subtotal</span>
                            <strong>
                                {money(
                                    order.subtotal,
                                    currency
                                )}
                            </strong>
                        </div>
                        {
                            number(
                                order.discount_total
                            ) > 0 && (
                                <div>
                                    <span>Descuento</span>
                                    <strong>
                                        - {money(
                                            order.discount_total,
                                            currency
                                        )}
                                    </strong>
                                </div>
                            )
                        }
                        <div className="is_total">
                            <span>Total</span>
                            <strong>
                                {money(
                                    order.total,
                                    currency
                                )}
                            </strong>
                        </div>
                        <div>
                            <span>Pagado</span>
                            <strong>
                                {money(
                                    order.paid_total,
                                    currency
                                )}
                            </strong>
                        </div>
                        {
                            number(
                                order.refunded_total
                            ) > 0 && (
                                <>
                                    <div>
                                        <span>Devoluciones</span>
                                        <strong>
                                            - {money(
                                                order.refunded_total,
                                                currency
                                            )}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>Neto pagado</span>
                                        <strong>
                                            {money(
                                                order.net_paid_total,
                                                currency
                                            )}
                                        </strong>
                                    </div>
                                </>
                            )
                        }
                        <div className="is_balance">
                            <span>Saldo</span>
                            <strong>
                                {money(
                                    order.pending_amount,
                                    currency
                                )}
                            </strong>
                        </div>
                    </section>
                )}

                <footer className="resto_order_print_footer">
                    {
                        isKitchen
                            ? "Emitida para preparación interna"
                            : "Gracias por su visita"
                    }
                </footer>
            </article>
        </main>
    );
}
