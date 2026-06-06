"use client";

import { useEffect, useState } from "react";

import "../../styles/tagsModals.css";

import showAlert from "@/app/components/showAlert";
import TagsHeader from "@/app/components/Header";

import Link from "next/link";
import OwnerNavigation from "@/app/modules/e-events/components/OwnerNavigation";
import EventOwnerHeader from "@/app/modules/e-events/components/EventOwnerHeader";
import { badgeStatusEvent, statusLabelEvent } from "@/app/modules/e-events/lib/helpers/labelsAndBadgesStatus";

export default function EventsPageClient({ session, isStaff }) {

    const [events, setEvents] = useState([]);

    const [filters, setFilters] = useState({
        search: "",
        status: ""
    });

    const [modal, setModal] = useState(null);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");

    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");

    const [status, setStatus] = useState("draft");

   /*  console.log('SESSION en Eventos Globales ' + JSON.stringify(session,2,null)) */
    // =========================
    // LOAD
    // =========================

    useEffect(() => {
        load();
    }, [filters]);


    async function load() {

        try {

            const params =
                new URLSearchParams();

            if (filters.search) {

                params.append(
                    "search",
                    filters.search
                );
            }

            if (filters.status) {

                params.append(
                    "status",
                    filters.status
                );
            }

            // =========================
            // STAFF / OWNER API
            // =========================

            const endpoint =
                isStaff
                    ? `/api/events/staff/my-events?${params.toString()}`
                    : `/api/events/list?${params.toString()}`;

            const res =
                await fetch(
                    endpoint,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudieron cargar los eventos",
                    icon: "error"
                });

                return;
            }

            setEvents(
                data.data || []
            );

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text:
                    "No se pudieron cargar los eventos",
                icon: "error"
            });
        }
    }

    // =========================
    // CREATE / UPDATE
    // =========================

    async function saveEvent() {

        try {

            const body = {

                id: modal?.id,
                business_id: session?.businessId,
                name,
                description,
                location,

                starts_at: startsAt,
                ends_at: endsAt,

                status
            };

            const res = await fetch(
                modal?.id
                    ? "/api/events/update"
                    : "/api/events/create",
                {
                    method:
                        modal?.id
                            ? "PUT"
                            : "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify(body)
                }
            );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo guardar",
                    icon: "error"
                });

                return;
            }

            showAlert({
                title: "OK",
                text: modal?.id
                    ? "Evento actualizado"
                    : "Evento creado",
                icon: "success"
            });

            closeModal();

            load();

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: "Error interno",
                icon: "error"
            });
        }
    }

    // =========================
    // DELETE
    // =========================

    async function deleteEvent(id) {

        const confirm =
            await showAlert({
                title: "¿Eliminar evento?",
                text: "Esta acción no se puede deshacer",
                icon: "warning",
                showCancelButton: true
            });

        if (!confirm) return;

        try {

            const res = await fetch(
                "/api/events/delete",
                {
                    method: "DELETE",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({ id })
                }
            );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo eliminar",
                    icon: "error"
                });

                return;
            }

            showAlert({
                title: "OK",
                text: "Evento eliminado",
                icon: "success"
            });

            load();

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: "Error interno",
                icon: "error"
            });
        }
    }

    // =========================
    // MODALS
    // =========================

    function openCreate() {

        setModal({ id: null });

        setName("");
        setDescription("");
        setLocation("");

        setStartsAt("");
        setEndsAt("");

        setStatus("draft");
    }

    function openEdit(event) {

        setModal(event);

        setName(event.name || "");

        setDescription(
            event.description || ""
        );

        setLocation(
            event.location || ""
        );

        setStartsAt(
            formatDateInput(
                event.starts_at
            )
        );

        setEndsAt(
            formatDateInput(
                event.ends_at
            )
        );

        setStatus(
            event.status || "draft"
        );
    }

    function closeModal() {

        setModal(null);

        setName("");
        setDescription("");
        setLocation("");

        setStartsAt("");
        setEndsAt("");

        setStatus("draft");
    }


    // =========================
    // HELPERS
    // =========================

    function formatDateInput(date) {

        if (!date) return "";

        const d = new Date(date);

        const year =
            d.getFullYear();

        const month =
            String(d.getMonth() + 1)
                .padStart(2, "0");

        const day =
            String(d.getDate())
                .padStart(2, "0");

        const hours =
            String(d.getHours())
                .padStart(2, "0");

        const minutes =
            String(d.getMinutes())
                .padStart(2, "0");

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    function formatDate(date) {

        if (!date) return "-";

        const d =
            new Date(date);

        return d.toLocaleString();
    }

    // =========================
    // STATS
    // =========================

    const totalEvents =
        events.length;

    const activeEvents =
        events.filter(
            e => e.status === "active"
        ).length;

    const publishedEvents =
        events.filter(
            e => e.status === "published"
        ).length;

    const draftEvents =
        events.filter(
            e => e.status === "draft"
        ).length;

    return (

        <div className="container-fluid tags_container m-0 p-0 mb-5 pb-5">

            <EventOwnerHeader session={session} />

            <div className="m-0 p-0 pt-4 px-2">
                <OwnerNavigation session={session} />

                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center mb-4">

                    <div>

                        <h2 className="tags_title mb-1">
                            🎫 Eventos
                        </h2>

                        <p className="text-muted m-0">
                            Gestión completa de eventos,
                            invitados y staff.
                        </p>

                    </div>

                    <button
                        className="tags_btn"
                        onClick={openCreate}
                    >
                        ✚ Nuevo Evento
                    </button>

                </div>

                {/* STATS */}
                <div className="row g-3 mb-4">

                    <div className="col-6 col-md-3">

                        <div className="tags_card p-3">

                            <div className="small text-muted">
                                Total Eventos
                            </div>

                            <div className="fs-2 fw-bold">
                                {totalEvents}
                            </div>

                        </div>

                    </div>

                    <div className="col-6 col-md-3">

                        <div className="tags_card p-3">

                            <div className="small text-muted">
                                Activos
                            </div>

                            <div className="fs-2 fw-bold">
                                {activeEvents}
                            </div>

                        </div>

                    </div>

                    <div className="col-6 col-md-3">

                        <div className="tags_card p-3">

                            <div className="small text-muted">
                                Publicados
                            </div>

                            <div className="fs-2 fw-bold">
                                {publishedEvents}
                            </div>

                        </div>

                    </div>

                    <div className="col-6 col-md-3">

                        <div className="tags_card p-3">

                            <div className="small text-muted">
                                Borradores
                            </div>

                            <div className="fs-2 fw-bold">
                                {draftEvents}
                            </div>

                        </div>

                    </div>

                </div>

                {/* FILTERS */}
                <div className="row g-2 mb-4">

                    <div className="col-md-4">

                        <input
                            className="tags_modal_input"
                            placeholder="Buscar evento"
                            value={filters.search}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    search: e.target.value
                                }))
                            }
                        />

                    </div>

                    <div className="col-md-3">

                        <select
                            className="tags_modal_input"
                            value={filters.status}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    status: e.target.value
                                }))
                            }
                        >

                            <option value="">
                                Todos los estados
                            </option>

                            <option value="draft">
                                Borrador
                            </option>

                            <option value="published">
                                Publicado
                            </option>

                            <option value="active">
                                Activo
                            </option>

                            <option value="finished">
                                Finalizado
                            </option>

                            <option value="cancelled">
                                Cancelado
                            </option>

                        </select>

                    </div>

                </div>

                {/* EVENTS GRID */}
                <div className="row g-3">

                    {events.map((event, index) => (

                        <div
                            className="col-md-6 col-xl-4"
                            key={event.id}
                        >

                            <div
                                className="card p-3 h-100 d-flex flex-column"
                                style={{
                                    background:
                                        index % 2 === 0
                                            ? "#ffffff"
                                            : "#f7fbf7",
                                    transition: "all .2s ease"
                                }}
                            >

                                <div className="d-flex justify-content-between align-items-start mb-3">

                                    <div>

                                        <h5 className="mb-1">
                                            {event.name}
                                        </h5>

                                        <div className="small text-muted">
                                            {event.location || "-"}
                                        </div>

                                    </div>

                                    <span
                                        className={
                                            badgeStatusEvent(event.status)
                                        }
                                    >
                                        {
                                            statusLabelEvent(
                                                event.status
                                            )
                                        }
                                    </span>

                                </div>

                                <div className="small text-muted mb-2">
                                    Inicio:
                                    {" "}
                                    {formatDate(event.starts_at)}
                                </div>

                                <div className="small text-muted mb-3">
                                    Fin:
                                    {" "}
                                    {formatDate(event.ends_at)}
                                </div>

                                <div className="flex-grow-1">

                                    <p className="small">
                                        {
                                            event.description ||
                                            "Sin descripción"
                                        }
                                    </p>

                                </div>

                                <div className="d-flex gap-2 mt-3 flex-wrap">

                                    <Link
                                        href={`/dashboard/events/${event.id}`}
                                        className="m-0 p-0 tags_btn d-flex justify-content-center align-items-center"
                                    >
                                        🎫 Abrir
                                    </Link>

                                    {/* <Link
                                        href={`/dashboard/events/${event.id}/staff`}
                                        className="tags_btn_secondary d-flex justify-content-center align-items-center"
                                    >
                                        👥 Staff
                                    </Link> */}
                                    <div className="d-flex p-3">
                                        <button
                                            className="icon_btn success me-3"
                                            title="Editar Evento"
                                            onClick={() =>
                                                openEdit(event)
                                            }
                                        >
                                            ✏️
                                        </button>

                                        <button
                                            className="icon_btn danger"
                                            title="Borrar Evento"
                                            onClick={() =>
                                                deleteEvent(event.id)
                                            }
                                        >
                                            🗑
                                        </button>
                                    </div>


                                </div>

                            </div>

                        </div>

                    ))}

                </div>

            </div>

            {/* MODAL */}
            {/* MODAL */}
            {modal && (

                <div className="tags_modal_overlay">

                    <div className="tags_modal_card tags_staff_modal">

                        <button
                            className="tags_modal_close"
                            onClick={closeModal}
                        >
                            ✕
                        </button>

                        {/* HEADER */}
                        <div className="tags_modal_header">

                            <h2 className="tags_modal_title">

                                {modal.id
                                    ? "Editar Evento"
                                    : "Nuevo Evento"}

                            </h2>

                            <p className="tags_modal_description">
                                Configurá los datos del evento
                            </p>

                        </div>

                        {/* BODY */}
                        <div className="tags_modal_body tags_staff_modal_body">

                            <div className="row g-3">

                                <div className="col-12">

                                    <div className="tags_modal_group">

                                        <label className="tags_modal_label">
                                            Nombre
                                        </label>

                                        <input
                                            className="tags_modal_input"
                                            value={name}
                                            onChange={(e) =>
                                                setName(
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="col-12">

                                    <div className="tags_modal_group">

                                        <label className="tags_modal_label">
                                            Descripción
                                        </label>

                                        <textarea
                                            rows={4}
                                            className="tags_modal_input"
                                            value={description}
                                            onChange={(e) =>
                                                setDescription(
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="col-12">

                                    <div className="tags_modal_group">

                                        <label className="tags_modal_label">
                                            Ubicación
                                        </label>

                                        <input
                                            className="tags_modal_input"
                                            value={location}
                                            onChange={(e) =>
                                                setLocation(
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="col-md-6">

                                    <div className="tags_modal_group">

                                        <label className="tags_modal_label">
                                            Inicio
                                        </label>

                                        <input
                                            type="datetime-local"
                                            className="tags_modal_input"
                                            value={startsAt}
                                            onChange={(e) =>
                                                setStartsAt(
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="col-md-6">

                                    <div className="tags_modal_group">

                                        <label className="tags_modal_label">
                                            Fin
                                        </label>

                                        <input
                                            type="datetime-local"
                                            className="tags_modal_input"
                                            value={endsAt}
                                            onChange={(e) =>
                                                setEndsAt(
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="col-md-6">

                                    <div className="tags_modal_group">

                                        <label className="tags_modal_label">
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

                                            <option value="draft">
                                                Borrador
                                            </option>

                                            <option value="published">
                                                Publicado
                                            </option>

                                            <option value="active">
                                                Activo
                                            </option>

                                            <option value="finished">
                                                Finalizado
                                            </option>

                                            <option value="cancelled">
                                                Cancelado
                                            </option>

                                        </select>

                                    </div>

                                </div>

                            </div>

                        </div>

                        {/* ACTIONS */}
                        <div className="tags_modal_actions">

                            <button
                                className="tags_modal_btn tags_modal_btn_success"
                                onClick={saveEvent}
                            >
                                🖫 Guardar
                            </button>

                            <button
                                className="tags_modal_btn tags_modal_btn_cancel"
                                onClick={closeModal}
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