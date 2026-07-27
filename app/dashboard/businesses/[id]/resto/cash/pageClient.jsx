"use client";

import {
    useCallback,
    useEffect,
    useState
} from "react";

import {
    useRouter
} from "next/navigation";

import {
    FaArrowDown,
    FaArrowUp,
    FaCashRegister,
    FaEye,
    FaHistory,
    FaHome,
    FaLock,
    FaMoneyBillWave,
    FaPlus,
    FaSyncAlt,
    FaWallet
} from "react-icons/fa";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import showAlert
    from "@/app/components/showAlert";

import {
    formatRestoOrderPrice
} from "@/app/modules/resto/lib/orders";

import {
    requestRestoPayment
} from "@/app/modules/resto/lib/cash/requestRestoPayment";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/modules/resto/styles/orders/index.css";
import "@/app/modules/resto/styles/resto-cash.css";

const METHOD_LABELS = {
    cash:
        "Efectivo",
    transfer:
        "Transferencia",
    card:
        "Tarjeta",
    mercado_pago:
        "Mercado Pago",
    other:
        "Otro"
};

const TYPE_LABELS = {
    order_payment:
        "Cobro de pedido",
    order_refund:
        "Devolución",
    manual_income:
        "Ingreso manual",
    expense:
        "Gasto",
    cash_withdrawal:
        "Retiro de efectivo",
    tip:
        "Propina",
    adjustment:
        "Ajuste",
    delivery_collection:
        "Rendición de delivery",
    delivery_settlement_payment:
        "Comisión de repartidor",
    delivery_adjustment:
        "Ajuste de delivery"
};

function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(
            String(value).replace(
                " ",
                "T"
            )
        );

    return Number.isNaN(date.getTime())
        ? String(value)
        : new Intl.DateTimeFormat(
            "es-AR",
            {
                dateStyle:
                    "short",
                timeStyle:
                    "short"
            }
        ).format(date);

}

export default function RestoCashClient({
    businessId,
    permissions = ["*"]
}) {

    const router =
        useRouter();

    const can =
        permission =>
            permissions.includes("*") ||
            permissions.includes(permission);

    const [
        data,
        setData
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        saving,
        setSaving
    ] = useState(false);

    const [
        openingAmount,
        setOpeningAmount
    ] = useState("0");

    const [
        openingNotes,
        setOpeningNotes
    ] = useState("");

    const [
        movement,
        setMovement
    ] = useState({
        movement_type:
            "manual_income",
        payment_method:
            "cash",
        amount:
            "",
        notes:
            ""
    });

    const [
        declaredCash,
        setDeclaredCash
    ] = useState("");

    const [
        closingNotes,
        setClosingNotes
    ] = useState("");

    const [
        selectedHistoryId,
        setSelectedHistoryId
    ] = useState(null);

    const [
        auditLoading,
        setAuditLoading
    ] = useState(false);

    const load =
        useCallback(
            async ({
                silent = false
            } = {}) => {

                if (!silent) {
                    setLoading(true);
                }

                try {

                    const response =
                        await fetch(
                            `/api/resto/admin/cash/summary?businessId=${encodeURIComponent(
                                businessId
                            )}`,
                            {
                                cache:
                                    "no-store"
                            }
                        );

                    const result =
                        await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result?.error ||
                            "No se pudo cargar la caja"
                        );
                    }

                    setData(
                        current => ({
                            ...result,
                            audit_shift:
                                current?.audit_shift ||
                                null,
                            audit_movements:
                                current?.audit_movements ||
                                []
                        })
                    );

                } catch (error) {

                    showAlert({
                        icon:
                            "error",
                        title:
                            "Caja",
                        text:
                            error.message
                    });

                } finally {
                    setLoading(false);
                }

            },
            [
                businessId
            ]
        );

    useEffect(
        () => {
            load();
        },
        [
            load
        ]
    );

    useEffect(
        () => {

            const interval =
                window.setInterval(
                    () => {
                        load({
                            silent:
                                true
                        });
                    },
                    15000
                );

            return () =>
                window.clearInterval(
                    interval
                );

        },
        [
            load
        ]
    );

    async function viewShift(
        shiftId
    ) {

        setSelectedHistoryId(
            shiftId
        );
        setAuditLoading(true);

        try {

            const response =
                await fetch(
                    `/api/resto/admin/cash/summary?businessId=${encodeURIComponent(
                        businessId
                    )}&historyShiftId=${encodeURIComponent(
                        shiftId
                    )}`,
                    {
                        cache:
                            "no-store"
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result?.error ||
                    "No se pudo cargar el turno"
                );
            }

            setData(
                current => ({
                    ...current,
                    audit_shift:
                        result.audit_shift,
                    audit_movements:
                        result.audit_movements
                })
            );

        } catch (error) {

            setSelectedHistoryId(
                null
            );

            showAlert({
                icon:
                    "error",
                title:
                    "Historial de caja",
                text:
                    error.message
            });

        } finally {
            setAuditLoading(false);
        }

    }

    async function post(
        url,
        body,
        successMessage
    ) {

        setSaving(true);

        try {

            const response =
                await fetch(
                    url,
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                businessId,
                                ...body
                            })
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
                    "No se pudo completar la operación"
                );
            }

            await load({
                silent:
                    true
            });

            showAlert({
                icon:
                    "success",
                title:
                    "Caja",
                text:
                    successMessage,
                timer:
                    1400
            });

            return result;

        } catch (error) {

            showAlert({
                icon:
                    "error",
                title:
                    "Caja",
                text:
                    error.message
            });

            return null;

        } finally {
            setSaving(false);
        }

    }

    async function openCash() {

        const amount =
            Number(
                openingAmount
            );

        if (
            !Number.isFinite(amount) ||
            amount < 0
        ) {
            showAlert({
                icon:
                    "info",
                title:
                    "Monto inicial",
                text:
                    "Ingresá un monto válido."
            });
            return;
        }

        const result =
            await post(
                "/api/resto/admin/cash/open",
                {
                    opening_amount:
                        amount,
                    notes:
                        openingNotes
                },
                "La caja quedó abierta."
            );

        if (result) {
            setOpeningNotes("");
            setDeclaredCash("");
        }

    }

    async function addMovement() {

        const amount =
            Number(
                movement.amount
            );

        if (
            !Number.isFinite(amount) ||
            amount <= 0 ||
            !movement.notes.trim()
        ) {
            showAlert({
                icon:
                    "info",
                title:
                    "Movimiento incompleto",
                text:
                    "Ingresá un importe y un motivo."
            });
            return;
        }

        const isIncome =
            [
                "manual_income",
                "tip"
            ].includes(
                movement.movement_type
            );

        const result =
            await post(
                "/api/resto/admin/cash/movement",
                {
                    ...movement,
                    amount,
                    direction:
                        isIncome
                            ? "income"
                            : "expense"
                },
                "El movimiento quedó registrado."
            );

        if (result) {
            setMovement(
                current => ({
                    ...current,
                    amount:
                        "",
                    notes:
                        ""
                })
            );
        }

    }

    async function collectPayment(
        order
    ) {

        const payment =
            await requestRestoPayment(
                order,
                {
                    currency
                }
            );

        if (!payment) {
            return;
        }

        await post(
            "/api/resto/admin/orders/payment",
            {
                orderId:
                    order.id,
                amount:
                    payment.amount,
                payment_method:
                    payment.payment_method,
                notes:
                    payment.notes
            },
            `El cobro de ${order.order_number || "pedido"} quedó registrado.`
        );

    }

    async function closeCash() {

        const declared =
            Number(
                declaredCash
            );

        if (
            !Number.isFinite(declared) ||
            declared < 0
        ) {
            showAlert({
                icon:
                    "info",
                title:
                    "Arqueo",
                text:
                    "Ingresá el efectivo contado."
            });
            return;
        }

        const difference =
            Math.round(
                (
                    declared -
                    Number(
                        data?.shift
                            ?.expected_cash ||
                        0
                    ) +
                    Number.EPSILON
                ) *
                100
            ) /
            100;

        if (
            difference !== 0 &&
            !closingNotes.trim()
        ) {
            showAlert({
                icon:
                    "info",
                title:
                    "Diferencia de caja",
                text:
                    "Indicá en observaciones el motivo del sobrante o faltante."
            });
            return;
        }

        const confirmed =
            await showAlert({
                icon:
                    "warning",
                title:
                    "Cerrar caja",
                text:
                    "El turno quedará cerrado y no admitirá nuevos movimientos.",
                showCancelButton:
                    true,
                confirmButtonText:
                    "Sí, cerrar",
                cancelButtonText:
                    "Volver"
            });

        if (!confirmed) {
            return;
        }

        const result =
            await post(
                "/api/resto/admin/cash/close",
                {
                    declared_cash:
                        declared,
                    notes:
                        closingNotes
                },
                "La caja quedó cerrada."
            );

        if (result) {
            setDeclaredCash("");
            setClosingNotes("");
        }

    }

    if (loading) {
        return (
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );
    }

    const shift =
        data?.shift;

    const currency =
        data?.currency ||
        data?.store?.currency ||
        "ARS";

    return (
        <main className="tags_resto_orders_page tags_resto_cash_page">
            <header className="tags_resto_orders_header">
                <div className="tags_resto_orders_header_identity">
                    <div className="tags_resto_orders_header_icon">
                        <FaCashRegister />
                    </div>
                    <div className="tags_resto_orders_header_content">
                        <h1 className="tags_resto_orders_title">
                            Caja
                        </h1>
                        <p className="tags_resto_orders_subtitle">
                            Apertura, movimientos, arqueo y cierre
                        </p>
                    </div>
                </div>

                <div className="tags_resto_btn_group">
                    <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/resto`
                            )
                        }
                    >
                        <FaHome />
                        Inicio
                    </button>
                    <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_primary"
                        onClick={() =>
                            load({
                                silent:
                                    true
                            })
                        }
                    >
                        <FaSyncAlt />
                        Actualizar
                    </button>
                </div>
            </header>

            {
                !shift
                    ? (
                        <section className="tags_resto_cash_open">
                            <div className="tags_resto_cash_open_icon">
                                <FaLock />
                            </div>
                            <div>
                                <span>Caja cerrada</span>
                                <h2>Abrir {data?.register?.name || "Caja principal"}</h2>
                                <p>
                                    Definí el efectivo inicial antes de registrar cobros.
                                </p>
                            </div>
                            <label>
                                <span>Efectivo inicial</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={openingAmount}
                                    onChange={
                                        event =>
                                            setOpeningAmount(event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                <span>Observaciones</span>
                                <input
                                    type="text"
                                    value={openingNotes}
                                    placeholder="Opcional"
                                    onChange={
                                        event =>
                                            setOpeningNotes(event.target.value)
                                    }
                                />
                            </label>
                            {can("cash.open") && <button
                                type="button"
                                className="tags_resto_btn tags_resto_btn_success"
                                disabled={saving}
                                onClick={openCash}
                            >
                                <FaWallet />
                                Abrir caja
                            </button>}
                        </section>
                    )
                    : (
                        <>
                            <section className="tags_resto_cash_shift_header">
                                <div>
                                    <span className="tags_resto_cash_open_badge">
                                        Caja abierta
                                    </span>
                                    <h2>{shift.cash_register_name}</h2>
                                    <p>
                                        Abierta {formatDate(shift.opened_at)}
                                        {
                                            shift.opened_by_name
                                                ? ` por ${shift.opened_by_name}`
                                                : ""
                                        }
                                    </p>
                                </div>
                                <strong>
                                    Turno #{shift.id}
                                </strong>
                            </section>

                            <section className="tags_resto_cash_kpis">
                                <article>
                                    <FaWallet />
                                    <span>Fondo inicial</span>
                                    <strong>{formatRestoOrderPrice(shift.opening_amount, currency)}</strong>
                                </article>
                                <article className="is-income">
                                    <FaArrowUp />
                                    <span>Ingresos</span>
                                    <strong>{formatRestoOrderPrice(shift.total_income, currency)}</strong>
                                </article>
                                <article className="is-expense">
                                    <FaArrowDown />
                                    <span>Egresos</span>
                                    <strong>{formatRestoOrderPrice(shift.total_expense, currency)}</strong>
                                </article>
                                <article className="is-net">
                                    <FaMoneyBillWave />
                                    <span>Neto del turno</span>
                                    <strong>{formatRestoOrderPrice(shift.net_total, currency)}</strong>
                                </article>
                                <article className="is-cash">
                                    <FaCashRegister />
                                    <span>Efectivo esperado</span>
                                    <strong>{formatRestoOrderPrice(shift.expected_cash, currency)}</strong>
                                </article>
                            </section>

                            <section className="tags_resto_cash_methods">
                                {
                                    Object.entries(
                                        METHOD_LABELS
                                    ).map(
                                        entry => (
                                            <div key={entry[0]}>
                                                <span>{entry[1]}</span>
                                                <strong>
                                                    {
                                                        formatRestoOrderPrice(
                                                            shift.payment_methods?.[entry[0]] || 0,
                                                            currency
                                                        )
                                                    }
                                                </strong>
                                                <small>
                                                    Ingresos {
                                                        formatRestoOrderPrice(
                                                            shift.payment_method_details?.[entry[0]]?.income || 0,
                                                            currency
                                                        )
                                                    }
                                                    {" · "}
                                                    Egresos {
                                                        formatRestoOrderPrice(
                                                            shift.payment_method_details?.[entry[0]]?.expense || 0,
                                                            currency
                                                        )
                                                    }
                                                </small>
                                            </div>
                                        )
                                    )
                                }
                            </section>

                            {
                                (
                                    can("orders.payment") ||
                                    can("cash.charge")
                                ) && (
                                    <section className="tags_resto_cash_panel">
                                        <header>
                                            <FaMoneyBillWave />
                                            <div>
                                                <h2>Cuentas pendientes</h2>
                                                <p>
                                                    Pedidos activos con saldo por cobrar.
                                                </p>
                                            </div>
                                        </header>
                                        <div className="tags_resto_cash_pending">
                                            {
                                                (data?.pending_orders || []).map(
                                                    order => (
                                                        <article key={order.id}>
                                                            <div>
                                                                <strong>
                                                                    {order.order_number || `Pedido #${order.id}`}
                                                                </strong>
                                                                <span>
                                                                    {
                                                                        order.location_name ||
                                                                        order.customer_name ||
                                                                        (
                                                                            order.service_mode === "delivery"
                                                                                ? "Delivery"
                                                                                : order.service_mode === "takeaway"
                                                                                    ? "Retiro"
                                                                                    : "Consumo en el lugar"
                                                                        )
                                                                    }
                                                                </span>
                                                                <small>
                                                                    {order.products_text || `${order.items_count || 0} productos`}
                                                                </small>
                                                            </div>
                                                            <div>
                                                                <small>Saldo</small>
                                                                <strong>
                                                                    {
                                                                        formatRestoOrderPrice(
                                                                            order.pending_amount,
                                                                            currency
                                                                        )
                                                                    }
                                                                </strong>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="tags_resto_btn tags_resto_btn_success"
                                                                disabled={saving}
                                                                onClick={() =>
                                                                    collectPayment(
                                                                        order
                                                                    )
                                                                }
                                                            >
                                                                Cobrar
                                                            </button>
                                                        </article>
                                                    )
                                                )
                                            }
                                            {
                                                (data?.pending_orders || []).length === 0 && (
                                                    <p className="tags_resto_cash_empty">
                                                        No hay cuentas pendientes de cobro.
                                                    </p>
                                                )
                                            }
                                        </div>
                                    </section>
                                )
                            }

                            <div className="tags_resto_cash_columns">
                                {can("cash.movement") && <section className="tags_resto_cash_panel">
                                    <header>
                                        <FaPlus />
                                        <div>
                                            <h2>Nuevo movimiento</h2>
                                            <p>Ingresos, retiros, gastos o ajustes.</p>
                                        </div>
                                    </header>

                                    <div className="tags_resto_cash_form">
                                        <label>
                                            <span>Tipo</span>
                                            <select
                                                value={movement.movement_type}
                                                onChange={
                                                    event =>
                                                        setMovement(current => ({
                                                            ...current,
                                                            movement_type: event.target.value
                                                        }))
                                                }
                                            >
                                                <option value="manual_income">Ingreso manual</option>
                                                <option value="tip">Propina</option>
                                                <option value="expense">Gasto</option>
                                                <option value="cash_withdrawal">Retiro de efectivo</option>
                                                <option value="adjustment">Ajuste negativo</option>
                                            </select>
                                        </label>
                                        <label>
                                            <span>Método</span>
                                            <select
                                                value={movement.payment_method}
                                                onChange={
                                                    event =>
                                                        setMovement(current => ({
                                                            ...current,
                                                            payment_method: event.target.value
                                                        }))
                                                }
                                            >
                                                {
                                                    Object.entries(METHOD_LABELS).map(
                                                        entry => (
                                                            <option key={entry[0]} value={entry[0]}>
                                                                {entry[1]}
                                                            </option>
                                                        )
                                                    )
                                                }
                                            </select>
                                        </label>
                                        <label>
                                            <span>Importe</span>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={movement.amount}
                                                onChange={
                                                    event =>
                                                        setMovement(current => ({
                                                            ...current,
                                                            amount: event.target.value
                                                        }))
                                                }
                                            />
                                        </label>
                                        <label className="is-full">
                                            <span>Motivo</span>
                                            <input
                                                type="text"
                                                value={movement.notes}
                                                placeholder="Descripción obligatoria"
                                                onChange={
                                                    event =>
                                                        setMovement(current => ({
                                                            ...current,
                                                            notes: event.target.value
                                                        }))
                                                }
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            className="tags_resto_btn tags_resto_btn_primary"
                                            disabled={saving}
                                            onClick={addMovement}
                                        >
                                            Registrar movimiento
                                        </button>
                                    </div>
                                </section>}

                                {can("cash.close") && <section className="tags_resto_cash_panel is-close">
                                    <header>
                                        <FaLock />
                                        <div>
                                            <h2>Arqueo y cierre</h2>
                                            <p>Contá únicamente el efectivo físico.</p>
                                        </div>
                                    </header>
                                    <div className="tags_resto_cash_form">
                                        <label>
                                            <span>Efectivo esperado</span>
                                            <input
                                                type="text"
                                                disabled
                                                value={formatRestoOrderPrice(shift.expected_cash, currency)}
                                            />
                                        </label>
                                        <label>
                                            <span>Efectivo contado</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={declaredCash}
                                                onChange={
                                                    event =>
                                                        setDeclaredCash(event.target.value)
                                                }
                                            />
                                        </label>
                                        <label className="is-full">
                                            <span>Observaciones del cierre</span>
                                            <input
                                                type="text"
                                                value={closingNotes}
                                                placeholder="Opcional"
                                                onChange={
                                                    event =>
                                                        setClosingNotes(event.target.value)
                                                }
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            className="tags_resto_btn tags_resto_btn_danger"
                                            disabled={saving}
                                            onClick={closeCash}
                                        >
                                            Cerrar caja
                                        </button>
                                    </div>
                                </section>}
                            </div>
                        </>
                    )
            }

            <section className="tags_resto_cash_panel">
                <header>
                    <FaHistory />
                    <div>
                        <h2>Movimientos del turno</h2>
                        <p>Registro inmutable de ingresos y egresos.</p>
                    </div>
                </header>
                <div className="tags_resto_cash_movements">
                    {
                        (data?.movements || []).map(
                            item => (
                                <article key={item.id}>
                                    <div className={item.direction === "income" ? "is-income" : "is-expense"}>
                                        {
                                            item.direction === "income"
                                                ? <FaArrowUp />
                                                : <FaArrowDown />
                                        }
                                    </div>
                                    <div>
                                        <strong>{TYPE_LABELS[item.movement_type] || item.movement_type}</strong>
                                        <span>
                                            {item.order_number ? `${item.order_number} · ` : ""}
                                            {METHOD_LABELS[item.payment_method] || item.payment_method}
                                        </span>
                                        <small>
                                            {item.notes || "Sin observaciones"} · {formatDate(item.occurred_at)}
                                            {
                                                item.created_by_name
                                                    ? ` · ${item.created_by_name}`
                                                    : ""
                                            }
                                        </small>
                                    </div>
                                    <strong className={item.direction === "income" ? "is-income" : "is-expense"}>
                                        {item.direction === "income" ? "+" : "-"}
                                        {formatRestoOrderPrice(item.amount, currency)}
                                    </strong>
                                </article>
                            )
                        )
                    }
                    {
                        (data?.movements || []).length === 0 && (
                            <p className="tags_resto_cash_empty">
                                No hay movimientos en el turno actual.
                            </p>
                        )
                    }
                </div>
            </section>

            <section className="tags_resto_cash_panel">
                <header>
                    <FaHistory />
                    <div>
                        <h2>Historial de cajas</h2>
                        <p>Últimos 30 turnos abiertos o cerrados.</p>
                    </div>
                </header>
                <div className="tags_resto_cash_history">
                    {
                        (data?.history || []).map(
                            item => (
                                <article key={item.id}>
                                    <div>
                                        <strong>Turno #{item.id} · {item.cash_register_name}</strong>
                                        <span>
                                            {formatDate(item.opened_at)}
                                            {" — "}
                                            {item.closed_at ? formatDate(item.closed_at) : "En curso"}
                                        </span>
                                    </div>
                                    <span className={item.status === "open" ? "is-open" : "is-closed"}>
                                        {item.status === "open" ? "Abierta" : "Cerrada"}
                                    </span>
                                    <div>
                                        <small>Diferencia</small>
                                        <strong>
                                            {
                                                item.difference_amount == null
                                                    ? "—"
                                                    : formatRestoOrderPrice(item.difference_amount, currency)
                                            }
                                        </strong>
                                    </div>
                                    <button
                                        type="button"
                                        className="tags_resto_cash_history_action"
                                        disabled={auditLoading}
                                        onClick={() =>
                                            viewShift(
                                                item.id
                                            )
                                        }
                                    >
                                        <FaEye />
                                        {
                                            selectedHistoryId ===
                                                item.id
                                                ? "Viendo"
                                                : "Ver detalle"
                                        }
                                    </button>
                                </article>
                            )
                        )
                    }
                </div>
            </section>

            {
                data?.audit_shift && (
                    <section className="tags_resto_cash_panel tags_resto_cash_audit">
                        <header>
                            <FaHistory />
                            <div>
                                <h2>
                                    Detalle del turno #{data.audit_shift.id}
                                </h2>
                                <p>
                                    {formatDate(data.audit_shift.opened_at)}
                                    {" — "}
                                    {
                                        data.audit_shift.closed_at
                                            ? formatDate(data.audit_shift.closed_at)
                                            : "En curso"
                                    }
                                </p>
                            </div>
                            <button
                                type="button"
                                className="tags_resto_cash_history_action"
                                onClick={() => {
                                    setSelectedHistoryId(null);
                                    setData(
                                        current => ({
                                            ...current,
                                            audit_shift:
                                                null,
                                            audit_movements:
                                                []
                                        })
                                    );
                                }}
                            >
                                Cerrar detalle
                            </button>
                        </header>

                        <div className="tags_resto_cash_audit_totals">
                            <div>
                                <span>Fondo inicial</span>
                                <strong>{formatRestoOrderPrice(data.audit_shift.opening_amount, currency)}</strong>
                            </div>
                            <div>
                                <span>Cobros de pedidos</span>
                                <strong>{formatRestoOrderPrice(data.audit_shift.order_income, currency)}</strong>
                            </div>
                            <div>
                                <span>Devoluciones</span>
                                <strong>{formatRestoOrderPrice(data.audit_shift.order_refunds, currency)}</strong>
                            </div>
                            <div>
                                <span>Neto del turno</span>
                                <strong>{formatRestoOrderPrice(data.audit_shift.net_total, currency)}</strong>
                            </div>
                            <div>
                                <span>Efectivo esperado</span>
                                <strong>{formatRestoOrderPrice(data.audit_shift.expected_cash, currency)}</strong>
                            </div>
                            <div>
                                <span>Efectivo declarado</span>
                                <strong>
                                    {
                                        data.audit_shift.declared_cash == null
                                            ? "—"
                                            : formatRestoOrderPrice(
                                                data.audit_shift.declared_cash,
                                                currency
                                            )
                                    }
                                </strong>
                            </div>
                            <div>
                                <span>Diferencia</span>
                                <strong>
                                    {
                                        data.audit_shift.difference_amount == null
                                            ? "—"
                                            : formatRestoOrderPrice(
                                                data.audit_shift.difference_amount,
                                                currency
                                            )
                                    }
                                </strong>
                            </div>
                        </div>

                        <div className="tags_resto_cash_movements">
                            {
                                (data.audit_movements || []).map(
                                    item => (
                                        <article key={item.id}>
                                            <div className={item.direction === "income" ? "is-income" : "is-expense"}>
                                                {
                                                    item.direction === "income"
                                                        ? <FaArrowUp />
                                                        : <FaArrowDown />
                                                }
                                            </div>
                                            <div>
                                                <strong>{TYPE_LABELS[item.movement_type] || item.movement_type}</strong>
                                                <span>
                                                    {item.order_number ? `${item.order_number} · ` : ""}
                                                    {METHOD_LABELS[item.payment_method] || item.payment_method}
                                                </span>
                                                <small>
                                                    {item.notes || "Sin observaciones"} · {formatDate(item.occurred_at)}
                                                    {
                                                        item.created_by_name
                                                            ? ` · ${item.created_by_name}`
                                                            : ""
                                                    }
                                                </small>
                                            </div>
                                            <strong className={item.direction === "income" ? "is-income" : "is-expense"}>
                                                {item.direction === "income" ? "+" : "-"}
                                                {formatRestoOrderPrice(item.amount, currency)}
                                            </strong>
                                        </article>
                                    )
                                )
                            }
                            {
                                (data.audit_movements || []).length === 0 && (
                                    <p className="tags_resto_cash_empty">
                                        El turno no tiene movimientos.
                                    </p>
                                )
                            }
                        </div>
                    </section>
                )
            }
        </main>
    );

}
