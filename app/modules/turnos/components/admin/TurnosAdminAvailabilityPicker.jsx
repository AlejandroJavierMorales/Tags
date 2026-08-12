"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import TagsSpinner from "@/app/components/TagsSpinner";
import "./TurnosAdminAvailabilityPicker.css";
import "./TurnosAdminAvailabilityPickerControls.css";

const COLORS = { available: "#22a35a", partial: "#f59e0b", full: "#ef4444", blocked: "#b91c1c" };
const BOOKING_COLORS = { pending: "#e7b72d", confirmed: "#22a35a", checked_in: "#367bd6", in_progress: "#7b52c7", completed: "#2b9a62", cancelled: "#b94040", rejected: "#8c4b4b", no_show: "#68717d" };
const FILTERS = [["available", "Disponibles"], ["pending", "Pendientes"], ["confirmed", "Confirmadas"], ["checked_in", "Presentes"], ["in_progress", "En curso"], ["completed", "Finalizadas"], ["cancelled", "Canceladas"], ["rejected", "Rechazadas"], ["no_show", "Ausentes"]];

export default function TurnosAdminAvailabilityPicker({ businessId, turnosId, service, resource, locationId, quantity, selectedStart, onSelect }) {
    const calendarRef = useRef(null);
    const [slots, setSlots] = useState([]), [bookings, setBookings] = useState([]);
    const [range, setRange] = useState(null);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState("timeGridWeek");
    const [refresh, setRefresh] = useState(0);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [visible, setVisible] = useState(() => Object.fromEntries(FILTERS.map(([key]) => [key, true])));

    useEffect(() => {
        const next = window.matchMedia("(max-width: 700px)").matches ? "timeGridDay" : "timeGridWeek";
        setView(next);
        calendarRef.current?.getApi().changeView(next);
    }, []);
    useEffect(() => { const reload = () => setRefresh(current => current + 1); window.addEventListener("tags-turnos-availability-refresh", reload); return () => window.removeEventListener("tags-turnos-availability-refresh", reload); }, []);

    useEffect(() => {
        if (!service?.id || !resource?.id || !locationId || !range) { setSlots([]); return; }
        let cancelled = false;
        const from = String(range.startStr).slice(0, 10);
        const end = new Date(range.end);
        end.setDate(end.getDate() - 1);
        const to = end.toISOString().slice(0, 10);
        const query = new URLSearchParams({ businessId: String(businessId), turnosId: String(turnosId), serviceId: String(service.id), resourceId: String(resource.id), locationId: String(locationId), from, to, quantity: String(Math.max(1, Number(quantity || 1))) });
        setLoading(true);
        fetch(`/api/turnos/public/availability?${query}`, { cache: "no-store" }).then(async response => ({ response, payload: await response.json() })).then(({ response, payload }) => {
            if (!cancelled) { setSlots(response.ok ? payload.slots || [] : []); setBookings(response.ok ? payload.adminBookings || [] : []); }
        }).finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [businessId, turnosId, service?.id, resource?.id, locationId, range?.startStr, range?.endStr, refresh]);

    const events = useMemo(() => [...(visible.available ? slots.map(slot => ({
        id: slot.startsAt,
        title: slot.status === "available" ? `${slot.availableUnits} disponibles` : slot.status === "partial" ? `${slot.availableUnits} disponibles` : "No disponible",
        start: slot.startsAt,
        end: slot.endsAt,
        backgroundColor: COLORS[slot.status] || COLORS.blocked,
        borderColor: selectedStart === slot.startsAt ? "#111827" : COLORS[slot.status] || COLORS.blocked,
        textColor: "#fff",
        extendedProps: slot
    })) : []), ...bookings.filter(booking => visible[booking.status]).map(booking => ({ id: `booking-${booking.id}`, title: `${booking.customer_name} · ${booking.booking_number}`, start: booking.starts_at, end: booking.ends_at, backgroundColor: BOOKING_COLORS[booking.status] || "#68717d", borderColor: BOOKING_COLORS[booking.status] || "#68717d", textColor: "#fff", editable: false, extendedProps: { ...booking, isBooking: true } }))], [slots, bookings, selectedStart, visible]);
    const minutes = Math.max(5, Number(service?.duration_minutes || 30));
    const slotDuration = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;

    function select(info) {
        const slot = info.event.extendedProps;
        if (slot.isBooking) return;
        if (!["available", "partial"].includes(slot.status) || Number(slot.availableUnits) < Number(quantity || 1)) return;
        onSelect?.(slot, slots);
    }

    function goToMonth(value) { setMonth(value); if (value) calendarRef.current?.getApi().gotoDate(`${value}-01`); }

    return <section className="tags_turnos_admin_availability_picker">
        <header><div><h3>Disponibilidad semanal</h3><p>Hacé clic sobre un bloque verde o naranja para asignarlo.</p></div><div className="tags_turnos_admin_availability_legend"><span><i />Disponible</span><span><i className="partial" />Parcial</span><span><i className="full" />Completo o bloqueado</span></div></header>
        <div className="tags_turnos_admin_availability_controls"><label>Ir al mes<input type="month" value={month} onChange={event => goToMonth(event.target.value)} /></label><fieldset><legend>Mostrar en el calendario</legend>{FILTERS.map(([key, label]) => <label key={key}><input type="checkbox" checked={visible[key]} onChange={event => setVisible(current => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</fieldset></div>
        <div className="tags_turnos_admin_availability_calendar"><FullCalendar ref={calendarRef} plugins={[timeGridPlugin, interactionPlugin]} locale={esLocale} initialView={view} headerToolbar={{ left: "prev,next today", center: "title", right: "" }} buttonText={{ today: "Hoy" }} allDaySlot={false} nowIndicator slotMinTime="06:00:00" slotMaxTime="24:00:00" slotDuration={slotDuration} slotLabelInterval="01:00:00" height="auto" events={events} eventClick={select} datesSet={setRange} eventContent={info => <div className="tags_turnos_admin_availability_event"><strong>{info.timeText}</strong><span>{info.event.title}</span></div>} /></div>
        {loading && <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(255,255,255,.72)" />}
    </section>;
}
