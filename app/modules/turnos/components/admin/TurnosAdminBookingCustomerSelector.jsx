"use client";

import { useEffect, useState } from "react";
import { FaPlus, FaXmark } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./TurnosAdminBookingCustomerSelector.css";
import "./TurnosAdminBookingCustomerSelectorTheme.css";

const EMPTY = { name: "", email: "", phone: "", document: "", dateOfBirth: "", notes: "" };

export default function TurnosAdminBookingCustomerSelector({ businessId, turnosId, value, onSelect }) {
    const [customers, setCustomers] = useState([]), [modal, setModal] = useState(false), [form, setForm] = useState(EMPTY), [busy, setBusy] = useState(false);
    const validEmail = !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const validPhone = !form.phone.trim() || form.phone.replace(/\D/g, "").length >= 6;
    const validContact = Boolean(form.email.trim() || form.phone.trim()) && validEmail && validPhone;

    async function load() {
        const query = new URLSearchParams({ businessId: String(businessId), turnosId: String(turnosId) });
        const response = await fetch(`/api/turnos/admin/customers?${query}`, { cache: "no-store" });
        const payload = await response.json();
        if (response.ok) setCustomers(payload.customers || []);
    }
    useEffect(() => { if (turnosId) load(); }, [businessId, turnosId]);

    function choose(id) {
        const customer = customers.find(item => String(item.id) === String(id));
        onSelect?.(customer || null);
    }

    async function create(event) {
        event.preventDefault();
        if (!validEmail) return showAlert({ title: "Email inválido", text: "Ingresá un email con un formato válido.", icon: "warning" });
        if (!validPhone) return showAlert({ title: "Teléfono inválido", text: "Ingresá al menos seis números.", icon: "warning" });
        if (!validContact) return showAlert({ title: "Falta el contacto", text: "Ingresá un email o un teléfono válido.", icon: "warning" });
        setBusy(true);
        try {
            const response = await fetch("/api/turnos/admin/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, turnosId, ...form }) });
            const payload = await response.json();
            if (!response.ok) return showAlert({ title: "No se pudo crear el cliente", text: payload.error || "Revisá los datos ingresados.", icon: "error" });
            const customer = { id: payload.customerId, name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim(), document: form.document.trim() };
            await load();
            onSelect?.(customer);
            setModal(false); setForm(EMPTY);
            await showAlert({ title: "Cliente creado", text: "Sus datos se cargaron en la nueva reserva.", icon: "success", timer: 1500 });
        } finally { setBusy(false); }
    }

    return <div className="tags_turnos_booking_customer_selector"><label>Cliente existente<select value={value || ""} onChange={event => choose(event.target.value)}><option value="">Seleccionar cliente</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.email || customer.phone}</option>)}</select></label><button type="button" onClick={() => { setForm(EMPTY); setModal(true); }}><FaPlus />Nuevo cliente</button>{modal && <div className="tags_turnos_booking_customer_backdrop" onMouseDown={() => !busy && setModal(false)}><section className="tags_turnos_booking_customer_modal" onMouseDown={event => event.stopPropagation()}><button className="tags_turnos_booking_customer_close" type="button" disabled={busy} onClick={() => setModal(false)}><FaXmark /></button><h2>Nuevo cliente</h2><p>Al guardarlo quedará seleccionado en la reserva.</p><form onSubmit={create}><label>Nombre<input required minLength="2" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label>Email<input type="email" className={validEmail ? "" : "is_invalid"} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label><label>Teléfono<input type="tel" className={validPhone ? "" : "is_invalid"} value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></label><label>Documento<input value={form.document} onChange={event => setForm({ ...form, document: event.target.value })} /></label><label>Fecha de nacimiento<input type="date" value={form.dateOfBirth} onChange={event => setForm({ ...form, dateOfBirth: event.target.value })} /></label><label className="tags_turnos_booking_customer_notes">Notas<textarea rows="3" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label><button className="tags_turnos_booking_customer_save" disabled={busy || form.name.trim().length < 2 || !validContact}>Guardar y seleccionar</button></form>{busy && <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(255,255,255,.72)" />}</section></div>}</div>;
}
