"use client";

import { useEffect, useState } from "react";

import "../../styles/tagsModals.css";

import TagsHeader from "../../components/Header";

import showAlert from "@/app/components/showAlert";

export default function SubscriptionsPage() {

    const [list, setList] = useState([]);
    const [plans, setPlans] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editId, setEditId] = useState(null);

    // =====================================
    // FILTERS
    // =====================================

    const [filterBusiness, setFilterBusiness] = useState("");

    const [filterPlan, setFilterPlan] = useState("");

    const [filterStatus, setFilterStatus] = useState("");
    const [filterExpireDate, setFilterExpireDate] = useState("");

    // =====================================
    // FORM
    // =====================================

    const [businessId,
        setBusinessId] =
        useState("");

    const [planId,
        setPlanId] =
        useState("");

    const [status,
        setStatus] =
        useState("active");

    const [paymentProvider,
        setPaymentProvider] =
        useState("manual");

    const [durationMonths,
        setDurationMonths] =
        useState(1);

    const [amount,
        setAmount] =
        useState("");

    const [currency,
        setCurrency] =
        useState("ARS");

    // =====================================
    // LOAD
    // =====================================

    useEffect(() => {

        loadPlans();
        loadBusinesses();

    }, []);

    useEffect(() => {

        loadSubscriptions();

    }, [
        filterBusiness,
        filterPlan,
        filterStatus,
        filterExpireDate
    ]);

    async function loadSubscriptions() {

        const params =
            new URLSearchParams();

        if (filterBusiness) {
            params.append(
                "business_id",
                filterBusiness
            );
        }

        if (filterPlan) {
            params.append(
                "plan_id",
                filterPlan
            );
        }

        if (filterStatus) {
            params.append(
                "status",
                filterStatus
            );
        }
        if (filterExpireDate) {

            params.append(
                "expire_before",
                filterExpireDate
            );
        }

        const res =
            await fetch(
                `/api/subscriptions/get?${params.toString()}`,
                {
                    cache: "no-store"
                }
            );

        const data =
            await res.json();

        setList(data.data || []);
    }

    async function loadPlans() {

        try {

            const res =
                await fetch(
                    "/api/plans/list"
                );

            const data =
                await res.json();

            setPlans(
                Array.isArray(data)
                    ? data
                    : []
            );

        } catch (err) {

            console.log(err);
        }
    }

    async function loadBusinesses() {

        const res =
            await fetch(
                "/api/business/list"
            );

        const data =
            await res.json();

        setBusinesses(
            Array.isArray(data)
                ? data
                : []
        );
    }

    // =====================================
    // PLAN SELECT
    // =====================================

    function handlePlanChange(value) {

        setPlanId(value);

        const plan =
            plans.find(
                p =>
                    Number(p.id)
                    === Number(value)
            );

        if (!plan) {
            return;
        }

        setAmount(plan.price || "");
        setCurrency(plan.currency || "ARS");
    }

    // =====================================
    // CREATE
    // =====================================

    async function createSubscription() {

        const res =
            await fetch(
                "/api/subscriptions/create",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        business_id:
                            Number(businessId),

                        plan_id:
                            Number(planId),

                        status,

                        payment_provider:
                            paymentProvider,

                        duration_months:
                            Number(durationMonths),

                        amount:
                            Number(amount),

                        currency
                    })
                }
            );

        const data =
            await res.json();

        if (!res.ok) {

            showAlert({
                title: "Error",
                text: data.error,
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "OK",
            text: "Suscripción creada",
            icon: "success"
        });

        setCreateOpen(false);

        resetForm();

        loadSubscriptions();
    }

    /* FUNCION DE EDICION MODIFICACION */
    /* ****************************** */

    function openEdit(row) {

        setEditId(row.id);

        setBusinessId(row.business_id);
        setPlanId(row.plan_id);

        setStatus(row.status);

        setPaymentProvider(row.payment_provider);

        setDurationMonths(row.duration_months);

        setAmount(row.amount);

        setCurrency(row.currency);

        setEditOpen(true);
    }

    function closeEdit() {

        setEditOpen(false);

        setEditId(null);
    }

    // =====================================
    // RESET
    // =====================================

    function resetForm() {

        setBusinessId("");
        setPlanId("");
        setStatus("active");
        setPaymentProvider("manual");
        setDurationMonths(1);
        setAmount("");
        setCurrency("ARS");
    }

    // =====================================
    // BADGE
    // =====================================

    function badge(status) {

        switch (status) {

            case "active":
                return "badge active";

            case "cancelled":
                return "badge disabled";

            case "inactive":
                return "badge disabled";

            case "past_due":
                return "badge pending";

            case "trial":
                return "badge active";

            default:
                return "badge";
        }
    }

    /* VERIFICA SI EL CLIENTE TIENE UNA SUBSCRIPCION */
    function businessHasSubscription(
        businessId
    ) {

        return list.some(sub =>

            Number(sub.business_id)
            === Number(businessId)

            &&

            [
                "active",
                "trial",
                "past_due"
            ].includes(sub.status)
        );
    }

    /* ************************ */
    /* Actualizar Subscripcion */
    async function updateSubscription() {

        const res =
            await fetch(
                "/api/subscriptions/update",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        id: editId,
                        business_id: Number(businessId),
                        plan_id: Number(planId),
                        status,
                        payment_provider: paymentProvider,
                        duration_months: Number(durationMonths),
                        amount: Number(amount),
                        currency
                    })
                }
            );

        const data = await res.json();

        if (!res.ok) {

            showAlert({
                title: "Error",
                text: data.error,
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "OK",
            text: "Subscripción actualizada",
            icon: "success"
        });

        closeEdit();

        loadSubscriptions();
    }

    /* ******************** */
    /* Delete Subscription */
    async function deleteSubscription(
        id
    ) {

        const result =
            await showAlert({

                title:
                    "Eliminar Suscripción",

                text:
                    "Esta acción no se puede deshacer",

                icon: "warning",

                showCancelButton: true,

                confirmButtonText:
                    "Eliminar",

                cancelButtonText:
                    "Cancelar"
            });

        if (!result.isConfirmed) {
            return;
        }

        try {

            const res =
                await fetch(
                    "/api/subscriptions/delete",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            id
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({

                    title: "Error",

                    text:
                        data.error,

                    icon: "error"
                });

                return;
            }

            showAlert({

                title: "OK",

                text:
                    "Suscripción eliminada",

                icon: "success"
            });

            loadSubscriptions();

        } catch (err) {

            console.log(err);

            showAlert({

                title: "Error",

                text:
                    "Error eliminando suscripción",

                icon: "error"
            });
        }
    }

    // =====================================
    // UPDATE STATUS
    // =====================================

    async function updateSubscriptionStatus(
        id,
        newStatus
    ) {

        const result =
            await showAlert({

                title:
                    newStatus === "inactive"
                        ? "Pausar Suscripción"
                        : "Cancelar Suscripción",

                text:
                    newStatus === "inactive"
                        ? "La suscripción quedará pausada"
                        : "La suscripción será cancelada",

                icon: "warning",

                showCancelButton: true,

                confirmButtonText:
                    "Confirmar",

                cancelButtonText:
                    "Volver"
            });

        if (!result.isConfirmed) {
            return;
        }

        try {

            const res =
                await fetch(
                    "/api/subscriptions/update",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            id,

                            status:
                                newStatus
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({

                    title: "Error",

                    text:
                        data.error,

                    icon: "error"
                });

                return;
            }

            showAlert({

                title: "OK",

                text:
                    newStatus === "inactive"
                        ? "Suscripción pausada"
                        : "Suscripción cancelada",

                icon: "success"
            });

            loadSubscriptions();

        } catch (err) {

            console.log(err);

            showAlert({

                title: "Error",

                text:
                    "Error actualizando estado",

                icon: "error"
            });
        }
    }


    // =====================================
    // UI
    // =====================================

    return (
        <div className="container-fluid tags_container m-0 p-0">

            <TagsHeader />

            <div className="p-3">

                <div className="d-flex justify-content-between align-items-center mb-4">

                    <h2 className="tags_title">
                        📦 Suscripciones
                    </h2>

                    <button
                        className="tags_btn tags_text_normal ms-1"
                        style={{ maxWidth: 150 }}
                        onClick={() =>
                            setCreateOpen(true)
                        }
                    >
                        ✚ Nueva Suscripción
                    </button>

                </div>

                {/* FILTERS */}

                <div className="row mb-4 d-flex align-items-end tags_text_normal">

                    {/* CLIENTE */}

                    <div className="col-md-3 mb-2">

                        <select
                            className="form-control"
                            value={filterBusiness}
                            onChange={(e) =>
                                setFilterBusiness(
                                    e.target.value
                                )
                            }
                        >

                            <option value="">
                                Todos los clientes
                            </option>

                            {businesses.map(b => (

                                <option
                                    key={b.id}
                                    value={b.id}
                                >
                                    {b.name}
                                </option>
                            ))}

                        </select>

                    </div>

                    {/* PLAN */}

                    <div className="col-md-2 mb-2">

                        <select
                            className="form-control"
                            value={filterPlan}
                            onChange={(e) =>
                                setFilterPlan(
                                    e.target.value
                                )
                            }
                        >

                            <option value="">
                                Todos los planes
                            </option>

                            {plans.map(p => (

                                <option
                                    key={p.id}
                                    value={p.id}
                                >
                                    {p.name}
                                </option>
                            ))}

                        </select>

                    </div>

                    {/* STATUS */}

                    <div className="col-md-2 mb-2">

                        <select
                            className="form-control"
                            value={filterStatus}
                            onChange={(e) =>
                                setFilterStatus(
                                    e.target.value
                                )
                            }
                        >

                            <option value="">
                                Todos los estados
                            </option>

                            <option value="active">
                                Activa
                            </option>

                            <option value="inactive">
                                Inactiva
                            </option>

                            <option value="cancelled">
                                Cancelada
                            </option>

                            <option value="past_due">
                                Vencida
                            </option>

                            <option value="trial">
                                Trial
                            </option>

                        </select>

                    </div>

                    {/* FECHA VENCIMIENTO */}

                    <div className="col-md-3 mb-2">

                        <label className="mb-1 fw-bold">
                            Vencen antes de
                        </label>

                        <input
                            type="date"
                            className="form-control"
                            value={filterExpireDate || ""}
                            onChange={(e) =>
                                setFilterExpireDate(
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    {/* RESET */}

                    <div className="col-md-1 mb-2">

                        <button
                            className="icon_btn"
                            title="Borrar Filtros"
                            onClick={() => {

                                setFilterBusiness("");
                                setFilterPlan("");
                                setFilterStatus("");
                                setFilterExpireDate("")

                            }}
                        >
                            X
                        </button>

                    </div>

                </div>

                {/* TABLE */}

                <div className="tags_table_wrapper">

                    <table className="tags_table">

                        <thead>

                            <tr>

                                <th>ID</th>
                                <th>Cliente</th>
                                <th>Plan</th>
                                <th>Estado</th>
                                <th>Monto</th>
                                <th>Inicio</th>
                                <th>Vencimiento</th>
                                <th>Proveedor</th>
                                <th>Acciones</th>

                            </tr>

                        </thead>

                        <tbody>

                            {list.map(row => (

                                <tr key={row.id}>

                                    <td>
                                        #{row.id}
                                    </td>

                                    <td>
                                        {row.business_name}
                                    </td>

                                    <td>
                                        {row.plan_name}
                                    </td>

                                    <td>

                                        <span className={badge(row.status)}>
                                            {row.status}
                                        </span>

                                    </td>

                                    <td>

                                        $
                                        {Number(row.amount)
                                            .toLocaleString("es-AR")}

                                    </td>

                                    <td>
                                        {row.started_at}
                                    </td>

                                    <td>
                                        {row.expires_at}
                                    </td>

                                    <td>
                                        {row.payment_provider}
                                    </td>

                                    <td>

                                        <div className="d-flex gap-2">

                                            {/* EDIT */}

                                            <button
                                                className="icon_btn"
                                                title="Editar"
                                                onClick={() =>
                                                    openEdit(row)
                                                }
                                            >
                                                ✏️
                                            </button>

                                            {/* PAUSE */}

                                            {row.status === "active" && (

                                                <button
                                                    className="icon_btn"
                                                    title="Pausar"
                                                    onClick={() =>
                                                        updateSubscriptionStatus(
                                                            row.id,
                                                            "inactive"
                                                        )
                                                    }
                                                >
                                                    ⏸
                                                </button>
                                            )}

                                            {/* CANCEL */}

                                            {row.status !== "cancelled" && (

                                                <button
                                                    className="icon_btn"
                                                    title="Cancelar"
                                                    onClick={() =>
                                                        updateSubscriptionStatus(
                                                            row.id,
                                                            "cancelled"
                                                        )
                                                    }
                                                >
                                                    ❌
                                                </button>
                                            )}

                                            {/* DELETE */}

                                            <button
                                                className="icon_btn"
                                                title="Eliminar"
                                                onClick={() =>
                                                    deleteSubscription(
                                                        row.id
                                                    )
                                                }
                                            >
                                                🗑️
                                            </button>

                                        </div>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

            {/* MODAL */}

            {createOpen && (

                <div className="tags_modal_overlay">

                    <div
                        className="tags_modal_card"
                        style={{
                            maxWidth: 800
                        }}
                    >

                        <button
                            className="tags_modal_close"
                            onClick={() =>
                                setCreateOpen(false)
                            }
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header">

                            <h2 className="tags_modal_title">
                                Nueva Suscripción
                            </h2>

                        </div>

                        <div className="tags_modal_body">

                            {/* CLIENTE */}

                            <div className="tags_modal_group">

                                <label>
                                    Cliente
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={businessId}
                                    onChange={(e) => {
                                        const value =
                                            e.target.value;
                                        if (
                                            businessHasSubscription(value)
                                        ) {
                                            showAlert({
                                                title:
                                                    "Cliente con suscripción",
                                                text:
                                                    "El cliente ya posee una suscripción activa.",
                                                icon:
                                                    "warning"
                                            });
                                            return;
                                        }

                                        setBusinessId(value);
                                    }}
                                >

                                    <option value="">
                                        Seleccionar
                                    </option>

                                    {businesses.map(b => (

                                        <option
                                            key={b.id}
                                            value={b.id}
                                        >
                                            {b.name}
                                        </option>

                                    ))}

                                </select>

                            </div>

                            {/* PLAN */}

                            <div className="tags_modal_group">

                                <label>
                                    Plan
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={planId}
                                    onChange={(e) =>
                                        handlePlanChange(
                                            e.target.value
                                        )
                                    }
                                >

                                    <option value="">
                                        Seleccionar
                                    </option>

                                    {plans.map(plan => (

                                        <option
                                            key={plan.id}
                                            value={plan.id}
                                        >
                                            {plan.name}
                                        </option>

                                    ))}

                                </select>

                            </div>

                            <div className="row">

                                <div className="col-md-6">

                                    <div className="tags_modal_group">

                                        <label>
                                            Estado
                                        </label>

                                        <select
                                            className="tags_modal_input"
                                            value={status}
                                            onChange={(e) =>
                                                setStatus(
                                                    e.target.value
                                                )
                                            }
                                        >

                                            <option value="active">
                                                active
                                            </option>

                                            <option value="trial">
                                                trial
                                            </option>

                                            <option value="inactive">
                                                inactive
                                            </option>

                                        </select>

                                    </div>

                                </div>

                                <div className="col-md-6">

                                    <div className="tags_modal_group">

                                        <label>
                                            Proveedor
                                        </label>

                                        <select
                                            className="tags_modal_input"
                                            value={paymentProvider}
                                            onChange={(e) =>
                                                setPaymentProvider(
                                                    e.target.value
                                                )
                                            }
                                        >

                                            <option value="manual">
                                                manual
                                            </option>

                                            <option value="mercadopago">
                                                mercadopago
                                            </option>

                                            <option value="transfer">
                                                transfer
                                            </option>

                                            <option value="free">
                                                free
                                            </option>

                                        </select>

                                    </div>

                                </div>

                            </div>

                            <div className="row">

                                <div className="col-md-4">

                                    <div className="tags_modal_group">

                                        <label>
                                            Duración
                                        </label>

                                        <input
                                            type="number"
                                            className="tags_modal_input"
                                            value={durationMonths}
                                            onChange={(e) =>
                                                setDurationMonths(
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="col-md-4">

                                    <div className="tags_modal_group">

                                        <label>
                                            Monto
                                        </label>

                                        <input
                                            type="number"
                                            className="tags_modal_input"
                                            value={amount}
                                            onChange={(e) =>
                                                setAmount(
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="col-md-4">

                                    <div className="tags_modal_group">

                                        <label>
                                            Moneda
                                        </label>

                                        <input
                                            className="tags_modal_input"
                                            value={currency}
                                            onChange={(e) =>
                                                setCurrency(
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                            </div>

                        </div>

                        <div className="tags_modal_actions">

                            <button
                                className="tags_modal_btn tags_modal_btn_success"
                                onClick={createSubscription}
                            >
                                💾 Crear Suscripción
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* ***************** */}
            {/* MODAL DE EDICIÓN */}

            {editOpen && (

                <div className="tags_modal_overlay">

                    <div
                        className="tags_modal_card"
                        style={{
                            maxWidth: 800
                        }}
                    >

                        <button
                            className="tags_modal_close"
                            onClick={() =>
                                closeEdit()
                            }
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header">

                            <h2 className="tags_modal_title">
                                Nueva Suscripción
                            </h2>

                        </div>

                        <div className="tags_modal_body">

                            {/* CLIENTE */}

                            <div className="tags_modal_group">

                                <label>
                                    Cliente
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={businessId}
                                    onChange={(e) => {
                                        const value =
                                            e.target.value;
                                        if (
                                            businessHasSubscription(value)
                                        ) {
                                            showAlert({
                                                title:
                                                    "Cliente con suscripción",
                                                text:
                                                    "El cliente ya posee una suscripción activa.",
                                                icon:
                                                    "warning"
                                            });
                                            return;
                                        }

                                        setBusinessId(value);
                                    }}
                                >

                                    <option value="">
                                        Seleccionar
                                    </option>

                                    {businesses.map(b => (

                                        <option
                                            key={b.id}
                                            value={b.id}
                                        >
                                            {b.name}
                                        </option>

                                    ))}

                                </select>

                            </div>

                            {/* PLAN */}

                            <div className="tags_modal_group">

                                <label>
                                    Plan
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={planId}
                                    onChange={(e) =>
                                        handlePlanChange(
                                            e.target.value
                                        )
                                    }
                                >

                                    <option value="">
                                        Seleccionar
                                    </option>

                                    {plans.map(plan => (

                                        <option
                                            key={plan.id}
                                            value={plan.id}
                                        >
                                            {plan.name}
                                        </option>

                                    ))}

                                </select>

                            </div>

                            <div className="row">

                                <div className="col-md-6">

                                    <div className="tags_modal_group">

                                        <label>
                                            Estado
                                        </label>

                                        <select
                                            className="tags_modal_input"
                                            value={status}
                                            onChange={(e) =>
                                                setStatus(
                                                    e.target.value
                                                )
                                            }
                                        >

                                            <option value="active">
                                                active
                                            </option>

                                            <option value="trial">
                                                trial
                                            </option>

                                            <option value="inactive">
                                                inactive
                                            </option>

                                        </select>

                                    </div>

                                </div>

                                <div className="col-md-6">

                                    <div className="tags_modal_group">

                                        <label>
                                            Proveedor
                                        </label>

                                        <select
                                            className="tags_modal_input"
                                            value={paymentProvider}
                                            onChange={(e) =>
                                                setPaymentProvider(
                                                    e.target.value
                                                )
                                            }
                                        >

                                            <option value="manual">
                                                manual
                                            </option>

                                            <option value="mercadopago">
                                                mercadopago
                                            </option>

                                            <option value="transfer">
                                                transfer
                                            </option>

                                            <option value="free">
                                                free
                                            </option>

                                        </select>

                                    </div>

                                </div>

                            </div>

                            <div className="row">

                                <div className="col-md-4">

                                    <div className="tags_modal_group">

                                        <label>
                                            Duración
                                        </label>

                                        <input
                                            type="number"
                                            className="tags_modal_input"
                                            value={durationMonths}
                                            onChange={(e) =>
                                                setDurationMonths(
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="col-md-4">

                                    <div className="tags_modal_group">

                                        <label>
                                            Monto
                                        </label>

                                        <input
                                            type="number"
                                            className="tags_modal_input"
                                            value={amount}
                                            onChange={(e) =>
                                                setAmount(
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="col-md-4">

                                    <div className="tags_modal_group">

                                        <label>
                                            Moneda
                                        </label>

                                        <input
                                            className="tags_modal_input"
                                            value={currency}
                                            onChange={(e) =>
                                                setCurrency(
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                            </div>

                        </div>

                        <div className="tags_modal_actions">

                            <button
                                className="tags_modal_btn tags_modal_btn_success"
                                onClick={updateSubscription}
                            >
                                💾 Guardar Cambios
                            </button>

                        </div>

                    </div>

                </div>
            )}
        </div>
    );
}