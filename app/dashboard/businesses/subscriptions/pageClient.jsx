"use client";

// =====================================
// PAGE CLIENT: /dashboard/businesses/subscriptions
// Descripción: Listado global admin de suscripciones con filtros por cliente, vencimiento y estado.
// =====================================

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import showAlert
    from "@/app/components/showAlert";

import "@/app/styles/tagsModals.css";

const STATUS_OPTIONS = [
    {
        value: "",
        label: "Todos"
    },
    {
        value: "active",
        label: "Activo"
    },
    {
        value: "trial",
        label: "Prueba"
    },
    {
        value: "past_due",
        label: "Vencido"
    },
    {
        value: "inactive",
        label: "Inactivo"
    },
    {
        value: "cancelled",
        label: "Cancelado"
    }
];

function formatDate(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleDateString("es-AR");
}

function formatMoney(amount, currency = "ARS") {
    return `${currency || "ARS"} ${Number(amount || 0).toLocaleString("es-AR")}`;
}

function bool(value) {
    return Number(value) === 1 || value === true;
}

function getTodayInput() {
    return new Date().toISOString().slice(0, 10);
}

function addDaysInput(days) {
    const date =
        new Date();

    date.setDate(
        date.getDate() + Number(days || 0)
    );

    return date.toISOString().slice(0, 10);
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

function getDaysToExpire(expiresAt) {
    if (!expiresAt) {
        return null;
    }

    const today =
        new Date();

    today.setHours(0, 0, 0, 0);

    const expires =
        new Date(expiresAt);

    expires.setHours(0, 0, 0, 0);

    const diff =
        expires.getTime() - today.getTime();

    return Math.ceil(
        diff / (1000 * 60 * 60 * 24)
    );
}

function getExpireLabel(sub) {
    const days =
        getDaysToExpire(sub.expires_at);

    if (days === null) {
        return "Sin vencimiento";
    }

    if (days < 0) {
        return `Venció hace ${Math.abs(days)} días`;
    }

    if (days === 0) {
        return "Vence hoy";
    }

    return `Vence en ${days} días`;
}

export default function BusinessSubscriptionsGlobalClient() {

    const router =
        useRouter();

    const [subscriptions, setSubscriptions] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [filters, setFilters] =
        useState({
            client: "",
            status: "",
            expire_before: ""
        });

    useEffect(() => {
        load();
    }, [
        filters.status,
        filters.expire_before
    ]);

    async function load() {

        try {

            setLoading(true);

            const params =
                new URLSearchParams();

            if (filters.status) {
                params.set(
                    "status",
                    filters.status
                );
            }

            if (filters.expire_before) {
                params.set(
                    "expire_before",
                    filters.expire_before
                );
            }

            const res =
                await fetch(
                    `/api/subscriptions/get?${params.toString()}`
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudieron cargar las suscripciones"
                );
            }

            setSubscriptions(
                Array.isArray(data.data)
                    ? data.data
                    : []
            );

        } catch (err) {

            console.error("GLOBAL SUBSCRIPTIONS LOAD ERROR:", err);

            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {

            setLoading(false);
        }
    }

    function updateFilter(key, value) {

        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    }

    function clearFilters() {

        setFilters({
            client: "",
            status: "",
            expire_before: ""
        });
    }

    const filteredSubscriptions =
        useMemo(() => {

            const term =
                filters.client.trim().toLowerCase();

            if (!term) {
                return subscriptions;
            }

            return subscriptions.filter(sub => {
                return (
                    sub.business_name?.toLowerCase().includes(term) ||
                    sub.business_email?.toLowerCase().includes(term) ||
                    String(sub.business_id || "").includes(term)
                );
            });

        }, [
            subscriptions,
            filters.client
        ]);

    const counters =
        useMemo(() => {

            const total =
                filteredSubscriptions.length;

            const active =
                filteredSubscriptions.filter(
                    sub => sub.status === "active"
                ).length;

            const next15 =
                filteredSubscriptions.filter(sub => {
                    const days =
                        getDaysToExpire(sub.expires_at);

                    return (
                        sub.status === "active" &&
                        days !== null &&
                        days >= 0 &&
                        days <= 15
                    );
                }).length;

            const next30 =
                filteredSubscriptions.filter(sub => {
                    const days =
                        getDaysToExpire(sub.expires_at);

                    return (
                        sub.status === "active" &&
                        days !== null &&
                        days >= 0 &&
                        days <= 30
                    );
                }).length;

            const expired =
                filteredSubscriptions.filter(sub => {
                    const days =
                        getDaysToExpire(sub.expires_at);

                    return (
                        sub.status === "past_due" ||
                        (
                            days !== null &&
                            days < 0
                        )
                    );
                }).length;

            return {
                total,
                active,
                next15,
                next30,
                expired
            };

        }, [
            filteredSubscriptions
        ]);

    return (
        <div className="container-fluid m-0 p-3 tags_text_normal">

            <div className="row d-flex justify-content-between align-items-center mt-3 mb-4">

                <div className="col-12 col-md-7">
                    <h1 className="tags_title">
                        Suscripciones
                    </h1>

                    <p className="m-0 text-muted">
                        Vista global de clientes, planes, estados y vencimientos.
                    </p>
                </div>

                <div className="col-12 col-md-5 d-flex justify-content-md-end mt-3 mt-md-0 gap-2">
                    <button
                        type="button"
                        className="tags_btn tags_text_normal"
                        style={{
                            maxWidth: "170px"
                        }}
                        onClick={() =>
                            router.push("/dashboard/businesses")
                        }
                    >
                        ← Clientes
                    </button>
                </div>

            </div>

            <div className="row mb-4">

                <div className="col-6 col-md-3 mb-3">
                    <div className="tags_result_card h-100 mt-0">
                        <small className="text-muted">
                            Total
                        </small>

                        <h3 className="mt-2 mb-0">
                            {counters.total}
                        </h3>
                    </div>
                </div>

                <div className="col-6 col-md-3 mb-3">
                    <div className="tags_result_card h-100 mt-0">
                        <small className="text-muted">
                            Activas
                        </small>

                        <h3 className="mt-2 mb-0">
                            {counters.active}
                        </h3>
                    </div>
                </div>

                <div className="col-6 col-md-3 mb-3">
                    <div className="tags_result_card h-100 mt-0">
                        <small className="text-muted">
                            Vencen 15 días
                        </small>

                        <h3 className="mt-2 mb-0">
                            {counters.next15}
                        </h3>
                    </div>
                </div>

                <div className="col-6 col-md-3 mb-3">
                    <div className="tags_result_card h-100 mt-0">
                        <small className="text-muted">
                            Vencidas
                        </small>

                        <h3 className="mt-2 mb-0">
                            {counters.expired}
                        </h3>
                    </div>
                </div>

            </div>

            <div className="card mb-4 p-2">

                <div className="row d-flex justify-content- start align-items-end m-0 p-0">

                    <div className="col-12 col-md-4 mb-3">
                        <label className="tags_form_label">
                            Cliente
                        </label>

                        <input
                            className="tags_input tags_text_normal"
                            value={filters.client}
                            onChange={(e) =>
                                updateFilter(
                                    "client",
                                    e.target.value
                                )
                            }
                            placeholder="Nombre, email o ID"
                        />
                    </div>

                    <div className="col-12 col-md-3 mb-3">
                        <label className="tags_form_label">
                            Estado
                        </label>

                        <select
                            className="tags_input tags_text_normal"
                            value={filters.status}
                            onChange={(e) =>
                                updateFilter(
                                    "status",
                                    e.target.value
                                )
                            }
                        >
                            {
                                STATUS_OPTIONS.map(option => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))
                            }
                        </select>
                    </div>

                    <div className="col-12 col-md-3 mb-3">
                        <label className="tags_form_label">
                            Vence hasta
                        </label>

                        <input
                            type="date"
                            className="tags_input tags_text_normal"
                            value={filters.expire_before}
                            onChange={(e) =>
                                updateFilter(
                                    "expire_before",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="col-12 col-md-2 mb-3 d-flex align-items-start justify-content-center m-0">
                        <button
                            type="button"
                            className="tags_btn tags_text_normal m-0"
                            onClick={clearFilters}
                        >
                            Limpiar
                        </button>
                    </div>

                </div>

                <div className="d-flex gap-2 flex-wrap mt-2">

                    <button
                        type="button"
                        className="tags_modal_btn tags_modal_btn_cancel"
                        onClick={() =>
                            updateFilter(
                                "expire_before",
                                getTodayInput()
                            )
                        }
                    >
                        Vence hoy
                    </button>

                    <button
                        type="button"
                        className="tags_modal_btn tags_modal_btn_cancel"
                        onClick={() =>
                            updateFilter(
                                "expire_before",
                                addDaysInput(15)
                            )
                        }
                    >
                        Próximas 15 días
                    </button>

                    <button
                        type="button"
                        className="tags_modal_btn tags_modal_btn_cancel"
                        onClick={() =>
                            updateFilter(
                                "expire_before",
                                addDaysInput(30)
                            )
                        }
                    >
                        Próximas 30 días
                    </button>

                    <button
                        type="button"
                        className="tags_modal_btn tags_modal_btn_cancel"
                        onClick={() =>
                            updateFilter(
                                "status",
                                "past_due"
                            )
                        }
                    >
                        Vencidas
                    </button>

                </div>

            </div>

            <div className="tags_table_wrapper mb-5">

                <table className="tags_table tags_text_normal">

                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Cliente</th>
                            <th>Plan</th>
                            <th>Estado</th>
                            <th>Inicio</th>
                            <th>Vence</th>
                            <th>Detalle</th>
                            <th>Monto</th>
                            <th>Auto</th>
                            <th>Override</th>
                            <th className="text-center">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>

                        {
                            loading && (
                                <tr>
                                    <td colSpan={11}>
                                        Cargando suscripciones...
                                    </td>
                                </tr>
                            )
                        }

                        {
                            !loading &&
                            filteredSubscriptions.length === 0 && (
                                <tr>
                                    <td colSpan={11}>
                                        No hay suscripciones para los filtros seleccionados.
                                    </td>
                                </tr>
                            )
                        }

                        {
                            !loading &&
                            filteredSubscriptions.map(sub => {

                                const days =
                                    getDaysToExpire(sub.expires_at);

                                return (
                                    <tr key={sub.id}>

                                        <td>
                                            #{sub.id}
                                        </td>

                                        <td>
                                            <strong>
                                                {sub.business_name}
                                            </strong>

                                            <div
                                                className="text-muted"
                                                style={{
                                                    fontSize: 12
                                                }}
                                            >
                                                {sub.business_email}
                                            </div>
                                        </td>

                                        <td>
                                            <strong>
                                                {sub.plan_name}
                                            </strong>

                                            <div
                                                className="text-muted"
                                                style={{
                                                    fontSize: 12
                                                }}
                                            >
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
                                            <span
                                                className={
                                                    days !== null &&
                                                    days <= 15
                                                        ? "text-danger"
                                                        : "text-muted"
                                                }
                                                style={{
                                                    fontSize: 12
                                                }}
                                            >
                                                {getExpireLabel(sub)}
                                            </span>
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
                                                    style={{minWidth:"70px", minHeight:"45px"}}
                                                    type="button"
                                                    className="icon_btn"
                                                    title="Ver suscripción del cliente"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/businesses/${sub.business_id}/subscriptions`
                                                        )
                                                    }
                                                >
                                                    👤
                                                </button>

                                                <button
                                                 style={{minWidth:"70px", minHeight:"45px"}}
                                                    type="button"
                                                    className="icon_btn"
                                                    title="Ver cliente"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/businesses/${sub.business_id}`
                                                        )
                                                    }
                                                >
                                                    🔎
                                                </button>

                                            </div>

                                        </td>

                                    </tr>
                                );
                            })
                        }

                    </tbody>

                </table>

            </div>

        </div>
    );
}
