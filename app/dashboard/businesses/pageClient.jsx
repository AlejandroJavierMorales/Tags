"use client";


import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
/* import TagsHeader from "../../components/Header"; */
import { FaUser } from "react-icons/fa";
import "../../styles/tagsModals.css";
import {
    isRequired,
    isValidEmail,
    normalizeEmail
} from "@/app/lib/validators";
import { formatDate } from "../../lib/formatDate";
import { getSubscriptionStatusLabel } from "../../lib/helpers/getSubscriptionStatusLabel";
import { isExpiring } from "../../lib/dateUtils";
import showAlert from "@/app/components/showAlert";

import { FiDownload } from "react-icons/fi";
import { FaGoogle } from "react-icons/fa";

export default function BusinessesPageClient({ session }) {
    const [list, setList] = useState([]);
    const [open, setOpen] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const [editOpen, setEditOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editPhone, setEditPhone] = useState("");

    const [search, setSearch] = useState("");

    const [plans, setPlans] = useState([]);

    const [planId, setPlanId] = useState("");

    const [editPlanId, setEditPlanId] = useState("");
    const [originalEmail, setOriginalEmail] = useState("");
    const [originalPlanId, setOriginalPlanId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [editStartDate, setEditStartDate] = useState("");
    const [durationMonths, setDurationMonths] = useState(1);
    const [editDurationMonths, setEditDurationMonths] = useState(1);

    const [planFilter, setPlanFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [expiringFilter, setExpiringFilter] = useState(false);

    const router = useRouter();



    async function load() {
        const res = await fetch("/api/business/list");
        const data = await res.json().catch(() => []);
        setList(Array.isArray(data) ? data : []);
    }

    async function loadPlans() {

        const res = await fetch("/api/plans/list");

        const data = await res.json().catch(() => []);

        setPlans(Array.isArray(data) ? data : []);
    }

    function openEdit(b) {
        setEditId(b.id);
        setEditName(b.name || "");
        setEditEmail(b.email || "");
        setEditPhone(b.phone || "");
        setEditStartDate(
            b.subscription_started_at
                ? new Date(b.subscription_started_at).toISOString().slice(0, 10)
                : ""
        );

        setEditDurationMonths(
            b.subscription_duration_months || 1
        );

        setEditPlanId(b.plan_id || "");
        setOriginalPlanId(b.plan_id || "");
        setOriginalEmail(b.email || "");

        setEditOpen(true);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        load();
        loadPlans();
    }, []);

    async function create() {



        if (!isRequired(name)) {
            showAlert({
                title: "Error",
                text: "El nombre es obligatorio",
                icon: "error"
            });
            return;
        }

        if (!isRequired(email)) {
            showAlert({
                title: "Error",
                text: "El email es obligatorio",
                icon: "error"
            });
            return;
        }

        if (!isValidEmail(email)) {
            showAlert({
                title: "Error",
                text: "Ingresá un email válido",
                icon: "error"
            });
            return;
        }

        if (!planId) {
            showAlert({
                title: "Error",
                text: "Debés seleccionar un plan",
                icon: "error"
            });
            return;
        }

        if (!startDate) {
            showAlert({
                title: "Error",
                text: "Debés seleccionar fecha de inicio",
                icon: "error"
            });
            return;
        }

        if (isNaN(new Date(startDate).getTime())) {
            showAlert({
                title: "Error",
                text: "Fecha de inicio inválida",
                icon: "error"
            });
            return;
        }

        if (!durationMonths || Number(durationMonths) < 1) {
            showAlert({
                title: "Error",
                text: "Duración inválida",
                icon: "error"
            });
            return;
        }

        const payload = {
            name: name.trim(),
            email: normalizeEmail(email),
            phone: phone?.trim() || null,
            plan_id: planId,
            duration_months: Number(durationMonths),
            start_date: startDate
        };

        const res = await fetch("/api/business/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showAlert({
                title: "Error",
                text: data.error || "Error creando cliente",
                icon: "error"
            });
            return;
        }

        showAlert({
            title: "OK",
            text: "Cliente creado correctamente",
            icon: "success"
        });

        setName("");
        setEmail("");
        setPhone("");
        setPlanId("");
        setOpen(false);

        load();
    }

    async function removeBusiness(id) {

        const confirmed = await showAlert({
            title: "¿Eliminar cliente?",
            text: "Esta acción no se puede deshacer",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
        });

        if (!confirmed) return;

        console.log("quiero borrar a " + id);

        const res = await fetch(`/api/business/delete?id=${id}`, {
            method: "DELETE"
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            await showAlert({
                title: "Error",
                text: data.error || "No se pudo eliminar",
                icon: "error"
            });
            return;
        }

        await showAlert({
            title: "OK",
            text: "Cliente eliminado",
            icon: "success"
        });

        load();
    }

    async function saveEdit() {

        if (!isRequired(editName)) {
            showAlert({
                title: "Error",
                text: "El nombre es obligatorio",
                icon: "error"
            });
            return;
        }

        if (!isRequired(editEmail)) {
            showAlert({
                title: "Error",
                text: "El email es obligatorio",
                icon: "error"
            });
            return;
        }

        if (!isValidEmail(editEmail)) {
            showAlert({
                title: "Error",
                text: "Ingresá un email válido",
                icon: "error"
            });
            return;
        }

        if (!editPlanId) {
            showAlert({
                title: "Error",
                text: "Debés seleccionar un plan",
                icon: "error"
            });
            return;
        }

        if (!editStartDate) {
            showAlert({
                title: "Error",
                text: "Debés seleccionar fecha de inicio",
                icon: "error"
            });
            return;
        }

        if (isNaN(new Date(editStartDate).getTime())) {
            showAlert({
                title: "Error",
                text: "Fecha inválida",
                icon: "error"
            });
            return;
        }

        if (!editDurationMonths || Number(editDurationMonths) < 1) {
            showAlert({
                title: "Error",
                text: "Duración inválida",
                icon: "error"
            });
            return;
        }

        // 🚨 WARNING SI CAMBIA PLAN
        if (originalPlanId !== editPlanId) {

            const confirmed = await showAlert({
                title: "Cambio de plan",
                text: "Se cerrará la suscripción actual y se creará una nueva. ¿Continuar?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, continuar",
                cancelButtonText: "Cancelar"
            });

            if (!confirmed) return;
        }

        // 🚨 WARNING SI CAMBIA EMAIL
        let confirmed = true;

        if (originalEmail !== editEmail) {

            confirmed = await showAlert({
                title: "Modificar email",
                text: "Se van a modificar el email en todos los movimientos y QR de su propiedad. ¿Deseás continuar?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, continuar",
                cancelButtonText: "Cancelar"
            });
        }

        if (!confirmed) return;

        const res = await fetch("/api/business/update", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: editId,
                name: editName.trim(),
                email: normalizeEmail(editEmail),
                phone: editPhone?.trim() || null,
                plan_id: editPlanId,
                duration_months: Number(editDurationMonths),
                start_date: editStartDate
            })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showAlert({
                title: "Error",
                text: data.error || "Error actualizando cliente",
                icon: "error"
            });
            return;
        }

        showAlert({
            title: "OK",
            text: "Cliente actualizado correctamente",
            icon: "success"
        });

        setEditOpen(false);
        load();
    }

    const filteredList = list.filter(b => {

        const term = search.toLowerCase();

        const matchesSearch =
            b.name?.toLowerCase().includes(term) ||
            b.email?.toLowerCase().includes(term);

        const matchesPlan =
            !planFilter || b.plan_name === planFilter;

        const matchesStatus =
            !statusFilter || b.subscription_status === statusFilter;

        const matchesExpiring =
            !expiringFilter || isExpiring(b.subscription_expires_at);

        return matchesSearch && matchesPlan && matchesStatus && matchesExpiring;
    });



    return (
        <div className="container-fluid  m-0 p-1">
            {/* <TagsHeader /> */}
            {/* HEADER */}
            <div className="row d-flex justify-content-start align-items-center mt-3 mb-5">
                <div className="col-12 col-md-8 d-flex justify-content-start align-items-center mb-3">
                    <h1 className="tags_title ms-2"><FaUser className="me-2" />Clientes</h1>

                    <button
                        className="tags_btn rounded ms-4 tags_text_normal"
                        style={{ maxWidth: "150px" }}
                        onClick={() => setOpen(true)}
                    >
                        ✚ Nuevo cliente
                    </button>
                </div>
                <div className="col-12 col-md-4 mb-3">
                    <input
                        type="text"
                        className="form-control tags_text_normal"
                        placeholder="Buscar por nombre o email..."
                        style={{ maxWidth: "450px" }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                </div>
                <div className="col-12 mt-4 d-flex justify-content-center align-items-center">
                    <div className="d-flex gap-2 flex-wrap mb-3 w-100 ps-2">

                        {/* PLAN */}
                        <select
                            className="form-control tags_text_normal"
                            style={{ maxWidth: "200px" }}
                            value={planFilter}
                            onChange={(e) => setPlanFilter(e.target.value)}
                        >
                            <option value="">Todos los planes</option>
                            {plans.map(p => (
                                <option key={p.id} value={p.name}>
                                    {p.name}
                                </option>
                            ))}
                        </select>

                        {/* STATUS */}
                        <select
                            className="form-control tags_text_normal"
                            style={{ maxWidth: "200px" }}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">Todos los estados</option>
                            <option value="trial">Trial</option>
                            <option value="active">Activo</option>
                            <option value="inactive">Inactivo</option>
                            <option value="past_due">Pago pendiente</option>
                            <option value="cancelled">Cancelado</option>
                            <option value="expired">Vencido</option>
                        </select>

                        {/* EXPIRING */}
                        <label className="d-flex align-items-center gap-2 tags_text_normal">
                            <input
                                type="checkbox"
                                checked={expiringFilter}
                                onChange={(e) => setExpiringFilter(e.target.checked)}
                            />
                            Próximos a vencer (15 días)
                        </label>

                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="tags_table_wrapper mb-5 pb-5">

                <table className="tags_table tags_text_normal">

                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Email</th>
                            <th>Telefono</th>
                            <th>Plan</th>
                            <th>Monto $</th>
                            <th className="text-center">Estado</th>
                            <th>Fecha Inicio</th>
                            <th>Fecha Fin</th>
                            <th className="text-center">QRs</th>
                            <th className="text-center">Activos</th>
                            <th className="text-center">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredList.map(b => (
                            <tr key={b.id}>

                                <td className="bold">{b.name}</td>
                                <td>{b.email}</td>
                                <td>{b.phone}</td>

                                <td>{b.plan_name}</td>
                                <td>{`$ ${b.subscription_amount || 0}`}</td>
                                {/* <td>{b.subscription_status}</td> */}
                                <td className="text-center"><span className={`badge ${b.subscription_status}`}>{getSubscriptionStatusLabel(b.subscription_status)}
                                </span></td>

                                <td>{formatDate(b.subscription_started_at)}</td>
                                <td>{formatDate(b.subscription_expires_at)}</td>

                                <td className="text-center">{b.qr_count || 0}</td>
                                <td className="text-center">{b.active_qrs || 0}</td>


                                <td className="text-center">
                                    <div className="tags_actions">

                                        <button
                                            className="icon_btn"
                                            title="Ver QRs"
                                            onClick={() => router.push(`/dashboard/businesses/${b.id}`)}
                                        >
                                            ⌗
                                        </button>

                                        <button
                                            className="icon_btn"
                                            title="Editar"
                                            onClick={() => openEdit(b)}
                                        >
                                            ✏️
                                        </button>

                                        <button
                                            className="icon_btn danger"
                                            title="Eliminar"
                                            onClick={() => removeBusiness(b.id)}
                                        >
                                            🗑
                                        </button>

                                        <button className="icon_btn" title="Estadísticas"
                                            onClick={() => router.push(`/dashboard/businesses/stats?business_id=${b.id}`)}
                                        >
                                            📊
                                        </button>

                                        <button
                                            className="icon_btn"
                                            title="+ Productos"
                                            onClick={() =>
                                                router.push(`/dashboard/businesses/${b.id}/addons`)
                                            }
                                        >
                                            🧩
                                        </button>

                                    </div>
                                </td>

                            </tr>
                        ))}
                    </tbody>

                </table>

            </div>

            {/* ===================================== */}
            {/* CREATE CLIENT MODAL */}
            {/* ===================================== */}

            {open && (
                <div className="tags_modal_overlay tags_text_normal">
                    <div className="tags_modal_card">

                        <button
                            className="tags_modal_close"
                            onClick={() => setOpen(false)}
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header text-center">
                            <h2 className="tags_modal_title tags_title">
                                Nuevo cliente
                            </h2>
                            <p className="tags_modal_description">
                                Completá los datos del cliente
                            </p>
                        </div>

                        <div className="tags_modal_body">

                            {/* NAME */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Nombre</label>
                                <input
                                    className="tags_modal_input tags_text_normal"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Nombre"
                                />
                            </div>

                            {/* EMAIL */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Email</label>
                                <input
                                    className="tags_modal_input tags_text_normal"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email"
                                />
                            </div>

                            {/* PHONE */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Teléfono</label>
                                <input
                                    className="tags_modal_input tags_text_normal"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Opcional"
                                />
                            </div>

                            {/* PLAN */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Plan *</label>
                                <select
                                    className="tags_modal_input tags_text_normal"
                                    value={planId}
                                    onChange={(e) => setPlanId(e.target.value)}
                                >
                                    <option value="">Seleccionar plan</option>
                                    {plans.map((plan) => (
                                        <option key={plan.id} value={plan.id}>
                                            {plan.name} — {plan.currency} {plan.price}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* START DATE */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Inicio de suscripción</label>
                                <input
                                    type="date"
                                    className="tags_modal_input tags_text_normal"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            {/* DURATION */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Duración (meses)</label>
                                <select
                                    className="tags_modal_input tags_text_normal"
                                    value={durationMonths}
                                    onChange={(e) => setDurationMonths(e.target.value)}
                                >
                                    <option value={1}>1 mes</option>
                                    <option value={3}>3 meses</option>
                                    <option value={6}>6 meses</option>
                                    <option value={12}>12 meses</option>
                                </select>
                            </div>

                        </div>

                        <div className="tags_modal_actions">
                            <button
                                className="tags_modal_btn tags_modal_btn_success"
                                onClick={create}
                            >
                                ✚ Crear
                            </button>

                            <button
                                className="tags_modal_btn tags_modal_btn_cancel"
                                onClick={() => setOpen(false)}
                            >
                                ✖ Cancelar
                            </button>
                        </div>

                    </div>
                </div>
            )}


            {/* ===================================== */}
            {/* EDIT CLIENT MODAL */}
            {/* ===================================== */}

            {editOpen && (
                <div className="tags_modal_overlay tags_text_normal">
                    <div className="tags_modal_card">

                        <button
                            className="tags_modal_close"
                            onClick={() => setEditOpen(false)}
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header text-center">
                            <h2 className="tags_modal_title tags_title">
                                Editar cliente
                            </h2>
                            <p className="tags_modal_description">
                                Actualizá la información del cliente
                            </p>
                        </div>

                        <div className="tags_modal_body">

                            {/* NAME */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Nombre</label>
                                <input
                                    className="tags_modal_input tags_text_normal"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                />
                            </div>

                            {/* EMAIL */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Email</label>
                                <input
                                    className="tags_modal_input tags_text_normal"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                />
                            </div>

                            {/* PHONE */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Teléfono</label>
                                <input
                                    className="tags_modal_input tags_text_normal"
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                />
                            </div>

                            {/* PLAN */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Plan *</label>
                                <select
                                    className="tags_modal_input tags_text_normal"
                                    value={editPlanId}
                                    onChange={(e) => setEditPlanId(e.target.value)}
                                >
                                    <option value="">Seleccionar plan</option>
                                    {plans.map((plan) => (
                                        <option key={plan.id} value={plan.id}>
                                            {plan.name} — {plan.currency} {plan.price}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* START DATE */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Inicio de suscripción</label>
                                <input
                                    type="date"
                                    className="tags_modal_input tags_text_normal"
                                    value={editStartDate}
                                    onChange={(e) => setEditStartDate(e.target.value)}
                                />
                            </div>

                            {/* DURATION */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Duración (meses)</label>
                                <select
                                    className="tags_modal_input tags_text_normal"
                                    value={editDurationMonths}
                                    onChange={(e) => setEditDurationMonths(e.target.value)}
                                >
                                    <option value={1}>1 mes</option>
                                    <option value={3}>3 meses</option>
                                    <option value={6}>6 meses</option>
                                    <option value={12}>12 meses</option>
                                </select>
                            </div>

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
                                onClick={() => setEditOpen(false)}
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