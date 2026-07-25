// =====================================
// FILE: /app/modules/resto/components/admin/kitchen/RestoKitchenStats.jsx
// Descripción:
// KPIs operativos con el mismo patrón visual de Pedidos.
// =====================================

"use client";

import {
    FaClock,
    FaFire,
    FaUtensils
} from "react-icons/fa";

const statCards = [
    {
        key: "orders_in_kitchen",
        label: "En cocina",
        description: "Pedidos con platos en preparación",
        icon: FaFire,
        tone: "warning"
    },
    {
        key: "items_in_preparation",
        label: "Platos en preparación",
        description: "Unidades pendientes de cocina",
        icon: FaUtensils,
        tone: "primary"
    },
    {
        key: "average_wait_minutes",
        label: "Espera promedio",
        description: "Minutos desde el envío",
        suffix: " min",
        icon: FaClock,
        tone: "success"
    }
];

export default function RestoKitchenStats({
    stats = {}
}) {

    return (
        <section
            className="tags_resto_orders_stats"
            aria-label="Resumen operativo de cocina"
        >
            <div className="tags_resto_orders_stats_grid">
                <div className="row">
                    {
                        statCards.map(({
                            key,
                            label,
                            description,
                            suffix = "",
                            icon: Icon,
                            tone
                        }) => (
                            <div
                                key={key}
                                className="col-12 col-md-4"
                            >
                                <article
                                    className={
                                        `tags_resto_orders_stat_card ` +
                                        `tags_resto_orders_stat_${tone}`
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
                                                    stats?.[key] ??
                                                    0
                                                )
                                            }
                                            {suffix}
                                        </div>

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
