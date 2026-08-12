"use client";

import { useEffect, useMemo, useState } from "react";
import { FaCalendarPlus, FaCheck, FaClock, FaPlay, FaTrash, FaUserCheck, FaXmark } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import TurnosAdminAvailabilityPicker from "./TurnosAdminAvailabilityPicker";
import TurnosAdminBookingCustomerSelector from "./TurnosAdminBookingCustomerSelector";
import "./TurnosAdminAgenda.css";
import "./TurnosAdminAgendaDelete.css";

const STATUS = { pending: "Pendiente", confirmed: "Confirmada", checked_in: "Presente", in_progress: "En curso", completed: "Finalizada", rejected: "Rechazada", cancelled: "Cancelada", no_show: "Ausente" };
const ACTIONS = { pending: [["confirmed", "Confirmar", FaCheck], ["rejected", "Rechazar", FaXmark]], confirmed: [["checked_in", "Registrar llegada", FaUserCheck], ["cancelled", "Cancelar", FaXmark], ["no_show", "Ausente", FaXmark]], checked_in: [["in_progress", "Iniciar", FaPlay], ["no_show", "Ausente", FaXmark]], in_progress: [["completed", "Finalizar", FaCheck]] };
function localDate(value = new Date()) { const offset = value.getTimezoneOffset() * 60000; return new Date(value - offset).toISOString().slice(0, 10); }
function plusDays(days) { const value = new Date(); value.setDate(value.getDate() + days); return localDate(value); }

export default function TurnosAdminAgenda({ businessId, turnosId, services, resources }) {
    const [bookings, setBookings] = useState([]), [locations, setLocations] = useState([]), [calendarSlots, setCalendarSlots] = useState([]);
    const [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [editing, setEditing] = useState(null), [newStart, setNewStart] = useState("");
    const [tab, setTab] = useState("new");
    const [filters, setFilters] = useState({ status: "", from: localDate(), to: plusDays(7) });
    const [form, setForm] = useState({ serviceId: "", resourceId: "", locationId: "", startsAt: "", turnCount: 1, partySize: 1, customerId: "", name: "", email: "", phone: "" });
    const service = services.find(item => String(item.id) === String(form.serviceId));
    const resource = resources.find(item => String(item.id) === String(form.resourceId));
    const serviceResources = useMemo(() => resources.filter(item => String(item.service_id) === String(form.serviceId)), [resources, form.serviceId]);
    const metadata = useMemo(() => { if (!resource) return {}; return typeof resource.public_metadata_json === "string" ? JSON.parse(resource.public_metadata_json || "{}") : resource.public_metadata_json || {}; }, [resource]);
    const allowsConsecutive = metadata.allowConsecutiveBookings === true;
    const maxConsecutive = allowsConsecutive ? Math.max(2, Number(metadata.maxConsecutiveSlots || 2)) : 1;
    const selectedSlot = calendarSlots.find(item => item.startsAt === form.startsAt);
    const selectableTurns = useMemo(() => {
        if (!selectedSlot || !allowsConsecutive) return 1;
        let count = 1, expected = new Date(selectedSlot.endsAt).getTime();
        while (count < maxConsecutive) {
            const next = calendarSlots.find(item => new Date(item.startsAt).getTime() === expected);
            if (!next || !["available", "partial"].includes(next.status) || Number(next.availableUnits) < Number(form.partySize)) break;
            count += 1; expected = new Date(next.endsAt).getTime();
        }
        return count;
    }, [selectedSlot, calendarSlots, allowsConsecutive, maxConsecutive, form.partySize]);
    const validEmail = !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const validPhone = !form.phone.trim() || form.phone.replace(/\D/g, "").length >= 6;
    const validContact = Boolean(form.email.trim() || form.phone.trim()) && validEmail && validPhone;
    const validQuantity = Boolean(selectedSlot) && Number(form.partySize) >= 1 && Number(form.partySize) <= Number(selectedSlot?.availableUnits || 0);
    const validTurns = Number(form.turnCount) >= 1 && Number(form.turnCount) <= selectableTurns && (allowsConsecutive || Number(form.turnCount) === 1);
    const canConfirm = Boolean(service && resource && selectedSlot && form.customerId && form.name.trim().length >= 2 && validContact && validQuantity && validTurns && !busy);

    async function load(next = filters) {
        const query = new URLSearchParams({ businessId: String(businessId), turnosId: String(turnosId), status: next.status, from: next.from, to: next.to });
        const response = await fetch(`/api/turnos/admin/bookings?${query}`, { cache: "no-store" }), payload = await response.json();
        if (response.ok) {
            setBookings(payload.bookings || []); setLocations(payload.locations || []);
            if (payload.locations?.length) setForm(current => ({ ...current, locationId: current.locationId || String(payload.locations[0].id) }));
        } else setMessage(payload.error || "No se pudieron cargar las reservas.");
    }
    useEffect(() => { if (turnosId) load(); }, [businessId, turnosId, filters.status, filters.from, filters.to]);
    useEffect(() => { setForm(current => ({ ...current, resourceId: serviceResources.length === 1 ? String(serviceResources[0].id) : "", startsAt: "", turnCount: 1, partySize: 1 })); setCalendarSlots([]); }, [form.serviceId]);
    useEffect(() => { if (form.turnCount > selectableTurns) setForm(current => ({ ...current, turnCount: selectableTurns })); }, [selectableTurns]);

    async function mutate(endpoint, method, body, success) {
        setBusy(true);
        try {
            const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, turnosId, ...body }) }), payload = await response.json();
            setMessage(response.ok ? success(payload) : payload.error || "No se pudo completar la operación.");
            if (response.ok) { await load(); window.dispatchEvent(new CustomEvent("tags-turnos-availability-refresh")); }
            return response.ok;
        } finally { setBusy(false); }
    }
    async function create(event) {
        event.preventDefault();
        if (!selectedSlot) { setMessage("Seleccioná un horario disponible en el calendario."); return; }
        const ok = await mutate("/api/turnos/admin/bookings", "POST", { serviceId: form.serviceId, resourceId: form.resourceId, locationId: form.locationId, startsAt: selectedSlot.startsAt, turnCount: form.turnCount, partySize: form.partySize, customerId: form.customerId, customer: { name: form.name, email: form.email, phone: form.phone } }, payload => `Reserva ${payload.booking.bookingNumber} creada.`);
        if (ok) { setForm(current => ({ ...current, startsAt: "", turnCount: 1, partySize: 1, customerId: "", name: "", email: "", phone: "" })); setCalendarSlots([]); }
    }
    async function change(item, status) {
        const labels = { confirmed: "confirmar", rejected: "rechazar", checked_in: "registrar la llegada", cancelled: "cancelar", no_show: "marcar como ausente", in_progress: "iniciar", completed: "finalizar" };
        const confirmed = await showAlert({ title: `¿Querés ${labels[status] || "actualizar"} esta reserva?`, text: `${item.booking_number} · ${item.customer_name}. El cambio quedará registrado en el historial.`, icon: "warning", showCancelButton: true, confirmButtonText: "Sí, continuar", cancelButtonText: "Volver" });
        if (!confirmed) return;
        await mutate("/api/turnos/admin/bookings/status", "PATCH", { bookingId: item.id, status }, () => "Reserva actualizada.");
    }
    async function removeBooking(item) {
        const confirmed = await showAlert({ title: "¿Eliminar definitivamente?", text: `La reserva ${item.booking_number} de ${item.customer_name} y sus registros asociados se borrarán de la base de datos. Esta acción no se puede deshacer.`, icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar definitivamente", cancelButtonText: "Cancelar" });
        if (!confirmed) return;
        await mutate("/api/turnos/admin/bookings", "DELETE", { bookingId: item.id }, payload => `Reserva ${payload.bookingNumber} eliminada definitivamente.`);
    }
    async function reschedule(item) {
        const confirmed = await showAlert({ title: "¿Confirmar reprogramación?", text: `${item.booking_number} pasará al ${new Date(newStart).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}.`, icon: "warning", showCancelButton: true, confirmButtonText: "Reprogramar", cancelButtonText: "Volver" });
        if (!confirmed) return;
        const ok = await mutate("/api/turnos/admin/bookings/reschedule", "PATCH", { bookingId: item.id, startsAt: newStart }, () => "Reserva reprogramada.");
        if (ok) { setEditing(null); setNewStart(""); }
    }

    return <section className="tags_turnos_admin_agenda">
        <header className="tags_turnos_admin_agenda_header"><div><span>RESERVAS</span><h2>Tomar una reserva</h2><p>Seleccioná el servicio y el recurso; después asigná un bloque disponible desde la agenda.</p></div></header>
        {message && <p className="tags_turnos_admin_agenda_notice">{message}</p>}
        <nav className="tags_turnos_admin_agenda_tabs"><button type="button" className={tab === "new" ? "is_active" : ""} onClick={() => setTab("new")}>Nueva reserva</button><button type="button" className={tab === "detail" ? "is_active" : ""} onClick={() => setTab("detail")}>Detalle de reservas</button></nav>
        {tab === "new" && <form className="tags_turnos_admin_agenda_form" onSubmit={create}>
            <h3><FaCalendarPlus /> Nueva reserva manual</h3>
            <div className="tags_turnos_admin_agenda_controls">
                <TurnosAdminBookingCustomerSelector businessId={businessId} turnosId={turnosId} value={form.customerId} onSelect={customer => setForm(current => ({ ...current, customerId: customer?.id || "", name: customer?.name || "", email: customer?.email || "", phone: customer?.phone || "" }))} />
                <label>Servicio<select required value={form.serviceId} onChange={event => setForm({ ...form, serviceId: event.target.value })}><option value="">Seleccionar</option>{services.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Recurso<select required disabled={!form.serviceId} value={form.resourceId} onChange={event => { setForm({ ...form, resourceId: event.target.value, startsAt: "", turnCount: 1 }); setCalendarSlots([]); }}><option value="">Seleccionar</option>{serviceResources.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                {locations.length > 1 && <label>Lugar<select required value={form.locationId} onChange={event => setForm({ ...form, locationId: event.target.value, startsAt: "" })}>{locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
                {allowsConsecutive && <label>Turnos consecutivos<input type="number" min="1" max={selectableTurns} disabled={!selectedSlot} value={form.turnCount} onChange={event => setForm({ ...form, turnCount: Math.max(1, Math.min(selectableTurns, Number(event.target.value))) })} /></label>}
                <label>Cantidad<input type="number" min="1" max={selectedSlot?.availableUnits || resource?.capacity || 1} value={form.partySize} onChange={event => setForm({ ...form, partySize: Math.max(1, Number(event.target.value)) })} /></label>
                <label>Cliente<input required readOnly={Boolean(form.customerId)} minLength="2" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
                <label>Email<input type="email" readOnly={Boolean(form.customerId)} className={validEmail ? "" : "is_invalid"} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
                <label>Teléfono<input type="tel" readOnly={Boolean(form.customerId)} className={validPhone ? "" : "is_invalid"} value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></label>
                <div className="tags_turnos_admin_agenda_selection"><strong>{selectedSlot ? "Turno seleccionado" : "Seleccioná un turno"}</strong>{selectedSlot ? <><span>{new Date(selectedSlot.startsAt).toLocaleString("es-AR")} a {new Date(new Date(selectedSlot.startsAt).getTime() + Number(service?.duration_minutes || 0) * Number(form.turnCount) * 60000).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span><small>{Number(service?.duration_minutes || 0) * Number(form.turnCount)} minutos · {form.partySize} persona(s)</small></> : <small>Elegí un bloque disponible en el calendario.</small>}</div>
                <button className="tags_turnos_admin_agenda_confirm" disabled={!canConfirm}>Confirmar reserva</button>
            </div>
            {service && resource && form.locationId && <TurnosAdminAvailabilityPicker businessId={businessId} turnosId={turnosId} service={service} resource={resource} locationId={form.locationId} quantity={form.partySize} selectedStart={form.startsAt} onSelect={(slot, slots) => { setCalendarSlots(slots); setForm(current => ({ ...current, startsAt: slot.startsAt, turnCount: 1, partySize: Math.min(Number(current.partySize), Number(slot.availableUnits)) })); }} />}
        </form>}
        {tab === "detail" && <div className="tags_turnos_admin_agenda_list">
            <div className="tags_turnos_admin_agenda_filters"><h3>Listado de reservas</h3><label>Estado<select value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="">Todas</option><option value="confirmed">Confirmadas</option><option value="pending">Pendientes</option><option value="cancelled">Canceladas</option><option value="rejected">Rechazadas</option><option value="no_show">Ausentes</option></select></label><label>Desde<input type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} /></label><label>Hasta<input type="date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} /></label></div>
            {!bookings.length && <p className="tags_turnos_admin_agenda_empty">No hay reservas para este período.</p>}
            {bookings.map(item => <article key={item.id} className="tags_turnos_admin_agenda_booking"><div className="tags_turnos_admin_agenda_booking_time"><FaClock /><strong>{new Date(item.starts_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</strong><span className={`tags_turnos_admin_agenda_status tags_turnos_admin_agenda_status_${item.status}`}>{STATUS[item.status] || item.status}</span></div><h4>{item.service_name}</h4><p><strong>{item.resource_names}</strong> · {item.customer_name}</p><div className="tags_turnos_admin_agenda_booking_details"><span>Horario: {new Date(item.starts_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} a {new Date(item.ends_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span><span>Duración: {Math.round((new Date(item.ends_at) - new Date(item.starts_at)) / 60000)} minutos</span><span>Personas/unidades: {item.party_size}</span><span>Email: {item.customer_email || "No informado"}</span><span>Teléfono: {item.customer_phone || "No informado"}</span><span>Reserva: {item.booking_number}</span></div><div className="tags_turnos_admin_agenda_actions">{(ACTIONS[item.status] || []).map(([status, label, Icon]) => <button disabled={busy} key={status} type="button" onClick={() => change(item, status)}><Icon />{label}</button>)}{["pending", "confirmed"].includes(item.status) && <button type="button" onClick={() => { setEditing(item.id); setNewStart(""); }}>Reprogramar</button>}<button className="tags_turnos_admin_agenda_delete" disabled={busy} type="button" onClick={() => removeBooking(item)}><FaTrash />Eliminar</button></div>{editing === item.id && <div className="tags_turnos_admin_agenda_reschedule"><header><strong>Elegí el nuevo turno disponible</strong><button type="button" onClick={() => { setEditing(null); setNewStart(""); }}>Cerrar</button></header><TurnosAdminAvailabilityPicker businessId={businessId} turnosId={turnosId} service={services.find(serviceItem => String(serviceItem.id) === String(item.service_id))} resource={resources.find(resourceItem => String(resourceItem.id) === String(item.resource_id))} locationId={item.location_id} quantity={item.party_size} selectedStart={newStart} onSelect={slot => setNewStart(slot.startsAt)} />{newStart && <div className="tags_turnos_admin_agenda_reschedule_confirmation"><span>Nuevo horario: {new Date(newStart).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span><button disabled={busy} type="button" onClick={() => reschedule(item)}>Confirmar reprogramación</button></div>}</div>}</article>)}
        </div>}
        {busy && <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(255,255,255,.72)" />}
    </section>;
}
