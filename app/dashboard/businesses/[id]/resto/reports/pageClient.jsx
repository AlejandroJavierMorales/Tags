"use client";

import {
    useEffect,
    useState
} from "react";
import {
    useRouter
} from "next/navigation";
import {
    FaArrowLeft,
    FaCalendarAlt,
    FaCashRegister,
    FaClipboardList,
    FaMoneyBillWave,
    FaReceipt,
    FaSyncAlt,
    FaUndoAlt
} from "react-icons/fa";

import TagsSpinner
    from "@/app/components/TagsSpinner";
import showAlert
    from "@/app/components/showAlert";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/modules/resto/styles/orders/index.css";
import "@/app/modules/resto/styles/resto-reports.css";

const PERIODS = [
    ["today", "Hoy"],
    ["7", "Últimos 7 días"],
    ["30", "Últimos 30 días"],
    ["90", "Últimos 90 días"],
    ["custom", "Período personalizado"]
];

const PAYMENT_LABELS = {
    cash: "Efectivo",
    transfer: "Transferencia",
    card: "Tarjeta",
    mercado_pago: "Mercado Pago",
    other: "Otro"
};

const MODE_LABELS = {
    table: "Consumo en el lugar",
    takeaway: "Retiro",
    delivery: "Delivery",
    unknown: "Sin modalidad"
};

function money(value, currency) {
    return new Intl.NumberFormat(
        "es-AR",
        {
            style: "currency",
            currency:
                currency ||
                "ARS"
        }
    ).format(
        Number(value || 0)
    );
}

function shortDate(value) {
    if (!value) {
        return "—";
    }

    const [
        year,
        month,
        day
    ] =
        String(value)
            .split("-");

    return `${day}/${month}/${year}`;
}

export default function RestoReportsClient({
    businessId
}) {
    const router =
        useRouter();
    const [loading, setLoading] =
        useState(true);
    const [refreshing, setRefreshing] =
        useState(false);
    const [data, setData] =
        useState(null);
    const [period, setPeriod] =
        useState("today");
    const [customFrom, setCustomFrom] =
        useState("");
    const [customTo, setCustomTo] =
        useState("");

    async function loadReports({
        silent = false,
        selectedPeriod =
            period
    } = {}) {
                if (
                    selectedPeriod ===
                    "custom" &&
                    (
                        !customFrom ||
                        !customTo
                    )
                ) {
                    return;
                }

                silent
                    ? setRefreshing(true)
                    : setLoading(true);

                try {
                    const params =
                        new URLSearchParams({
                            businessId:
                                String(
                                    businessId
                                ),
                            period:
                                selectedPeriod
                        });

                    if (
                        selectedPeriod ===
                        "custom"
                    ) {
                        params.set(
                            "from",
                            customFrom
                        );
                        params.set(
                            "to",
                            customTo
                        );
                    }

                    const response =
                        await fetch(
                            `/api/resto/admin/reports/summary?${params.toString()}`,
                            {
                                cache:
                                    "no-store"
                            }
                        );
                    const result =
                        await response
                            .json()
                            .catch(
                                () => null
                            );

                    if (!response.ok) {
                        throw new Error(
                            result?.error ||
                            "No se pudieron cargar los reportes"
                        );
                    }

                    setData(
                        result
                    );
                } catch (error) {
                    showAlert({
                        icon: "error",
                        title: "Reportes",
                        text: error.message
                    });
                } finally {
                    setLoading(false);
                    setRefreshing(false);
                }
    }

    useEffect(
        () => {
            loadReports();
        },
        [
            businessId
        ]
    );

    function changePeriod(value) {
        setPeriod(value);

        if (value !== "custom") {
            loadReports({
                selectedPeriod:
                    value
            });
        }
    }

    if (
        loading &&
        !data
    ) {
        return (
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );
    }

    const currency =
        data?.store?.currency ||
        "ARS";
    const kpis =
        data?.kpis ||
        {};
    const cards = [
        {
            label: "Dinero ingresado",
            value:
                money(
                    kpis.collected,
                    currency
                ),
            detail:
                `${kpis.payment_count || 0} cobros`,
            icon: FaMoneyBillWave,
            className: "is_income"
        },
        {
            label: "Devoluciones",
            value:
                money(
                    kpis.refunded,
                    currency
                ),
            detail:
                `${kpis.refund_count || 0} reintegros`,
            icon: FaUndoAlt,
            className: "is_refund"
        },
        {
            label: "Neto ingresado",
            value:
                money(
                    kpis.net,
                    currency
                ),
            detail:
                "Cobros menos devoluciones",
            icon: FaCashRegister,
            className: "is_net"
        },
        {
            label: "Ticket promedio",
            value:
                money(
                    kpis.average_ticket,
                    currency
                ),
            detail:
                `${kpis.paid_orders || 0} pedidos cobrados`,
            icon: FaReceipt,
            className: "is_ticket"
        },
        {
            label: "Pedidos creados",
            value:
                kpis.orders_count ||
                0,
            detail:
                `${kpis.cancelled_orders || 0} cancelados`,
            icon: FaClipboardList,
            className: "is_orders"
        },
        {
            label: "Cobro pendiente",
            value:
                money(
                    kpis.pending_amount,
                    currency
                ),
            detail:
                "De pedidos activos del período",
            icon: FaCalendarAlt,
            className: "is_pending"
        }
    ];

    return (
        <main className="qr_page_builder tags_resto_reports_page">
            <header className="qr_page_header">
                <div>
                    <h1 className="qr_page_title">
                        Reportes
                    </h1>
                    <p className="qr_page_subtitle">
                        Resumen operativo y comercial del restaurante.
                    </p>
                </div>

                <div className="qr_page_actions">
                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/resto`
                            )
                        }
                    >
                        <FaArrowLeft />
                        Inicio
                    </button>
                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        disabled={refreshing}
                        onClick={() =>
                            loadReports({
                                silent: true
                            })
                        }
                    >
                        <FaSyncAlt />
                        Actualizar
                    </button>
                </div>
            </header>

            <section className="tags_resto_reports_filters">
                <label>
                    <span>Período</span>
                    <select
                        value={period}
                        onChange={event =>
                            changePeriod(
                                event.target.value
                            )
                        }
                    >
                        {
                            PERIODS.map(
                                option => (
                                    <option
                                        key={option[0]}
                                        value={option[0]}
                                    >
                                        {option[1]}
                                    </option>
                                )
                            )
                        }
                    </select>
                </label>

                {
                    period ===
                    "custom" && (
                        <>
                            <label>
                                <span>Desde</span>
                                <input
                                    type="date"
                                    value={customFrom}
                                    onChange={event =>
                                        setCustomFrom(
                                            event.target.value
                                        )
                                    }
                                />
                            </label>
                            <label>
                                <span>Hasta</span>
                                <input
                                    type="date"
                                    value={customTo}
                                    onChange={event =>
                                        setCustomTo(
                                            event.target.value
                                        )
                                    }
                                />
                            </label>
                            <button
                                type="button"
                                disabled={
                                    !customFrom ||
                                    !customTo
                                }
                                onClick={() =>
                                    loadReports({
                                        selectedPeriod:
                                            "custom"
                                    })
                                }
                            >
                                Aplicar
                            </button>
                        </>
                    )
                }

                {
                    data?.period && (
                        <small>
                            {shortDate(
                                data.period.from
                            )} al {shortDate(
                                data.period.to
                            )}
                        </small>
                    )
                }
            </section>

            <section className="tags_resto_reports_kpis">
                {
                    cards.map(
                        card => {
                            const Icon =
                                card.icon;

                            return (
                                <article
                                    key={card.label}
                                    className={
                                        card.className
                                    }
                                >
                                    <span>
                                        <Icon />
                                    </span>
                                    <div>
                                        <small>
                                            {card.label}
                                        </small>
                                        <strong>
                                            {card.value}
                                        </strong>
                                        <p>
                                            {card.detail}
                                        </p>
                                    </div>
                                </article>
                            );
                        }
                    )
                }
            </section>

            <div className="tags_resto_reports_grid">
                <ReportPanel
                    title="Medios de pago"
                    empty="No hubo cobros en el período."
                    rows={
                        data?.payment_methods
                    }
                    columns={[
                        {
                            label: "Medio",
                            render:
                                row =>
                                    PAYMENT_LABELS[
                                        row.payment_method
                                    ] ||
                                    row.payment_method
                        },
                        {
                            label: "Operaciones",
                            render:
                                row =>
                                    row.operations
                        },
                        {
                            label: "Ingresado",
                            render:
                                row =>
                                    money(
                                        row.amount,
                                        currency
                                    )
                        }
                    ]}
                />

                <ReportPanel
                    title="Modalidades"
                    empty="No hubo pedidos en el período."
                    rows={
                        data?.service_modes
                    }
                    columns={[
                        {
                            label: "Modalidad",
                            render:
                                row =>
                                    MODE_LABELS[
                                        row.service_mode
                                    ] ||
                                    row.service_mode
                        },
                        {
                            label: "Pedidos",
                            render:
                                row =>
                                    row.orders_count
                        },
                        {
                            label: "Valor pedido",
                            render:
                                row =>
                                    money(
                                        row.ordered_total,
                                        currency
                                    )
                        }
                    ]}
                />

                <ReportPanel
                    title="Productos más pedidos"
                    empty="No hubo productos en el período."
                    rows={
                        data?.top_products
                    }
                    wide
                    columns={[
                        {
                            label: "Producto",
                            render:
                                row =>
                                    [
                                        row.title,
                                        row.variant_title
                                    ]
                                        .filter(Boolean)
                                        .join(" · ")
                        },
                        {
                            label: "Unidades",
                            render:
                                row =>
                                    row.quantity
                        },
                        {
                            label: "Valor pedido",
                            render:
                                row =>
                                    money(
                                        row.ordered_total,
                                        currency
                                    )
                        }
                    ]}
                />

                <ReportPanel
                    title="Evolución diaria"
                    empty="No hubo movimientos en el período."
                    rows={
                        data?.daily
                    }
                    wide
                    columns={[
                        {
                            label: "Fecha",
                            render:
                                row =>
                                    shortDate(
                                        row.date
                                    )
                        },
                        {
                            label: "Ingresado",
                            render:
                                row =>
                                    money(
                                        row.collected,
                                        currency
                                    )
                        },
                        {
                            label: "Devoluciones",
                            render:
                                row =>
                                    money(
                                        row.refunded,
                                        currency
                                    )
                        },
                        {
                            label: "Neto",
                            render:
                                row =>
                                    money(
                                        row.net,
                                        currency
                                    )
                        }
                    ]}
                />
            </div>
        </main>
    );
}

function ReportPanel({
    title,
    rows = [],
    columns,
    empty,
    wide = false
}) {
    return (
        <section
            className={[
                "tags_resto_reports_panel",
                wide
                    ? "is_wide"
                    : ""
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <header>
                <h2>
                    {title}
                </h2>
            </header>

            {
                rows.length ===
                0
                    ? (
                        <p className="tags_resto_reports_empty">
                            {empty}
                        </p>
                    )
                    : (
                        <div className="tags_resto_reports_table_wrap">
                            <table>
                                <thead>
                                    <tr>
                                        {
                                            columns.map(
                                                column => (
                                                    <th
                                                        key={column.label}
                                                    >
                                                        {column.label}
                                                    </th>
                                                )
                                            )
                                        }
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        rows.map(
                                            (
                                                row,
                                                index
                                            ) => (
                                                <tr
                                                    key={
                                                        `${title}-${index}`
                                                    }
                                                >
                                                    {
                                                        columns.map(
                                                            column => (
                                                                <td
                                                                    key={column.label}
                                                                >
                                                                    {column.render(
                                                                        row
                                                                    )}
                                                                </td>
                                                            )
                                                        )
                                                    }
                                                </tr>
                                            )
                                        )
                                    }
                                </tbody>
                            </table>
                        </div>
                    )
            }
        </section>
    );
}
