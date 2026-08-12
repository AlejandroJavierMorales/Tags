"use client";

import { useEffect, useMemo, useState } from "react";
import TagsSpinner from "@/app/components/TagsSpinner";
import "./TurnosPublicRenderer.css";

const STATUS = { available: "Disponible", partial: "Disponibilidad parcial", full: "Completo", blocked: "No disponible" };

function localDate(value = new Date()) {
    const offset = value.getTimezoneOffset() * 60000;
    return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

export default function TurnosPublicRenderer({ page, app }) {
    const [services, setServices] = useState([]);
    const [serviceId, setServiceId] = useState("");
    const [resources, setResources] = useState([]);
    const [resourceId, setResourceId] = useState("");
    const [locationId, setLocationId] = useState(app?.locations?.[0]?.id || "");
    const [date, setDate] = useState(localDate());
    const [week, setWeek] = useState(0);
    const [slots, setSlots] = useState([]);
    const [selected, setSelected] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [turnCount, setTurnCount] = useState(1);
    const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [linkRequested, setLinkRequested] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [identified, setIdentified] = useState(false);

    const service = useMemo(() => services.find(item => String(item.id) === String(serviceId)), [services, serviceId]);
    const resource = useMemo(() => resources.find(item => String(item.id) === String(resourceId)), [resources, resourceId]);
    const shared = Number(resource?.capacity || 1) > 1;
    const allowsConsecutive = resource?.allow_consecutive_bookings === true || resource?.allow_consecutive_bookings === 1 || String(resource?.allow_consecutive_bookings).toLowerCase() === "true";
    const quantityLabel = service?.booking_mode === "rental" ? "unidades" : "plazas";
    const needsVerification = service?.customer_identification_mode !== "contact";
    const dates = useMemo(() => {
        const start = new Date();
        start.setHours(12, 0, 0, 0);
        start.setDate(start.getDate() + week * 7);
        return Array.from({ length: 7 }, (_, index) => {
            const value = new Date(start);
            value.setDate(start.getDate() + index);
            return { value: localDate(value), day: value.toLocaleDateString("es-AR", { weekday: "short" }), number: value.getDate() };
        });
    }, [week]);

    useEffect(() => {
        const verified = new URLSearchParams(location.search).get("identified") === "1";
        setIdentified(verified);
        let draft = null;
        try { draft = verified ? JSON.parse(localStorage.getItem(`tags_turnos_booking_draft_${app.slug}`) || "null") : null; } catch {}
        if (draft) {
            setServiceId(String(draft.serviceId)); setResourceId(String(draft.resourceId)); setLocationId(draft.locationId);
            setDate(draft.date); setQuantity(draft.quantity); setSelected(draft.selected); setCustomer(draft.customer);
        }
        fetch(`/api/turnos/public/services?slug=${encodeURIComponent(app.slug)}`).then(response => response.json()).then(payload => {
            const list = payload.services || [];
            setServices(list);
            if (!draft && list.length === 1) setServiceId(String(list[0].id));
        }).catch(() => setMessage("No pudimos cargar los servicios."));
    }, [app.slug]);

    useEffect(() => {
        setSlots([]); setSelected(null); setQuantity(1); setTurnCount(1);
        if (!serviceId) { setResources([]); setResourceId(""); return; }
        fetch(`/api/turnos/public/resources?slug=${encodeURIComponent(app.slug)}&serviceId=${serviceId}`).then(response => response.json()).then(payload => {
            const list = payload.resources || [];
            setResources(list);
            setResourceId(current => list.some(item => String(item.id) === String(current)) ? current : list.length === 1 ? String(list[0].id) : "");
        }).catch(() => setMessage("No pudimos cargar los recursos del servicio."));
    }, [app.slug, serviceId]);

    useEffect(() => {
        if (!serviceId || !resourceId || !date) { setSlots([]); return; }
        let cancelled = false;
        setLoading(true); setMessage(""); setSelected(null);
        const query = new URLSearchParams({ slug: app.slug, serviceId, resourceId, locationId: String(locationId || 0), from: date, to: date, quantity: "1" });
        fetch(`/api/turnos/public/availability?${query}`).then(async response => ({ response, payload: await response.json() })).then(({ response, payload }) => {
            if (cancelled) return;
            setSlots(response.ok ? payload.slots || [] : []);
            if (!response.ok) setMessage(payload.error || "No pudimos consultar la disponibilidad.");
            else if (!payload.slots?.length) setMessage("No hay horarios disponibles para este día.");
        }).catch(() => !cancelled && setMessage("No pudimos consultar la disponibilidad.")).finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [app.slug, serviceId, resourceId, locationId, date]);

    function chooseSlot(slot) {
        if (!["available", "partial"].includes(slot.status) || Number(slot.availableUnits) < 1) return;
        setQuantity(1); setTurnCount(1); setSelected(slot);
    }

    const selectableTurns = useMemo(() => {
        if (!selected || !allowsConsecutive) return 1;
        let count = 1;
        const configuredMax = Math.max(1, Number(resource?.max_consecutive_slots || 1));
        let expectedStart = new Date(selected.endsAt).getTime();
        while (count < configuredMax) {
            const current = slots.find(item => new Date(item.startsAt).getTime() === expectedStart);
            if (!current || !["available", "partial"].includes(current.status) || Number(current.availableUnits) < quantity) break;
            count += 1;
            expectedStart = new Date(current.endsAt).getTime();
        }
        return count;
    }, [selected, slots, allowsConsecutive, resource, quantity]);

    async function requestLink() {
        if (!customer.email.trim()) { setMessage("Ingresá tu email para verificarlo."); return; }
        localStorage.setItem(`tags_turnos_booking_draft_${app.slug}`, JSON.stringify({ serviceId, resourceId, locationId, date, quantity, selected, customer }));
        setLoading(true);
        const response = await fetch("/api/turnos/public/customer/request-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: app.slug, email: customer.email, purpose: "booking" }) });
        const payload = await response.json();
        setLinkRequested(response.ok); setMessage(response.ok ? "Revisá tu correo y abrí el enlace para continuar." : payload.error || "No pudimos enviar el enlace."); setLoading(false);
    }

    async function book() {
        if (!selected || !customer.name.trim() || (!customer.email.trim() && !customer.phone.trim())) { setMessage("Completá tu nombre y un medio de contacto."); return; }
        setLoading(true);
        const response = await fetch("/api/turnos/public/bookings/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: app.slug, serviceId, resourceId: Number(resourceId), locationId, startsAt: selected.startsAt, turnCount, quantity: shared ? quantity : 1, customer }) });
        const payload = await response.json();
        if (response.ok) { localStorage.removeItem(`tags_turnos_booking_draft_${app.slug}`); setReceipt(payload.booking); setSlots([]); setMessage(""); }
        else setMessage(payload.error || "No pudimos crear la reserva.");
        setLoading(false);
    }

    return <main className="tags_turnos_public_booking" style={app.theme_css_vars || {}}>{loading && <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(255,255,255,.72)" />}
        {!app.hasPortal && <header className="tags_turnos_public_booking_brand"><strong>{app.name}</strong><a href={`/p/${app.slug}/mis-turnos`}>Mis turnos</a></header>}
        <section className="tags_turnos_public_booking_intro"><span>RESERVAS</span><h1>{page?.title || app.name}</h1><p>{page?.description || "Elegí un servicio y un horario disponible."}</p></section>
        <section className="tags_turnos_public_booking_panel">
            <section className="tags_turnos_public_booking_choice"><h2>1. Elegí el servicio</h2><div>{services.map(item => <button type="button" key={item.id} className={String(item.id) === String(serviceId) ? "is_selected" : ""} onClick={() => setServiceId(String(item.id))}><strong>{item.name}</strong><span>{item.duration_minutes} minutos</span>{item.description && <small>{item.description}</small>}</button>)}</div></section>
            {serviceId && <section className="tags_turnos_public_booking_choice"><h2>2. Elegí {service?.booking_mode === "rental" ? "qué querés alquilar" : "el recurso"}</h2><div>{resources.map(item => <button type="button" key={item.id} className={String(item.id) === String(resourceId) ? "is_selected" : ""} onClick={() => setResourceId(String(item.id))}><strong>{item.name}</strong><span>{Number(item.capacity) > 1 ? `Capacidad: ${item.capacity} ${quantityLabel}` : "Atención individual"}</span></button>)}</div>{!resources.length && <p>Este servicio todavía no tiene recursos disponibles.</p>}</section>}
            {resourceId && <section className="tags_turnos_public_booking_schedule"><h2>3. Elegí día y horario</h2><p className="tags_turnos_public_booking_duration">Cada turno dura <strong>{service?.duration_minutes} minutos</strong>.</p>{(app.locations || []).length > 1 && <label>Lugar<select value={locationId} onChange={event => setLocationId(event.target.value)}>{app.locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<div className="tags_turnos_public_booking_dates"><button disabled={week === 0} type="button" onClick={() => setWeek(Math.max(0, week - 1))}>‹</button>{dates.map(item => <button type="button" key={item.value} className={date === item.value ? "is_selected" : ""} onClick={() => setDate(item.value)}><span>{item.day}</span><strong>{item.number}</strong></button>)}<button type="button" onClick={() => setWeek(week + 1)}>›</button></div><div className="tags_turnos_public_booking_legend"><span><i />Disponible</span><span><i className="partial" />Parcialmente ocupado</span><span><i className="full" />Completo o bloqueado</span></div>{loading && <p>Consultando disponibilidad…</p>}<div className="tags_turnos_public_booking_slots">{slots.map(slot => <button type="button" key={slot.startsAt} disabled={["full", "blocked"].includes(slot.status)} className={`is_${slot.status}`} onClick={() => chooseSlot(slot)}><strong>{new Date(slot.startsAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</strong><span>{STATUS[slot.status]}</span><small>{slot.availableUnits} de {slot.totalUnits} {quantityLabel} disponibles</small></button>)}</div></section>}
            {selected && !receipt && <div className="tags_turnos_public_booking_overlay" onMouseDown={() => setSelected(null)}><section className="tags_turnos_public_booking_summary" onMouseDown={event => event.stopPropagation()}><button className="tags_turnos_public_booking_close" type="button" onClick={() => setSelected(null)}>×</button><h2>Confirmá tu reserva</h2><p><strong>{service?.name}</strong> · {resource?.name}</p><p>{new Date(selected.startsAt).toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" })} · {Number(selected.durationMinutes) * turnCount} minutos</p>{allowsConsecutive && <label className="tags_turnos_public_booking_quantity">Turnos consecutivos<div className="tags_turnos_public_booking_stepper"><button type="button" onClick={() => setTurnCount(Math.max(1, turnCount - 1))}>−</button><strong>{turnCount}</strong><button type="button" onClick={() => setTurnCount(Math.min(selectableTurns, turnCount + 1))}>+</button></div><small>Máximo disponible desde este horario: {selectableTurns}</small></label>}<dl className="tags_turnos_public_booking_capacity"><div><dt>Capacidad total</dt><dd>{selected.totalUnits}</dd></div><div><dt>Reservadas</dt><dd>{selected.reservedUnits}</dd></div><div><dt>Disponibles</dt><dd>{selected.availableUnits}</dd></div></dl>{shared && <label className="tags_turnos_public_booking_quantity">¿Cuántas {quantityLabel} querés reservar?<div className="tags_turnos_public_booking_stepper"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity(Math.min(Number(selected.availableUnits), quantity + 1))}>+</button></div></label>}{needsVerification && !identified ? <div className="tags_turnos_public_booking_verify"><h3>Verificá tu email para reservar</h3><input type="email" value={customer.email} onChange={event => setCustomer({ ...customer, email: event.target.value })} />{!linkRequested ? <button type="button" onClick={requestLink}>Enviar enlace</button> : <div className="tags_turnos_public_booking_verify_sent"><strong>Enlace enviado</strong><p>Revisá tu correo para continuar.</p><button type="button" onClick={() => setLinkRequested(false)}>Cambiar email o reenviar</button></div>}</div> : <div className="tags_turnos_public_booking_customer"><input placeholder="Nombre" value={customer.name} onChange={event => setCustomer({ ...customer, name: event.target.value })} /><input type="email" placeholder="Email" value={customer.email} onChange={event => setCustomer({ ...customer, email: event.target.value })} /><input placeholder="Teléfono" value={customer.phone} onChange={event => setCustomer({ ...customer, phone: event.target.value })} /><button className="tags_turnos_public_booking_primary" type="button" onClick={book} disabled={loading}>Confirmar reserva</button></div>}</section></div>}
            {receipt && <section className="tags_turnos_public_booking_receipt"><h2>{receipt.bookingNumber}</h2><p>{receipt.status === "confirmed" ? "Reserva confirmada." : "Pendiente de confirmación."}</p><a href={receipt.manageUrl}>Ver mi reserva</a></section>}
            {message && <p className="tags_turnos_public_booking_message">{message}</p>}
        </section>
    </main>;
}
