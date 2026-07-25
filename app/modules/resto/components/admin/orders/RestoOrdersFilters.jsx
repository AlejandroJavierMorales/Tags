// =====================================
// FILE: /app/modules/resto/components/admin/orders/RestoOrdersFilters.jsx
// Descripción:
// Barra de búsqueda y filtros rápidos del módulo
// de pedidos de Tags Resto.
// =====================================

"use client";

import {
    FaBroom,
    FaSearch
} from "react-icons/fa";

const statusOptions = [

    {
        value: "",
        label: "Todos los estados"
    },

    {
        value: "new",
        label: "Nuevos"
    },

    {
        value: "confirmed",
        label: "Confirmados"
    },

    {
        value: "preparing",
        label: "En cocina"
    },

    {
        value: "ready",
        label: "Listos"
    },

    {
        value: "shipped",
        label: "Entregados"
    },

    {
        value: "completed",
        label: "Cerrados"
    },

    {
        value: "cancelled",
        label: "Cancelados"
    }

];

const paymentOptions = [

    {
        value: "",
        label: "Todos los pagos"
    },

    {
        value: "pending",
        label: "Pendientes"
    },

    {
        value: "paid",
        label: "Pagados"
    },

    {
        value: "cancelled",
        label: "Cancelados"
    },

    {
        value: "refunded",
        label: "Reintegrados"
    }

];

export default function RestoOrdersFilters({

    query,

    statusFilter,

    paymentFilter,

    totalVisible,

    hasActiveFilters,

    onQueryChange,

    onStatusChange,

    onPaymentChange,

    onClear

}) {

    return (

        <section className="tags_resto_orders_filters">

            <div className="tags_resto_orders_filters_top">

                <h2 className="tags_resto_orders_filters_title">

                    Filtros

                </h2>

                <div className="tags_resto_orders_filters_count">

                    {totalVisible}

                </div>

            </div>

            <div className="tags_resto_orders_filters_body">

                <div className="tags_resto_orders_filters_grid">

                    <div className="tags_resto_orders_filter_group">

                        <label>

                            Buscar pedido

                        </label>

                        <div className="tags_resto_orders_search">

                            <FaSearch />

                            <input
                                type="search"
                                value={query}
                                onChange={
                                    event =>
                                        onQueryChange(
                                            event.target.value
                                        )
                                }
                                placeholder="Mesa, cliente, pedido..."
                                className="tags_resto_orders_input"
                            />

                        </div>

                    </div>

                    <div className="tags_resto_orders_filter_group">

                        <label>

                            Estado

                        </label>

                        <select
                            className="tags_resto_orders_select"
                            value={statusFilter}
                            onChange={
                                event =>
                                    onStatusChange(
                                        event.target.value
                                    )
                            }
                        >

                            {
                                statusOptions.map(
                                    option => (

                                        <option
                                            key={
                                                option.value ||
                                                "all-status"
                                            }
                                            value={
                                                option.value
                                            }
                                        >

                                            {option.label}

                                        </option>

                                    )
                                )
                            }

                        </select>

                    </div>

                    <div className="tags_resto_orders_filter_group">

                        <label>

                            Pago

                        </label>

                        <select
                            className="tags_resto_orders_select"
                            value={paymentFilter}
                            onChange={
                                event =>
                                    onPaymentChange(
                                        event.target.value
                                    )
                            }
                        >

                            {
                                paymentOptions.map(
                                    option => (

                                        <option
                                            key={
                                                option.value ||
                                                "all-payment"
                                            }
                                            value={
                                                option.value
                                            }
                                        >

                                            {option.label}

                                        </option>

                                    )
                                )
                            }

                        </select>

                    </div>

                    <div className="tags_resto_orders_filter_group">

                        <label>

                            Acciones

                        </label>

                        <button
                            type="button"
                            className="tags_resto_btn tags_resto_btn_secondary tags_resto_btn_block"
                            disabled={!hasActiveFilters}
                            onClick={onClear}
                        >

                            <FaBroom />

                            Limpiar

                        </button>

                    </div>

                </div>

            </div>

            <div className="tags_resto_orders_filters_footer">

                <div className="tags_resto_orders_filters_info">

                    Mostrando

                    <strong>

                        {" "}
                        {totalVisible}
                        {" "}

                    </strong>

                    pedidos

                </div>

            </div>

        </section>

    );

}