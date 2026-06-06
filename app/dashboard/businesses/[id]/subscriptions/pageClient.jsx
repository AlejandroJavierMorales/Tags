"use client";

// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/subscriptions
// Descripción: Gestión admin de suscripciones, vencimientos y pagos de un cliente.
// =====================================

import { useEffect, useMemo, useState } from "react";

import showAlert
    from "@/app/components/showAlert";

import "@/app/styles/tagsModals.css";
import TagsSpinner from "@/app/components/TagsSpinner";

const emptySubscriptionForm = {
    plan_id: "",
    status: "active",
    payment_provider: "manual",
    duration_months: 1,
    amount: "",
    currency: "ARS",
    auto_renew: false,
    auto_disable_on_expire: true,
    grace_days: 0,
    admin_override_until: "",
    admin_override_notes: ""
};

const emptyPaymentForm = {
    amount: "",
    provider: "manual",
    notes: ""
};

function bool(value) {
    return Number(value) === 1 || value === true;
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleDateString("es-AR");
}

function formatMoney(amount, currency = "ARS") {
    return `${currency || "ARS"} ${Number(amount || 0).toLocaleString("es-AR")}`;
}

function toInputDate(value) {
    if (!value) {
        return "";
    }

    return new Date(value).toISOString().slice(0, 10);
}

function getStatusLabel(status) {
    const labels = {
        active: "Activo",
        inactive: "Inactivo",
        cancelled: "Cancelado",
        past_due: "Vencido",
        trial: "Prueba"
    };

    return labels[status] || status || "-";
}

function getStatusClass(status) {
    if (status === "active") {
        return "tags_badge_success";
    }

    if (status === "trial") {
        return "tags_badge_info";
    }

    if (status === "past_due") {
        return "tags_badge_warning";
    }

    if (status === "cancelled") {
        return "tags_badge_danger";
    }

    return "tags_badge_muted";
}

export default function SubscriptionsPageClient({
    businessId
}) {

    const [business, setBusiness] =
        useState(null);

    const [subscriptions, setSubscriptions] =
        useState([]);

    const [payments, setPayments] =
        useState([]);

    const [plans, setPlans] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [open, setOpen] =
        useState(false);

    const [editOpen, setEditOpen] =
        useState(false);

    const [paymentOpen, setPaymentOpen] =
        useState(false);

    const [selectedSubscription, setSelectedSubscription] =
        useState(null);

    const [form, setForm] =
        useState(emptySubscriptionForm);

    const [editForm, setEditForm] =
        useState({
            id: null,
            ...emptySubscriptionForm,
            started_at: "",
            expires_at: "",
            next_billing_at: ""
        });

    const [paymentForm, setPaymentForm] =
        useState(emptyPaymentForm);

    useEffect(() => {
        load();
    }, []);

    const activeSubscription =
        useMemo(
            () =>
                subscriptions.find(
                    sub => sub.status === "active"
                ) || null,
            [subscriptions]
        );

    async function load() {

        try {

            setLoading(true);

            const [
                subsRes,
                payRes,
                plansRes,
                businessRes
            ] = await Promise.all([

                fetch(
                    `/api/subscriptions/get?business_id=${businessId}`
                ),

                fetch(
                    `/api/subscription-payment/get?business_id=${businessId}`
                ),

                fetch(
                    "/api/plans/list"
                ),

                fetch(
                    `/api/business/qrs?id=${businessId}`
                )
            ]);

            const subsData =
                await subsRes.json().catch(() => ({}));

            const payData =
                await payRes.json().catch(() => ({}));

            const plansData =
                await plansRes.json().catch(() => []);

            const businessData =
                await businessRes.json().catch(() => ({}));

            setSubscriptions(
                Array.isArray(subsData.data)
                    ? subsData.data
                    : []
            );

            setPayments(
                Array.isArray(payData.data)
                    ? payData.data
                    : []
            );

            setPlans(
                Array.isArray(plansData)
                    ? plansData
                    : []
            );

            setBusiness(
                businessData.business || null
            );

        } catch (err) {

            console.error("SUBSCRIPTIONS PAGE LOAD ERROR:", err);

            showAlert({
                title: "Error",
                text: "No se pudo cargar la información de suscripciones.",
                icon: "error"
            });

        } finally {

            setLoading(false);
        }
    }

    function updateForm(key, value) {

        if (key === "plan_id") {

            const selectedPlan =
                plans.find(
                    plan =>
                        String(plan.id) === String(value)
                );

            setForm(prev => ({
                ...prev,
                plan_id: value,
                amount:
                    selectedPlan?.price ?? prev.amount,
                currency:
                    selectedPlan?.currency || prev.currency || "ARS"
            }));

            return;
        }

        setForm(prev => ({
            ...prev,
            [key]: value
        }));
    }

    function updateEditForm(key, value) {

        if (key === "plan_id") {

            const selectedPlan =
                plans.find(
                    plan =>
                        String(plan.id) === String(value)
                );

            setEditForm(prev => ({
                ...prev,
                plan_id: value,
                amount:
                    selectedPlan?.price ?? prev.amount,
                currency:
                    selectedPlan?.currency || prev.currency || "ARS"
            }));

            return;
        }

        setEditForm(prev => ({
            ...prev,
            [key]: value
        }));
    }

    function resetCreateForm() {
        setForm(emptySubscriptionForm);
    }

    function closeCreate() {
        setOpen(false);
        resetCreateForm();
    }

    function closeEdit() {
        setEditOpen(false);

        setEditForm({
            id: null,
            ...emptySubscriptionForm,
            started_at: "",
            expires_at: "",
            next_billing_at: ""
        });
    }

    function closePayment() {
        setPaymentOpen(false);
        setSelectedSubscription(null);
        setPaymentForm(emptyPaymentForm);
    }

    function openEdit(sub) {

        setEditForm({
            id: sub.id,
            plan_id: sub.plan_id || "",
            status: sub.status || "active",
            payment_provider: sub.payment_provider || "manual",
            duration_months: sub.duration_months || 1,
            amount: sub.amount || 0,
            currency: sub.currency || "ARS",
            started_at: toInputDate(sub.started_at),
            expires_at: toInputDate(sub.expires_at),
            next_billing_at: toInputDate(sub.next_billing_at),
            auto_renew: bool(sub.auto_renew),
            auto_disable_on_expire: bool(sub.auto_disable_on_expire),
            grace_days: sub.grace_days || 0,
            admin_override_until: toInputDate(sub.admin_override_until),
            admin_override_notes: sub.admin_override_notes || ""
        });

        setEditOpen(true);
    }

    function openPayment(sub) {

        setSelectedSubscription(sub);

        setPaymentForm({
            amount: sub.amount || "",
            provider: sub.payment_provider === "free"
                ? "manual"
                : sub.payment_provider || "manual",
            notes: ""
        });

        setPaymentOpen(true);
    }

    async function createSubscription() {

        if (!form.plan_id) {

            showAlert({
                title: "Error",
                text: "Seleccioná un plan.",
                icon: "error"
            });

            return;
        }

        const res =
            await fetch(
                "/api/subscriptions/create",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        business_id: businessId,
                        ...form,
                        duration_months: Number(form.duration_months || 1),
                        amount: Number(form.amount || 0),
                        auto_renew: form.auto_renew ? 1 : 0,
                        auto_disable_on_expire: form.auto_disable_on_expire ? 1 : 0,
                        grace_days: Number(form.grace_days || 0),
                        admin_override_until: form.admin_override_until || null,
                        admin_override_notes: form.admin_override_notes || null
                    })
                }
            );

        const data =
            await res.json().catch(() => ({}));

        if (!res.ok) {

            showAlert({
                title: "Error",
                text:
                    data.error ||
                    "No se pudo crear la suscripción.",
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "OK",
            text: "Suscripción creada correctamente.",
            icon: "success"
        });

        closeCreate();
        load();
    }

    async function saveEdit() {

        if (!editForm.id) {
            return;
        }

        if (!editForm.plan_id) {

            showAlert({
                title: "Error",
                text: "Seleccioná un plan.",
                icon: "error"
            });

            return;
        }

        const res =
            await fetch(
                "/api/subscriptions/update",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        ...editForm,
                        duration_months: Number(editForm.duration_months || 1),
                        amount: Number(editForm.amount || 0),
                        started_at: editForm.started_at || null,
                        expires_at: editForm.expires_at || null,
                        next_billing_at: editForm.next_billing_at || null,
                        auto_renew: editForm.auto_renew ? 1 : 0,
                        auto_disable_on_expire: editForm.auto_disable_on_expire ? 1 : 0,
                        grace_days: Number(editForm.grace_days || 0),
                        admin_override_until: editForm.admin_override_until || null,
                        admin_override_notes: editForm.admin_override_notes || null
                    })
                }
            );

        const data =
            await res.json().catch(() => ({}));

        if (!res.ok) {

            showAlert({
                title: "Error",
                text:
                    data.error ||
                    "No se pudo actualizar la suscripción.",
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "OK",
            text: "Suscripción actualizada correctamente.",
            icon: "success"
        });

        closeEdit();
        load();
    }

    async function cancelSubscription(subscription) {

        const confirmed =
            await showAlert({
                title: "Cancelar suscripción",
                text: "La suscripción pasará a cancelada. El historial se conserva.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Cancelar suscripción",
                cancelButtonText: "Volver"
            });

        if (!confirmed) {
            return;
        }

        const res =
            await fetch(
                "/api/subscriptions/delete",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        id: subscription.id
                    })
                }
            );

        const data =
            await res.json().catch(() => ({}));

        if (!res.ok) {

            showAlert({
                title: "Error",
                text:
                    data.error ||
                    "No se pudo cancelar la suscripción.",
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "OK",
            text: "Suscripción cancelada.",
            icon: "success"
        });

        load();
    }

    async function registerPayment() {

        if (!selectedSubscription?.id) {
            return;
        }

        if (!paymentForm.amount) {

            showAlert({
                title: "Error",
                text: "Ingresá el monto del pago.",
                icon: "error"
            });

            return;
        }

        const res =
            await fetch(
                "/api/subscription-payment/create",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        subscription_id:
                            selectedSubscription.id,
                        amount:
                            Number(paymentForm.amount || 0),
                        provider:
                            paymentForm.provider,
                        notes:
                            paymentForm.notes || null
                    })
                }
            );

        const data =
            await res.json().catch(() => ({}));

        if (!res.ok) {

            showAlert({
                title: "Error",
                text:
                    data.error ||
                    "No se pudo registrar el pago.",
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "OK",
            text: "Pago registrado y vencimiento actualizado.",
            icon: "success"
        });

        closePayment();
        load();
    }

    if (loading) {

        return (
            <div className="container-fluid m-0 p-3">
                <TagsSpinner/>
            </div>
        );
    }

    return (
        <div className="container-fluid m-0 p-3 tags_text_normal">

            <div className="row d-flex justify-content-between align-items-center mt-3 mb-4">

                <div className="col-12 col-md-7">
                    <h1 className="tags_title">
                        Suscripciones
                    </h1>

                    <p className="m-0 text-muted">
                        Gestión de plan, vencimientos, renovaciones y pagos del cliente.
                    </p>
                </div>

                <div className="col-12 col-md-5 d-flex justify-content-md-end mt-3 mt-md-0">
                    <button
                        className="tags_btn rounded tags_text_normal"
                        style={{
                            maxWidth: "220px"
                        }}
                        onClick={() =>
                            setOpen(true)
                        }
                    >
                        ✚ Nueva suscripción
                    </button>
                </div>

            </div>

            <div className="tags_card_form mb-4">

                <div className="row align-items-center">

                    <div className="col-12 col-md-6">
                        <small className="text-muted">
                            Cliente
                        </small>

                        <h3 className="m-0">
                            {business?.name || "Cliente"}
                        </h3>

                        <p className="m-0">
                            {business?.email || "-"}
                        </p>
                    </div>

                    <div className="col-12 col-md-6 d-flex justify-content-md-end mt-3 mt-md-0 gap-2 flex-wrap">

                        <span className={`tags_badge ${getStatusClass(activeSubscription?.status)}`}>
                            {activeSubscription
                                ? getStatusLabel(activeSubscription.status)
                                : "Sin suscripción activa"}
                        </span>

                        {
                            activeSubscription && (
                                <span className="tags_badge tags_badge_info">
                                    {activeSubscription.plan_name}
                                </span>
                            )
                        }

                    </div>

                </div>

            </div>

            <div className="row mb-4">

                <div className="col-12 col-md-3 mb-3">
                    <div className="tags_result_card h-100 mt-0">
                        <small className="text-muted">
                            Plan actual
                        </small>

                        <h4 className="mt-2 mb-0">
                            {activeSubscription?.plan_name || "-"}
                        </h4>
                    </div>
                </div>

                <div className="col-12 col-md-3 mb-3">
                    <div className="tags_result_card h-100 mt-0">
                        <small className="text-muted">
                            Vencimiento
                        </small>

                        <h4 className="mt-2 mb-0">
                            {formatDate(activeSubscription?.expires_at)}
                        </h4>
                    </div>
                </div>

                <div className="col-12 col-md-3 mb-3">
                    <div className="tags_result_card h-100 mt-0">
                        <small className="text-muted">
                            Auto renovación
                        </small>

                        <h4 className="mt-2 mb-0">
                            {bool(activeSubscription?.auto_renew) ? "Sí" : "No"}
                        </h4>
                    </div>
                </div>

                <div className="col-12 col-md-3 mb-3">
                    <div className="tags_result_card h-100 mt-0">
                        <small className="text-muted">
                            Días de gracia
                        </small>

                        <h4 className="mt-2 mb-0">
                            {activeSubscription?.grace_days || 0}
                        </h4>
                    </div>
                </div>

            </div>

            <div className="tags_table_wrapper mb-5">

                <table className="tags_table tags_text_normal">

                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Plan</th>
                            <th>Estado</th>
                            <th>Inicio</th>
                            <th>Vence</th>
                            <th>Monto</th>
                            <th>Auto</th>
                            <th>Override</th>
                            <th className="text-center">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>

                        {
                            subscriptions.length === 0 && (
                                <tr>
                                    <td colSpan={9}>
                                        No hay suscripciones registradas.
                                    </td>
                                </tr>
                            )
                        }

                        {
                            subscriptions.map(sub => (

                                <tr key={sub.id}>

                                    <td>
                                        #{sub.id}
                                    </td>

                                    <td>
                                        <strong>
                                            {sub.plan_name}
                                        </strong>

                                        <div className="text-muted" style={{ fontSize: 12 }}>
                                            {sub.plan_code}
                                        </div>
                                    </td>

                                    <td>
                                        <span className={`tags_badge ${getStatusClass(sub.status)}`}>
                                            {getStatusLabel(sub.status)}
                                        </span>
                                    </td>

                                    <td>
                                        {formatDate(sub.started_at)}
                                    </td>

                                    <td>
                                        {formatDate(sub.expires_at)}
                                    </td>

                                    <td>
                                        {formatMoney(sub.amount, sub.currency)}
                                    </td>

                                    <td>
                                        {bool(sub.auto_renew) ? "Sí" : "No"}
                                    </td>

                                    <td>
                                        {
                                            sub.admin_override_until
                                                ? formatDate(sub.admin_override_until)
                                                : "-"
                                        }
                                    </td>

                                    <td className="text-center">

                                        <div className="tags_actions justify-content-center">

                                            <button
                                                style={{ minWidth: "70px", minHeight:"45px" }}
                                                className="icon_btn"
                                                title="Registrar pago"
                                                onClick={() =>
                                                    openPayment(sub)
                                                }
                                            >
                                                💵
                                            </button>

                                            <button
                                                style={{ minWidth: "70px", minHeight:"45px" }}
                                                className="icon_btn"
                                                title="Editar suscripción"
                                                onClick={() =>
                                                    openEdit(sub)
                                                }
                                            >
                                                ✏️
                                            </button>

                                            {
                                                sub.status === "active" && (
                                                    <button
                                                        style={{ minWidth: "70px", minHeight:"45px" }}
                                                        className="icon_btn danger"
                                                        title="Cancelar suscripción"
                                                        onClick={() =>
                                                            cancelSubscription(sub)
                                                        }
                                                    >
                                                        ❌
                                                    </button>
                                                )
                                            }

                                        </div>

                                    </td>

                                </tr>
                            ))
                        }

                    </tbody>

                </table>

            </div>

            <h2 className="tags_title mb-3">
                Pagos
            </h2>

            <div className="tags_table_wrapper mb-5">

                <table className="tags_table tags_text_normal">

                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Plan</th>
                            <th>Monto</th>
                            <th>Provider</th>
                            <th>Estado</th>
                            <th>Período</th>
                            <th>Fecha pago</th>
                            <th>Notas</th>
                        </tr>
                    </thead>

                    <tbody>

                        {
                            payments.length === 0 && (
                                <tr>
                                    <td colSpan={8}>
                                        No hay pagos registrados.
                                    </td>
                                </tr>
                            )
                        }

                        {
                            payments.map(pay => (

                                <tr key={pay.id}>

                                    <td>
                                        #{pay.id}
                                    </td>

                                    <td>
                                        {pay.plan_name}
                                    </td>

                                    <td>
                                        {formatMoney(pay.amount, pay.currency)}
                                    </td>

                                    <td>
                                        {pay.provider}
                                    </td>

                                    <td>
                                        <span className={`tags_badge ${pay.status === "approved"
                                                ? "tags_badge_success"
                                                : pay.status === "pending"
                                                    ? "tags_badge_warning"
                                                    : "tags_badge_muted"
                                            }`}>
                                            {pay.status}
                                        </span>
                                    </td>

                                    <td>
                                        {formatDate(pay.period_start)}
                                        {" → "}
                                        {formatDate(pay.period_end)}
                                    </td>

                                    <td>
                                        {formatDate(pay.paid_at)}
                                    </td>

                                    <td>
                                        {pay.notes || "-"}
                                    </td>

                                </tr>
                            ))
                        }

                    </tbody>

                </table>

            </div>

            {open && (
                <div className="tags_modal_overlay tags_text_normal">
                    <div className="tags_modal_card tags_modal_large">

                        <button
                            className="tags_modal_close"
                            onClick={closeCreate}
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header text-center">
                            <h2 className="tags_modal_title tags_title">
                                Nueva suscripción
                            </h2>

                            <p className="tags_modal_description">
                                Creá una nueva suscripción activa para este cliente.
                            </p>
                        </div>

                        <div className="tags_modal_body">
                            <SubscriptionForm
                                form={form}
                                plans={plans}
                                update={updateForm}
                            />
                        </div>

                        <div className="tags_modal_actions">
                            <button
                                className="tags_modal_btn tags_modal_btn_success"
                                onClick={createSubscription}
                            >
                                ✚ Crear
                            </button>

                            <button
                                className="tags_modal_btn tags_modal_btn_cancel"
                                onClick={closeCreate}
                            >
                                ✖ Cancelar
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {editOpen && (
                <div className="tags_modal_overlay tags_text_normal">
                    <div className="tags_modal_card tags_modal_large">

                        <button
                            className="tags_modal_close"
                            onClick={closeEdit}
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header text-center">
                            <h2 className="tags_modal_title tags_title">
                                Editar suscripción
                            </h2>

                            <p className="tags_modal_description">
                                Modificá estado, vencimientos y configuración comercial.
                            </p>
                        </div>

                        <div className="tags_modal_body">
                            <SubscriptionForm
                                form={editForm}
                                plans={plans}
                                update={updateEditForm}
                                editMode={true}
                            />
                        </div>

                        <div className="tags_modal_actions">
                            <button
                                className="tags_modal_btn tags_modal_btn_success"
                                onClick={saveEdit}
                            >
                                🖫 Guardar
                            </button>

                            <button
                                className="tags_modal_btn tags_modal_btn_cancel"
                                onClick={closeEdit}
                            >
                                ✖ Cancelar
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {paymentOpen && selectedSubscription && (
                <div className="tags_modal_overlay tags_text_normal">
                    <div className="tags_modal_card">

                        <button
                            className="tags_modal_close"
                            onClick={closePayment}
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header text-center">
                            <h2 className="tags_modal_title tags_title">
                                Registrar pago
                            </h2>

                            <p className="tags_modal_description">
                                {selectedSubscription.plan_name}
                                {" — "}
                                extiende el vencimiento según la duración configurada.
                            </p>
                        </div>

                        <div className="tags_modal_body">

                            <div className="tags_modal_group">
                                <label className="tags_modal_label">
                                    Monto
                                </label>

                                <input
                                    className="tags_modal_input tags_text_normal"
                                    type="number"
                                    value={paymentForm.amount}
                                    onChange={(e) =>
                                        setPaymentForm(prev => ({
                                            ...prev,
                                            amount: e.target.value
                                        }))
                                    }
                                />
                            </div>

                            <div className="tags_modal_group">
                                <label className="tags_modal_label">
                                    Medio de pago
                                </label>

                                <select
                                    className="tags_modal_input tags_text_normal"
                                    value={paymentForm.provider}
                                    onChange={(e) =>
                                        setPaymentForm(prev => ({
                                            ...prev,
                                            provider: e.target.value
                                        }))
                                    }
                                >
                                    <option value="manual">
                                        Manual
                                    </option>

                                    <option value="transfer">
                                        Transferencia
                                    </option>

                                    <option value="cash">
                                        Efectivo
                                    </option>

                                    <option value="mercadopago">
                                        MercadoPago
                                    </option>
                                </select>
                            </div>

                            <div className="tags_modal_group">
                                <label className="tags_modal_label">
                                    Notas
                                </label>

                                <textarea
                                    className="tags_modal_input tags_text_normal"
                                    value={paymentForm.notes}
                                    onChange={(e) =>
                                        setPaymentForm(prev => ({
                                            ...prev,
                                            notes: e.target.value
                                        }))
                                    }
                                />
                            </div>

                        </div>

                        <div className="tags_modal_actions">
                            <button
                                className="tags_modal_btn tags_modal_btn_success"
                                onClick={registerPayment}
                            >
                                💵 Registrar
                            </button>

                            <button
                                className="tags_modal_btn tags_modal_btn_cancel"
                                onClick={closePayment}
                            >
                                ✖ Cancelar
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

function SubscriptionForm({
    form,
    plans,
    update,
    editMode = false
}) {

    return (
        <div className="tags_modal_form_grid">

            <div className="tags_modal_group">
                <label className="tags_modal_label">
                    Plan
                </label>

                <select
                    className="tags_modal_input tags_text_normal"
                    value={form.plan_id}
                    onChange={(e) =>
                        update("plan_id", e.target.value)
                    }
                >
                    <option value="">
                        Seleccionar plan
                    </option>

                    {
                        plans.map(plan => (
                            <option
                                key={plan.id}
                                value={plan.id}
                            >
                                {plan.name}
                                {" — "}
                                {formatMoney(plan.price, plan.currency)}
                            </option>
                        ))
                    }
                </select>
            </div>

            <div className="tags_modal_group">
                <label className="tags_modal_label">
                    Estado
                </label>

                <select
                    className="tags_modal_input tags_text_normal"
                    value={form.status}
                    onChange={(e) =>
                        update("status", e.target.value)
                    }
                >
                    <option value="active">
                        Activo
                    </option>

                    <option value="trial">
                        Prueba
                    </option>

                    <option value="past_due">
                        Vencido
                    </option>

                    <option value="inactive">
                        Inactivo
                    </option>

                    <option value="cancelled">
                        Cancelado
                    </option>
                </select>
            </div>

            <div className="tags_modal_group">
                <label className="tags_modal_label">
                    Duración meses
                </label>

                <input
                    type="number"
                    min="1"
                    className="tags_modal_input tags_text_normal"
                    value={form.duration_months}
                    onChange={(e) =>
                        update("duration_months", e.target.value)
                    }
                />
            </div>

            <div className="tags_modal_group">
                <label className="tags_modal_label">
                    Medio cobro
                </label>

                <select
                    className="tags_modal_input tags_text_normal"
                    value={form.payment_provider}
                    onChange={(e) =>
                        update("payment_provider", e.target.value)
                    }
                >
                    <option value="manual">
                        Manual
                    </option>

                    <option value="transfer">
                        Transferencia
                    </option>

                    <option value="free">
                        Free
                    </option>

                    <option value="mercadopago">
                        MercadoPago
                    </option>
                </select>
            </div>

            <div className="tags_modal_group">
                <label className="tags_modal_label">
                    Monto
                </label>

                <input
                    type="number"
                    className="tags_modal_input tags_text_normal"
                    value={form.amount}
                    onChange={(e) =>
                        update("amount", e.target.value)
                    }
                />
            </div>

            <div className="tags_modal_group">
                <label className="tags_modal_label">
                    Moneda
                </label>

                <input
                    className="tags_modal_input tags_text_normal"
                    value={form.currency}
                    onChange={(e) =>
                        update("currency", e.target.value)
                    }
                />
            </div>

            {
                editMode && (
                    <>
                        <div className="tags_modal_group">
                            <label className="tags_modal_label">
                                Inicio
                            </label>

                            <input
                                type="date"
                                className="tags_modal_input tags_text_normal"
                                value={form.started_at}
                                onChange={(e) =>
                                    update("started_at", e.target.value)
                                }
                            />
                        </div>

                        <div className="tags_modal_group">
                            <label className="tags_modal_label">
                                Vencimiento
                            </label>

                            <input
                                type="date"
                                className="tags_modal_input tags_text_normal"
                                value={form.expires_at}
                                onChange={(e) =>
                                    update("expires_at", e.target.value)
                                }
                            />
                        </div>

                        <div className="tags_modal_group">
                            <label className="tags_modal_label">
                                Próxima facturación
                            </label>

                            <input
                                type="date"
                                className="tags_modal_input tags_text_normal"
                                value={form.next_billing_at}
                                onChange={(e) =>
                                    update("next_billing_at", e.target.value)
                                }
                            />
                        </div>
                    </>
                )
            }

            <div className="tags_modal_group">
                <label className="tags_modal_label">
                    Días de gracia
                </label>

                <input
                    type="number"
                    min="0"
                    className="tags_modal_input tags_text_normal"
                    value={form.grace_days}
                    onChange={(e) =>
                        update("grace_days", e.target.value)
                    }
                />
            </div>

            <div className="tags_modal_group">
                <label className="tags_modal_label">
                    Override hasta
                </label>

                <input
                    type="date"
                    className="tags_modal_input tags_text_normal"
                    value={form.admin_override_until}
                    onChange={(e) =>
                        update("admin_override_until", e.target.value)
                    }
                />
            </div>

            <div className="tags_modal_group tags_modal_form_full">
                <label className="tags_modal_label">
                    Notas override
                </label>

                <textarea
                    className="tags_modal_input tags_text_normal"
                    value={form.admin_override_notes}
                    onChange={(e) =>
                        update("admin_override_notes", e.target.value)
                    }
                />
            </div>

            <div className="tags_modal_group tags_modal_form_full">
                <label className="tags_modal_label">
                    Configuración
                </label>

                <div className="tags_modal_flags_grid">

                    <label>
                        <input
                            type="checkbox"
                            checked={!!form.auto_renew}
                            onChange={(e) =>
                                update("auto_renew", e.target.checked)
                            }
                        />
                        Auto renovar
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={!!form.auto_disable_on_expire}
                            onChange={(e) =>
                                update("auto_disable_on_expire", e.target.checked)
                            }
                        />
                        Deshabilitar al vencer
                    </label>

                </div>
            </div>

        </div>
    );
}
