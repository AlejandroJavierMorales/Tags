// =====================================
// FILE: /app/modules/resto/components/admin/orders/RestoOrdersStats.jsx
// Descripción:
// Resumen operativo de pedidos de Tags Resto.
// Muestra los principales estados del servicio
// mediante tarjetas visuales y métricas rápidas.
// =====================================

"use client";

import {
    FaBell,
    FaCashRegister,
    FaCheck,
    FaClipboardList,
    FaFire,
    FaReceipt
} from "react-icons/fa";

const statCards = [

    {
        key: "total",
        label: "Pedidos",
        description: "En el servicio",
        icon: FaClipboardList,
        tone: "primary"
    },

    {
        key: "preparing",
        label: "En cocina",
        description: "Abrir pantalla de Cocina",
        secondaryKey: "kitchenSentItems",
        secondaryLabel: "platos",
        icon: FaFire,
        tone: "warning"
    },

    {
        key: "ready",
        label: "Listos",
        description: "Para entregar",
        icon: FaCheck,
        tone: "success"
    },

    {
        key: "billRequested",
        label: "Piden cuenta",
        description: "Esperando cobro",
        icon: FaReceipt,
        tone: "warning"
    },

    {
        key: "staffRequested",
        label: "Piden atención",
        description: "Llamados activos",
        icon: FaBell,
        tone: "danger"
    },

    {
        key: "paymentPending",
        label: "Cobros pendientes",
        description: "Sin registrar",
        icon: FaCashRegister,
        tone: "neutral"
    }

];

export default function RestoOrdersStats({
    stats,
    onKitchen
}) {

    return (

        <section
            className="tags_resto_orders_stats"
            aria-label="Resumen operativo de pedidos"
        >

            <div className="tags_resto_orders_stats_grid">

                <div className="row">

                    {
                        statCards.map(({
                            key,
                            label,
                            description,
                            secondaryKey,
                            secondaryLabel,
                            icon: Icon,
                            tone
                        }) => (

                            <div
                                key={key}
                                className="col-6 col-md-4 col-xl-2"
                            >

                                <article
                                    className={
                                        `tags_resto_orders_stat_card ` +
                                        `tags_resto_orders_stat_${tone}`
                                    }
                                    onClick={
                                        key ===
                                        "preparing"
                                            ? onKitchen
                                            : undefined
                                    }
                                    onKeyDown={
                                        key ===
                                        "preparing"
                                            ? event => {

                                                if (
                                                    event.key ===
                                                        "Enter" ||
                                                    event.key ===
                                                        " "
                                                ) {

                                                    onKitchen?.();

                                                }

                                            }
                                            : undefined
                                    }
                                    role={
                                        key ===
                                        "preparing"
                                            ? "link"
                                            : undefined
                                    }
                                    tabIndex={
                                        key ===
                                        "preparing"
                                            ? 0
                                            : undefined
                                    }
                                    style={
                                        key ===
                                        "preparing"
                                            ? {
                                                cursor:
                                                    "pointer"
                                            }
                                            : undefined
                                    }
                                >

                                    <div className="tags_resto_orders_stat_icon">

                                        <Icon />

                                    </div>

                                    <div className="tags_resto_orders_stat_content">

                                        <div className="tags_resto_orders_stat_title">

                                            {label}

                                        </div>

                                        <div className="tags_resto_orders_stat_value">

                                            {
                                                Number(
                                                    stats?.[key] ?? 0
                                                )
                                            }

                                        </div>

                                        {
                                            secondaryKey && (

                                                <div className="tags_resto_orders_stat_secondary">

                                                    {
                                                        Number(
                                                            stats?.[secondaryKey] ?? 0
                                                        )
                                                    }

                                                    {" "}

                                                    {secondaryLabel}

                                                </div>

                                            )
                                        }

                                        <div className="tags_resto_orders_stat_description">

                                            {description}

                                        </div>

                                    </div>

                                </article>

                            </div>

                        ))
                    }

                </div>

            </div>

        </section>

    );

}
