"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    FaArrowRight,
    FaCalendarDays,
    FaLocationDot,
    FaMagnifyingGlass,
    FaPen,
    FaPlus,
    FaTrash,
    FaUsers
} from "react-icons/fa6";

import showAlert from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";
import OwnerNavigation from "@/app/modules/e-events/components/OwnerNavigation";
import { statusLabelEvent } from "@/app/modules/e-events/lib/helpers/labelsAndBadgesStatus";

import "../../styles/tagsModals.css";
import "./events-admin.css";

const EMPTY_FORM = {
    name: "",
    description: "",
    location: "",
    address: "",
    latitude: "",
    longitude: "",
    credentialNote: "",
    startsAt: "",
    endsAt: "",
    status: "draft"
};

const STATUS_OPTIONS = [
    ["draft", "Borrador"],
    ["published", "Publicado"],
    ["active", "Activo"],
    ["finished", "Finalizado"],
    ["cancelled", "Cancelado"]
];

function formatDateInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

function formatDate(value) {
    if (!value) return "Sin definir";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sin definir";
    return date.toLocaleString("es-AR", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

export default function EventsPageClient({ session, isStaff = false, productMode = "pro" }) {
    const [events, setEvents] = useState([]);
    const [filters, setFilters] = useState({ search: "", status: "" });
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const managedBusinessId = Number(
        session?.managedBusinessId || session?.businessId || 0
    );

    useEffect(() => {
        const timeout = setTimeout(() => load(), 250);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.search, filters.status, managedBusinessId, isStaff]);

    async function load() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search.trim()) params.set("search", filters.search.trim());
            if (filters.status) params.set("status", filters.status);
            if (!isStaff && managedBusinessId) {
                params.set("business_id", String(managedBusinessId));
                params.set("product_mode", productMode);
            }

            const endpoint = isStaff
                ? `/api/events/staff/my-events?${params}`
                : `/api/events/list?${params}`;
            const response = await fetch(endpoint, { cache: "no-store" });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload.error || "No se pudieron cargar los eventos");
            }

            setEvents(Array.isArray(payload.data) ? payload.data : []);
        } catch (error) {
            await showAlert({
                title: "No pudimos cargar los eventos",
                text: error.message || "Intentá nuevamente.",
                icon: "error"
            });
        } finally {
            setLoading(false);
        }
    }

    function openCreate() {
        setEditing({ id: null });
        setForm(EMPTY_FORM);
    }

    function openEdit(event) {
        setEditing(event);
        setForm({
            name: event.name || "",
            description: event.description || "",
            location: event.location || "",
            address: event.address || "",
            latitude: event.latitude ?? "",
            longitude: event.longitude ?? "",
            credentialNote: event.credential_note || "",
            startsAt: formatDateInput(event.starts_at),
            endsAt: formatDateInput(event.ends_at),
            status: event.status || "draft"
        });
    }

    async function saveEvent(event) {
        event.preventDefault();
        if (form.endsAt && form.startsAt && new Date(form.endsAt) < new Date(form.startsAt)) {
            await showAlert({
                title: "Revisá las fechas",
                text: "La finalización no puede ser anterior al inicio.",
                icon: "warning"
            });
            return;
        }

        setSaving(true);
        try {
            const response = await fetch(
                editing?.id ? "/api/events/update" : "/api/events/create",
                {
                    method: editing?.id ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: editing?.id,
                        business_id: managedBusinessId,
                        product_mode: productMode,
                        name: form.name.trim(),
                        description: form.description.trim(),
                        location: form.location.trim(),
                        address: form.address.trim(),
                        latitude: form.latitude === "" ? null : Number(form.latitude),
                        longitude: form.longitude === "" ? null : Number(form.longitude),
                        credential_note: form.credentialNote.trim(),
                        starts_at: form.startsAt || null,
                        ends_at: form.endsAt || null,
                        status: form.status
                    })
                }
            );
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo guardar el evento");

            setEditing(null);
            await load();
            await showAlert({
                title: editing?.id ? "Evento actualizado" : "Evento creado",
                text: "Los cambios quedaron guardados correctamente.",
                icon: "success",
                timer: 1600
            });
        } catch (error) {
            await showAlert({
                title: "No se pudo guardar",
                text: error.message || "Revisá los datos ingresados.",
                icon: "error"
            });
        } finally {
            setSaving(false);
        }
    }

    async function deleteEvent(event) {
        const confirmed = await showAlert({
            title: "Eliminar evento",
            text: `Vas a eliminar \"${event.name}\". Esta acción no se puede deshacer.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar"
        });
        if (!confirmed) return;

        setSaving(true);
        try {
            const response = await fetch("/api/events/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: event.id })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo eliminar el evento");
            await load();
        } catch (error) {
            await showAlert({
                title: "No se pudo eliminar",
                text: error.message,
                icon: "error"
            });
        } finally {
            setSaving(false);
        }
    }

    const metrics = useMemo(() => ({
        total: events.length,
        active: events.filter(item => item.status === "active").length,
        published: events.filter(item => item.status === "published").length,
        draft: events.filter(item => item.status === "draft").length
    }), [events]);

    return (
        <main className="tags_events_admin">
            <header className="tags_events_admin_hero">
                <div className="tags_events_admin_identity">
                    <span className="tags_events_admin_icon"><FaCalendarDays /></span>
                    <div>
                        <span className="tags_events_admin_eyebrow">MÓDULO DEL NEGOCIO</span>
                        <h1>{productMode === "simple" ? "Eventos" : "Eventos Pro"}</h1>
                        <p>{productMode === "simple" ? "Creá conversatorios, capacitaciones y encuentros con inscripción online." : "Gestioná producciones, invitados, invitaciones, mesas, staff y acreditaciones."}</p>
                    </div>
                </div>
                {!isStaff && (
                    <div className="tags_events_admin_hero_actions">
                        {managedBusinessId > 0 && (
                            <Link href={`/dashboard/businesses/${managedBusinessId}`}>
                                Volver al negocio
                            </Link>
                        )}
                        <button type="button" onClick={openCreate}>
                            <FaPlus /> Nuevo evento
                        </button>
                    </div>
                )}
            </header>

            <section className="tags_events_admin_body">
                {productMode === "pro" && <OwnerNavigation session={session} productMode={productMode} />}

                <div className="tags_events_admin_metrics">
                    <article><span>Total</span><strong>{metrics.total}</strong><small>eventos</small></article>
                    <article><span>Activos</span><strong>{metrics.active}</strong><small>en curso</small></article>
                    <article><span>Publicados</span><strong>{metrics.published}</strong><small>próximos</small></article>
                    <article><span>Borradores</span><strong>{metrics.draft}</strong><small>en preparación</small></article>
                </div>

                <section className="tags_events_admin_panel">
                    <div className="tags_events_admin_panel_heading">
                        <div>
                            <h2>{isStaff ? "Eventos asignados" : "Tus eventos"}</h2>
                            <p>Ingresá a cada evento para administrar su operación.</p>
                        </div>
                        <div className="tags_events_admin_filters">
                            <label>
                                <FaMagnifyingGlass />
                                <input
                                    value={filters.search}
                                    onChange={event => setFilters(current => ({ ...current, search: event.target.value }))}
                                    placeholder="Buscar por nombre"
                                />
                            </label>
                            <select
                                value={filters.status}
                                onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}
                                aria-label="Filtrar por estado"
                            >
                                <option value="">Todos los estados</option>
                                {STATUS_OPTIONS.map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {!loading && events.length === 0 && (
                        <div className="tags_events_admin_empty">
                            <FaCalendarDays />
                            <h3>No hay eventos para mostrar</h3>
                            <p>{filters.search || filters.status
                                ? "Probá cambiar los filtros."
                                : "Creá el primer evento para comenzar a configurarlo."}</p>
                            {!isStaff && !filters.search && !filters.status && (
                                <button type="button" onClick={openCreate}><FaPlus /> Crear evento</button>
                            )}
                        </div>
                    )}

                    <div className="tags_events_admin_grid">
                        {events.map(event => (
                            <article className="tags_events_admin_card" key={event.id}>
                                <div className="tags_events_admin_card_top">
                                    <span className={`tags_events_admin_status is_${event.status}`}>
                                        {statusLabelEvent(event.status)}
                                    </span>
                                    {!isStaff && (
                                        <div className="tags_events_admin_card_tools">
                                            <button type="button" title="Editar evento" onClick={() => openEdit(event)}><FaPen /></button>
                                            <button type="button" className="danger" title="Eliminar evento" onClick={() => deleteEvent(event)}><FaTrash /></button>
                                        </div>
                                    )}
                                </div>
                                <h3>{event.name}</h3>
                                <p>{event.description || "Evento sin descripción."}</p>
                                <dl>
                                    <div><dt><FaCalendarDays /> Inicio</dt><dd>{formatDate(event.starts_at)}</dd></div>
                                    <div><dt><FaCalendarDays /> Fin</dt><dd>{formatDate(event.ends_at)}</dd></div>
                                    <div><dt><FaLocationDot /> Lugar</dt><dd>{event.location || "A definir"}</dd></div>
                                </dl>
                                <Link className="tags_events_admin_open" href={productMode === "simple" ? `/dashboard/events/${event.id}/registration` : `/dashboard/events/${event.id}`}>
                                    <FaUsers /> {productMode === "simple" ? "Inscripciones y pagos" : "Administrar evento"} <FaArrowRight />
                                </Link>
                            </article>
                        ))}
                    </div>
                </section>
            </section>

            {editing && (
                <div className="tags_events_admin_modal_backdrop" onMouseDown={() => !saving && setEditing(null)}>
                    <form className="tags_events_admin_modal" onSubmit={saveEvent} onMouseDown={event => event.stopPropagation()}>
                        <header>
                            <div><span>{editing.id ? "EDICIÓN" : "NUEVO EVENTO"}</span><h2>{editing.id ? "Editar evento" : "Crear evento"}</h2></div>
                            <button type="button" aria-label="Cerrar" onClick={() => setEditing(null)}>×</button>
                        </header>
                        <div className="tags_events_admin_form">
                            <label className="wide">Nombre del evento<input required maxLength={190} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label>
                            <label className="wide">Descripción<textarea rows="4" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></label>
                            <label className="wide">Lugar<input maxLength={255} value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} /></label>
                            <label className="wide">Domicilio del evento<input maxLength={500} value={form.address} onChange={event => setForm(current => ({ ...current, address: event.target.value }))} placeholder="Ej.: Av. San Martín 123, Villa General Belgrano" /></label>
                            <label>Latitud<input type="number" step="any" min="-90" max="90" value={form.latitude} onChange={event => setForm(current => ({ ...current, latitude: event.target.value }))} placeholder="-31.9770000" /></label>
                            <label>Longitud<input type="number" step="any" min="-180" max="180" value={form.longitude} onChange={event => setForm(current => ({ ...current, longitude: event.target.value }))} placeholder="-64.5660000" /></label>
                            <label>Inicio<input type="datetime-local" value={form.startsAt} onChange={event => setForm(current => ({ ...current, startsAt: event.target.value }))} /></label>
                            <label>Finalización<input type="datetime-local" value={form.endsAt} onChange={event => setForm(current => ({ ...current, endsAt: event.target.value }))} /></label>
                            <label className="wide">Observación para la credencial<textarea rows="3" maxLength={500} value={form.credentialNote} onChange={event => setForm(current => ({ ...current, credentialNote: event.target.value }))} placeholder="Ej.: Presentate 30 minutos antes del comienzo para acreditarte." /><small>Se mostrará debajo de la fecha y hora solamente si completás este campo.</small></label>
                            <label className="wide">Estado<select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                        </div>
                        <footer>
                            <button type="button" className="secondary" disabled={saving} onClick={() => setEditing(null)}>Cancelar</button>
                            <button type="submit" disabled={saving}>{editing.id ? "Guardar cambios" : "Crear evento"}</button>
                        </footer>
                    </form>
                </div>
            )}

            {(loading || saving) && <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(248,250,252,.76)" />}
        </main>
    );
}
