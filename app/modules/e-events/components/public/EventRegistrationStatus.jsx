"use client";

import { useEffect, useState } from "react";
import { FaBuildingColumns, FaCalendarCheck, FaClock, FaCreditCard, FaFileArrowUp, FaTicket, FaXmark } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./event-public-registration.css";

const STATUS = {
    pending: { icon: FaClock, title: "Solicitud recibida", text: "La organización revisará tu solicitud antes de confirmar el lugar." },
    confirmed: { icon: FaCalendarCheck, title: "Inscripción confirmada", text: "Tu lugar está confirmado y tu credencial QR ya está disponible." },
    checked_in: { icon: FaCalendarCheck, title: "Ingreso registrado", text: "Tu acreditación al evento ya fue registrada." },
    declined: { icon: FaXmark, title: "Solicitud no confirmada", text: "La organización no pudo confirmar esta solicitud." },
    cancelled: { icon: FaXmark, title: "Inscripción cancelada", text: "Esta inscripción fue cancelada." }
};

function when(value) {
    return value ? new Date(value).toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" }) : "A confirmar";
}

export default function EventRegistrationStatus({ token }) {
    const [registration, setRegistration] = useState(null);
    const [error, setError] = useState("");
    const [refresh, setRefresh] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [startingPayment, setStartingPayment] = useState(false);
    const [proof, setProof] = useState({ file: null, reference: "", notes: "" });

    useEffect(() => {
        let active = true;
        async function load() {
            try {
                const response = await fetch(`/api/events/public/registration/status?token=${encodeURIComponent(token)}`, { cache: "no-store" });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data.error || "Inscripción no encontrada");
                if (active) {
                    setRegistration(data.registration);
                    setError("");
                }
            } catch (loadError) {
                if (active) setError(loadError.message);
            }
        }
        load();
        const interval = setInterval(load, 12000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [token, refresh]);

    async function uploadProof(event) {
        event.preventDefault();
        if (!proof.file) {
            await showAlert({ title: "Seleccioná el comprobante", text: "Podés cargar una imagen o un archivo PDF.", icon: "warning" });
            return;
        }
        setUploading(true);
        try {
            const form = new FormData();
            form.append("token", token);
            form.append("file", proof.file);
            form.append("reference", proof.reference);
            form.append("notes", proof.notes);
            const response = await fetch("/api/events/public/registration/payment-proof", { method: "POST", body: form });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "No se pudo enviar el comprobante");
            setProof({ file: null, reference: "", notes: "" });
            setRefresh(value => value + 1);
            await showAlert({ title: "Comprobante enviado", text: "La organización ya puede revisarlo.", icon: "success", timer: 1800 });
        } catch (uploadError) {
            await showAlert({ title: "No se pudo enviar", text: uploadError.message, icon: "error" });
        } finally {
            setUploading(false);
        }
    }

    async function startMercadoPago() {
        setStartingPayment(true);
        try {
            const response = await fetch("/api/events/public/registration/mercadopago", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "No se pudo iniciar el pago");
            if (data.approved) {
                setRefresh(value => value + 1);
                return;
            }
            if (!data.initPoint) throw new Error("Mercado Pago no devolvió el enlace de pago");
            window.location.assign(data.initPoint);
        } catch (paymentError) {
            await showAlert({ title: "No se pudo iniciar el pago", text: paymentError.message, icon: "error" });
            setStartingPayment(false);
        }
    }

    if (!registration && !error) return <main className="tags_event_public"><TagsSpinner /></main>;
    if (error) return <main className="tags_event_public"><section className="tags_event_public_unavailable"><FaTicket /><h1>Inscripción no disponible</h1><p>{error}</p></section></main>;

    const config = STATUS[registration.status] || STATUS.pending;
    const Icon = config.icon;
    const paymentRequired = Boolean(registration.payment_id);
    const mercadoPago = registration.payment_provider === "mercadopago";
    const paymentLabel = registration.payment_status === "pending" ? mercadoPago ? "Pago pendiente" : "Comprobante pendiente"
        : registration.payment_status === "submitted" ? "Comprobante en revisión"
        : registration.payment_status === "approved" ? "Pago aprobado"
        : registration.payment_status === "rejected" ? mercadoPago ? "Pago rechazado" : "Comprobante rechazado"
        : registration.payment_status === "cancelled" ? "Pago cancelado"
        : registration.payment_status === "refunded" ? "Pago devuelto" : "";
    const canUpload = !mercadoPago && ["pending", "rejected"].includes(registration.payment_status);

    return <main className="tags_event_public tags_event_public_status_page"><section className="tags_event_public_status_card">
        <div className={`tags_event_public_status_icon is_${registration.status}`}><Icon /></div>
        <span>{registration.business_name}</span>
        <h1>{config.title}</h1>
        <p>{config.text}</p>
        <div className="tags_event_public_status_event"><strong>{registration.event_name}</strong><span>{when(registration.starts_at)}</span><span>{registration.location || "Lugar a confirmar"}</span><small>Inscripción de {registration.name}</small></div>
        {paymentRequired && <section className={`tags_event_public_payment is_${registration.payment_status}`}>
            <header>{mercadoPago ? <FaCreditCard /> : <FaBuildingColumns />}<div><span>{mercadoPago ? "Mercado Pago" : registration.manual_payment_title || "Pago de la inscripción"}</span><strong>{registration.payment_currency || registration.currency} {Number(registration.payment_amount || registration.ticket_price || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong></div><em>{paymentLabel}</em></header>
            {!mercadoPago && registration.manual_payment_instructions && <p>{registration.manual_payment_instructions}</p>}
            {!mercadoPago && <dl>
                {registration.manual_payment_holder && <div><dt>Titular</dt><dd>{registration.manual_payment_holder}</dd></div>}
                {registration.manual_payment_alias && <div><dt>Alias</dt><dd>{registration.manual_payment_alias}</dd></div>}
                {registration.manual_payment_cbu && <div><dt>CBU/CVU</dt><dd>{registration.manual_payment_cbu}</dd></div>}
            </dl>}
            {!mercadoPago && registration.payment_status === "submitted" && <p className="tags_event_public_payment_notice">Recibimos tu comprobante. La organización lo está revisando.</p>}
            {registration.payment_status === "approved" && <p className="tags_event_public_payment_notice success">El pago fue validado correctamente.</p>}
            {registration.payment_status === "rejected" && <p className="tags_event_public_payment_notice error">{mercadoPago ? "Mercado Pago no pudo aprobar el pago. Podés intentarlo nuevamente." : registration.review_notes || "El comprobante no pudo validarse. Podés enviar uno nuevo."}</p>}
            {!mercadoPago && registration.proof_url && <a className="tags_event_public_proof_link" href={registration.proof_url} target="_blank" rel="noreferrer">Ver comprobante enviado</a>}
            {mercadoPago && ["pending", "rejected"].includes(registration.payment_status) && <button type="button" className="tags_event_public_mp_button" disabled={startingPayment} onClick={startMercadoPago}><FaCreditCard /> {startingPayment ? "Abriendo Mercado Pago..." : registration.payment_status === "rejected" ? "Volver a intentar el pago" : "Pagar con Mercado Pago"}</button>}
            {canUpload && <form className="tags_event_public_payment_form" onSubmit={uploadProof}>
                <label>Comprobante<input required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event => setProof(current => ({ ...current, file: event.target.files?.[0] || null }))} /><small>Imagen o PDF de hasta 8 MB.</small></label>
                <label>Referencia de la transferencia <small>(opcional)</small><input maxLength="255" value={proof.reference} onChange={event => setProof(current => ({ ...current, reference: event.target.value }))} /></label>
                <label>Observaciones <small>(opcional)</small><textarea rows="3" maxLength="2000" value={proof.notes} onChange={event => setProof(current => ({ ...current, notes: event.target.value }))} /></label>
                <button disabled={uploading}><FaFileArrowUp /> {uploading ? "Enviando..." : registration.payment_status === "rejected" ? "Enviar nuevo comprobante" : "Enviar comprobante"}</button>
            </form>}
        </section>}
        {registration.credential_url && <a className="tags_event_public_credential" href={registration.credential_url}><FaTicket /> Ver mi credencial QR</a>}
        <a className="tags_event_public_return" href={registration.event_path || `/eventos/${registration.public_slug}`}>Volver al evento</a>
    </section></main>;
}
