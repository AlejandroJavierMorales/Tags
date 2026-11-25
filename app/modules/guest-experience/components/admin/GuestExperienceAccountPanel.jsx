"use client";

import { useEffect, useState } from "react";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./GuestExperienceAccountPanel.css";

const EMPTY = { amount: "", concept: "Seña de reserva", paymentMethod: "cash", reference: "", notes: "" };
const communicationLabel = code => code === "arrival_reminder_24h" ? "Recordatorio de ingreso · 24 horas" : code === "arrival_reminder" ? "Recordatorio de ingreso · 48 horas" : "Acceso a Mi Estadía";
const paymentMethodLabel = value => ({ cash: "Efectivo", transfer: "Transferencia", debit: "Débito", credit: "Crédito", other: "Otro" }[value] || value || "No informado");
const paymentDate = item => item.payment_received_at || item.occurred_at || item.created_at;

export default function GuestExperienceAccountPanel({ businessId, guestAppId, stayId, onChanged }) {
    const [data, setData] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [busy, setBusy] = useState(false);

    async function load() {
        const response = await fetch(`/api/guest-experience/admin/account?businessId=${businessId}&guestAppId=${guestAppId}&stayId=${stayId}`, { cache: "no-store" });
        const payload = await response.json();
        if (response.ok) setData(payload);
    }

    useEffect(() => { load(); }, [stayId]);

    async function save(event) {
        event.preventDefault();
        setBusy(true);
        try {
            const response = await fetch("/api/guest-experience/admin/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, guestAppId, stayId, ...form }) });
            const payload = await response.json();
            if (!response.ok) return showAlert({ title: "No se pudo registrar", text: payload.error, icon: "error" });
            setForm(EMPTY);
            await load();
            await onChanged?.();
            await showAlert({ title: "Pago registrado", text: "La cuenta fue actualizada.", icon: "success", timer: 1500 });
        } finally { setBusy(false); }
    }

    if (!data) return <p>Cargando cuenta…</p>;
    const communications = (data.communications || []).filter(item => item.direction === "outbound");

    return <section className="tags_guest_account_panel">
        <div className="tags_guest_account_summary">
            <span>Total alojamiento<strong>${Number(data.account.lodging_total || 0).toLocaleString("es-AR")}</strong></span>
            <span>Seña requerida<strong>${Number(data.account.deposit_required_amount || 0).toLocaleString("es-AR")}</strong></span>
            <span>Pagado<strong>${Number(data.summary.paid || 0).toLocaleString("es-AR")}</strong></span>
            <span>Saldo<strong>${Number(data.summary.balance || 0).toLocaleString("es-AR")}</strong></span>
        </div>
        <form onSubmit={save}>
            <label>Monto<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></label>
            <label>Concepto<input required value={form.concept} onChange={event => setForm({ ...form, concept: event.target.value })} /></label>
            <label>Medio<select value={form.paymentMethod} onChange={event => setForm({ ...form, paymentMethod: event.target.value })}><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="debit">Débito</option><option value="credit">Crédito</option><option value="other">Otro</option></select></label>
            <label>Referencia<input placeholder="Comprobante u operación" value={form.reference} onChange={event => setForm({ ...form, reference: event.target.value })} /></label>
            <label className="tags_guest_account_notes">Detalle / cuenta de destino<input placeholder="Ej. Transferido a cuenta Banco..." value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
            <button disabled={busy}>Imputar pago</button>
        </form>
        <div className="tags_guest_account_entries">{data.entries.map(item => <article key={item.id} className={item.entry_type === "payment" ? "is_payment" : ""}>
            <div className="tags_guest_account_entry_main"><div><strong>{item.description}</strong>{item.entry_type === "payment" && <span>{paymentMethodLabel(item.payment_method)}</span>}</div><strong className={Number(item.total_amount) < 0 ? "payment" : ""}>${Math.abs(Number(item.total_amount)).toLocaleString("es-AR")}</strong></div>
            <div className="tags_guest_account_entry_detail"><span><b>Fecha:</b> {new Date(paymentDate(item)).toLocaleString("es-AR")}</span>{item.entry_type === "payment" && <><span><b>Referencia:</b> {item.payment_reference || "Sin referencia"}</span><span className="wide"><b>Detalle:</b> {item.payment_notes || "Sin detalle adicional"}</span></>}</div>
        </article>)}</div>
        <details className="tags_guest_communications_report"><summary>Historial de comunicaciones ({communications.length})</summary><div>{communications.map(item => <article key={item.id}><span>{communicationLabel(item.event_code)} · {item.channel}</span><strong>{item.status}</strong><small>{new Date(item.created_at).toLocaleString("es-AR")} · {item.recipient || "Sin destinatario"}</small>{item.last_error && <em>{item.last_error}</em>}</article>)}</div></details>
        {busy && <TagsSpinner size={100} logoSize={52} borderSize={4} background="rgba(255,255,255,.72)" />}
    </section>;
}
