"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCalendarDays, FaLocationDot, FaMoneyBillWave, FaTicket } from "react-icons/fa6";

import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";

import "./event-public-registration.css";

function when(value) {
    return value ? new Date(value).toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" }) : "A confirmar";
}

export default function EventPublicRegistration({ slug, embedded = false }) {
    const router = useRouter();
    const [payload, setPayload] = useState(null);
    const [form, setForm] = useState({ name: "", email: "", phone: "", acceptedTerms: false });
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setBusy(true);
        fetch(`/api/events/public/registration?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data.error || "Evento no encontrado");
                setPayload(data);
            })
            .catch(err => setError(err.message))
            .finally(() => setBusy(false));
    }, [slug]);

    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        try {
            const response = await fetch("/api/events/public/registration", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug, ...form })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "No se pudo completar la inscripción");
            router.push(data.statusUrl);
        } catch (err) {
            await showAlert({ title: "No se pudo completar", text: err.message, icon: "error" });
        } finally {
            setBusy(false);
        }
    }

    const Root = embedded ? "div" : "main";
    if (busy && !payload) return <Root className="tags_event_public"><TagsSpinner /></Root>;
    if (error || !payload) return <Root className="tags_event_public"><section className="tags_event_public_unavailable"><FaTicket /><h1>Evento no disponible</h1><p>{error || "No pudimos encontrar esta inscripción."}</p></section></Root>;

    const { event, availability } = payload;
    return <Root className="tags_event_public">
        <section className="tags_event_public_shell">
            <header className="tags_event_public_hero">
                {event.cover_image && <img src={event.cover_image} alt="" />}
                <div className="tags_event_public_hero_overlay" />
                <div className="tags_event_public_hero_content">
                    <span>{event.business_name}</span>
                    <h1>{event.public_title || event.name}</h1>
                    <p>{event.public_description || event.description}</p>
                </div>
            </header>
            <div className="tags_event_public_content">
                <section className="tags_event_public_details">
                    <article><FaCalendarDays /><div><span>Inicio</span><strong>{when(event.starts_at)}</strong></div></article>
                    <article><FaCalendarDays /><div><span>Finalización</span><strong>{when(event.ends_at)}</strong></div></article>
                    <article><FaLocationDot /><div><span>Lugar</span><strong>{event.location || "A confirmar"}</strong></div></article>
                    {availability.capacity !== null && <article><FaTicket /><div><span>Lugares disponibles</span><strong>{availability.remaining} de {availability.capacity}</strong></div></article>}
                    {event.payment_mode !== "free" && <article><FaMoneyBillWave /><div><span>Valor de la inscripción</span><strong>{event.currency} {Number(event.ticket_price || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong></div></article>}
                </section>

                {availability.available ? <form className="tags_event_public_form" onSubmit={submit}>
                    <div><span>INSCRIPCIÓN</span><h2>Reservá tu lugar</h2><p>{event.payment_mode === "manual" ? "Al completar tus datos vas a poder realizar el pago y enviar el comprobante." : event.payment_mode === "mercadopago" ? "Al completar tus datos vas a continuar al pago seguro de Mercado Pago." : event.confirmation_mode === "automatic" ? "La confirmación y tu credencial QR se generarán al finalizar." : "Recibiremos tu solicitud y deberá ser confirmada por la organización."}</p></div>
                    <label>Nombre y apellido<input required maxLength="255" value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} /></label>
                    <label>Email<input required type="email" maxLength="255" value={form.email} onChange={e => setForm(current => ({ ...current, email: e.target.value }))} /></label>
                    <label>Teléfono {Number(event.require_phone) !== 1 && <small>(opcional)</small>}<input required={Number(event.require_phone) === 1} maxLength="50" value={form.phone} onChange={e => setForm(current => ({ ...current, phone: e.target.value }))} /></label>
                    {event.terms_text && <label className="tags_event_public_terms"><input required type="checkbox" checked={form.acceptedTerms} onChange={e => setForm(current => ({ ...current, acceptedTerms: e.target.checked }))} /><span>Acepto las condiciones: {event.terms_text}</span></label>}
                    <button disabled={busy}><FaTicket /> {busy ? "Procesando..." : event.payment_mode === "manual" ? "Inscribirme y continuar al pago" : event.payment_mode === "mercadopago" ? "Inscribirme y pagar con Mercado Pago" : "Solicitar inscripción"}</button>
                </form> : <section className="tags_event_public_closed"><FaTicket /><h2>Inscripción no disponible</h2><p>{availability.message}</p></section>}
            </div>
        </section>
        {busy && <TagsSpinner size={110} logoSize={58} borderSize={5} background="rgba(248,250,248,.75)" />}
    </Root>;
}
