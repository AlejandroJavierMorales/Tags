"use client";

import { useEffect, useMemo, useState } from "react";
import { FaCalendarDays, FaCheck, FaClipboard, FaClock, FaEnvelope, FaGlobe, FaLink, FaLocationDot, FaMessage, FaRoute, FaUserClock, FaUsers, FaWhatsapp, FaXmark } from "react-icons/fa6";

import EventOwnerHeader from "./EventOwnerHeader";
import EventNavigation from "./EventNavigation";
import OwnerNavigation from "./OwnerNavigation";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import QRCode from "qrcode";

import "./EventRegistrationAdmin.css";
import "./EventRegistrationTabs.css";
import "./EventCredentialPreview.css";

function inputDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

function EventCredentialMiniature({ item }) {
    const [image, setImage] = useState("");

    useEffect(() => {
        if (!item?.qr_token) { setImage(""); return; }
        const url = `${window.location.origin}/e/access/${item.qr_token}`;
        QRCode.toDataURL(url, { width: 160, margin: 1, errorCorrectionLevel: "H" })
            .then(setImage)
            .catch(() => setImage(""));
    }, [item?.qr_token]);

    if (!item?.qr_token) return null;
    return <div className="tags_event_registration_credential_mini">
        {image && <img src={image} alt={`QR de ${item.name}`} />}
        <div><small>Código de acceso</small><code>{item.qr_code || "Generando…"}</code></div>
    </div>;
}

function when(value) {
    return value ? new Date(value).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "-";
}

export default function EventRegistrationAdmin({ session, eventId, modules }) {
    const [event, setEvent] = useState(null);
    const [settings, setSettings] = useState(null);
    const [availability, setAvailability] = useState(null);
    const [requests, setRequests] = useState([]);
    const [filter, setFilter] = useState("");
    const [activeTab, setActiveTab] = useState("registrations");
    const [communications, setCommunications] = useState({});
    const [confirmation, setConfirmation] = useState(null);
    const [credentialPreview, setCredentialPreview] = useState("");
    const [busy, setBusy] = useState(true);
    const canConfigurePaymentAccount = session?.role === "admin" || modules?._productMode === "pro";

    async function read(response) {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "No se pudo completar la operación");
        return payload;
    }

    async function load() {
        setBusy(true);
        try {
            const query = new URLSearchParams({ eventId: String(eventId) });
            if (filter) query.set("status", filter);
            const [configuration, list] = await Promise.all([
                fetch(`/api/events/registration/settings?eventId=${eventId}`, { cache: "no-store" }).then(read),
                fetch(`/api/events/registration/requests?${query}`, { cache: "no-store" }).then(read)
            ]);
            setEvent(configuration.event);
            setAvailability(configuration.availability);
            setSettings({
                publicSlug: configuration.settings.public_slug || "",
                registrationEnabled: Number(configuration.settings.registration_enabled) === 1,
                confirmationMode: configuration.settings.confirmation_mode || "manual",
                capacity: configuration.settings.capacity ?? "",
                registrationOpensAt: inputDate(configuration.settings.registration_opens_at),
                registrationClosesAt: inputDate(configuration.settings.registration_closes_at),
                publicTitle: configuration.settings.public_title || configuration.event.name || "",
                publicDescription: configuration.settings.public_description || "",
                successMessage: configuration.settings.success_message || "",
                requirePhone: Number(configuration.settings.require_phone) === 1,
                termsText: configuration.settings.terms_text || "",
                paymentMode: configuration.paymentSettings?.payment_mode || "free",
                ticketPrice: configuration.paymentSettings?.ticket_price ?? "",
                currency: configuration.paymentSettings?.currency || "ARS",
                manualPaymentTitle: configuration.paymentSettings?.manual_payment_title || "",
                manualPaymentInstructions: configuration.paymentSettings?.manual_payment_instructions || "",
                manualPaymentHolder: configuration.paymentSettings?.manual_payment_holder || "",
                manualPaymentAlias: configuration.paymentSettings?.manual_payment_alias || "",
                manualPaymentCbu: configuration.paymentSettings?.manual_payment_cbu || "",
                mercadoPagoAccountId: configuration.paymentAccount?.id || null,
                mercadoPagoAccountActive: Number(configuration.paymentAccount?.is_active) === 1,
                mercadoPagoAccountName: configuration.paymentAccount?.account_name || "",
                mercadoPagoAccountEmail: configuration.paymentAccount?.account_email || "",
                mercadoPagoAccessToken: "",
                mercadoPagoWebhookSecret: "",
                mercadoPagoAccessTokenConfigured: Number(configuration.paymentAccount?.access_token_configured) === 1,
                mercadoPagoWebhookSecretConfigured: Number(configuration.paymentAccount?.webhook_secret_configured) === 1,
                directorySlug: configuration.publicRoute?.directory_slug || "",
                directoryHost: configuration.publicRoute?.primary_host || ""
            });
            setRequests(list.requests || []);
        } catch (error) {
            await showAlert({ title: "No pudimos cargar las inscripciones", text: error.message, icon: "error" });
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => { load(); }, [eventId, filter]);

    useEffect(() => {
        if (!confirmation?.item) { setCredentialPreview(""); return; }
        QRCode.toDataURL(`EVENT-PREVIEW-${eventId}-${confirmation.item.registration_id}`, { width: 300, margin: 2, errorCorrectionLevel: "H" })
            .then(setCredentialPreview)
            .catch(() => setCredentialPreview(""));
    }, [confirmation?.item, eventId]);

    function change(key, value) {
        setSettings(current => ({ ...current, [key]: value }));
    }

    async function save(eventSubmit) {
        eventSubmit.preventDefault();
        setBusy(true);
        try {
            await fetch("/api/events/registration/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventId, ...settings })
            }).then(read);
            await load();
            await showAlert({ title: "Configuración guardada", text: "La página de inscripción quedó actualizada.", icon: "success", timer: 1600 });
        } catch (error) {
            await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" });
        } finally {
            setBusy(false);
        }
    }

    async function resolveRequest(item, action, options = {}) {
        if (action === "confirm" && !options.fromModal) {
            setConfirmation({ item, notifyClient: true });
            return;
        }
        const confirmed = options.fromModal ? true : await showAlert({
            title: action === "confirm" ? "Confirmar inscripción" : action === "reject" ? "Rechazar inscripción" : action === "approve_payment" ? "Aprobar pago" : "Rechazar comprobante",
            text: action === "confirm"
                ? `Se habilitará la credencial QR de ${item.name}.`
                : action === "reject" ? `La solicitud de ${item.name} dejará de ocupar un cupo.`
                : action === "approve_payment" ? `Se registrará como pagada la inscripción de ${item.name}.`
                : `${item.name} podrá cargar un nuevo comprobante.`,
            icon: ["confirm", "approve_payment"].includes(action) ? "question" : "warning",
            showCancelButton: true,
            confirmButtonText: ["confirm", "approve_payment"].includes(action) ? "Confirmar" : "Rechazar",
            cancelButtonText: "Volver"
        });
        if (!confirmed) return;
        setBusy(true);
        try {
            const result = await fetch("/api/events/registration/requests", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId, registrationId: item.registration_id, action, notifyClient: options.notifyClient !== false })
            }).then(read);
            setRequests(current => current
                .map(request => request.registration_id === item.registration_id
                    ? {
                        ...request,
                        ...(action === "confirm" ? { status: "confirmed", credential_url: result.credentialUrl } : {}),
                        ...(action === "reject" ? { status: "declined" } : {}),
                        ...(action === "approve_payment" ? { payment_status: "approved" } : {}),
                        ...(action === "reject_payment" ? { payment_status: "rejected" } : {})
                    }
                    : request)
                .filter(request => !filter || request.status === filter));
            const refreshed = await fetch(`/api/events/registration/requests?eventId=${eventId}${filter ? `&status=${encodeURIComponent(filter)}` : ""}`, { cache: "no-store" }).then(read);
            setRequests(refreshed.requests || []);
            if (action === "confirm") setConfirmation(null);
        } catch (error) {
            await showAlert({ title: "No se pudo actualizar", text: error.message, icon: "error" });
        } finally {
            setBusy(false);
        }
    }

    async function openCommunications(item) {
        setBusy(true);
        try {
            const result = await fetch(`/api/events/registration/communications?eventId=${eventId}&registrationId=${item.registration_id}`, { cache: "no-store" }).then(read);
            setCommunications(current => ({ ...current, [item.registration_id]: result.communications || [] }));
        } catch (error) {
            await showAlert({ title: "No se pudo cargar el historial", text: error.message, icon: "error" });
        } finally { setBusy(false); }
    }

    async function sendWhatsapp(item) {
        setBusy(true);
        try {
            const result = await fetch("/api/events/registration/communications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, registrationId: item.registration_id, channel: "whatsapp" }) }).then(read);
            window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
            await openCommunications(item);
        } catch (error) {
            await showAlert({ title: "No se pudo preparar WhatsApp", text: error.message, icon: "error" });
        } finally { setBusy(false); }
    }

    async function sendEmail(item) {
        setBusy(true);
        try {
            await fetch("/api/events/registration/communications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, registrationId: item.registration_id, channel: "email" }) }).then(read);
            await openCommunications(item);
            await showAlert({ title: "Email enviado", text: `La confirmación fue enviada a ${item.email}.`, icon: "success", timer: 1800 });
        } catch (error) {
            await showAlert({ title: "No se pudo enviar el email", text: error.message, icon: "error" });
        } finally { setBusy(false); }
    }

    const publicUrl = typeof window === "undefined" || !settings?.publicSlug
        ? ""
        : settings.directorySlug
            ? `${settings.directoryHost && !["localhost", "127.0.0.1"].includes(window.location.hostname) ? `https://${settings.directoryHost}` : window.location.origin}/${settings.directorySlug}/eventos/${settings.publicSlug}`
            : `${window.location.origin}/eventos/${settings.publicSlug}`;
    const mercadoPagoWebhookUrl = typeof window === "undefined" || !event?.business_id
        ? ""
        : `${window.location.origin}/api/events/payments/mercadopago/webhook?businessId=${event.business_id}`;
    const stats = useMemo(() => ({
        pending: requests.filter(item => item.status === "pending").length,
        confirmed: requests.filter(item => ["confirmed", "checked_in"].includes(item.status)).length
    }), [requests]);

    if (!settings && busy) return <TagsSpinner />;

    return <main className="tags_event_registration_admin">
        <EventOwnerHeader session={session} productMode={modules?._productMode} branding={modules?._branding} />
        <div className="tags_event_registration_admin_body">
            {modules?._productMode !== "simple" && <OwnerNavigation session={session} staffPermissions={modules} productMode={modules?._productMode} />}
            <EventNavigation eventId={eventId} modules={modules} />

            <header className="tags_event_registration_heading">
                <div><span>INSCRIPCIÓN PÚBLICA</span><h1>{event?.name || "Evento"}</h1><p>Configurá cupos, confirmaciones y el formulario que usarán los asistentes.</p></div>
                <div className={`tags_event_registration_state is_${availability?.code || "disabled"}`}><FaGlobe /><strong>{settings?.registrationEnabled ? "Formulario habilitado" : "Formulario deshabilitado"}</strong><small>{availability?.message}</small></div>
            </header>

            <section className="tags_event_registration_metrics">
                <article><FaUsers /><div><span>Cupos ocupados</span><strong>{availability?.occupied || 0}{availability?.capacity ? ` / ${availability.capacity}` : ""}</strong></div></article>
                <article><FaUserClock /><div><span>Pendientes visibles</span><strong>{stats.pending}</strong></div></article>
                <article><FaCheck /><div><span>Confirmadas visibles</span><strong>{stats.confirmed}</strong></div></article>
            </section>

            <nav className="tags_event_registration_tabs">
                <button type="button" className={activeTab === "registrations" ? "active" : ""} onClick={() => setActiveTab("registrations")}><FaUsers /> Inscripciones</button>
                <button type="button" className={activeTab === "settings" ? "active" : ""} onClick={() => setActiveTab("settings")}><FaGlobe /> Configuración</button>
            </nav>

            {activeTab === "settings" && <form className="tags_event_registration_settings" onSubmit={save}>
                <header><div><h2>Configuración</h2><p>Podés preparar el formulario mientras el evento está en borrador.</p></div><label className="tags_event_registration_switch"><input type="checkbox" checked={settings.registrationEnabled} onChange={event => change("registrationEnabled", event.target.checked)} /><span />Aceptar inscripciones</label></header>
                <div className="tags_event_registration_fields">
                    <label>Confirmación<select value={settings.confirmationMode} onChange={event => change("confirmationMode", event.target.value)}><option value="manual">Manual: revisar cada solicitud</option><option value="automatic">Automática: confirmar y generar QR</option></select></label>
                    <label>Cupo total<input type="number" min="1" placeholder="Sin límite" value={settings.capacity} onChange={event => change("capacity", event.target.value)} /><small>Dejalo vacío si no querés limitar lugares.</small></label>
                    <label>Apertura<input type="datetime-local" value={settings.registrationOpensAt} onChange={event => change("registrationOpensAt", event.target.value)} /></label>
                    <label>Cierre<input type="datetime-local" value={settings.registrationClosesAt} onChange={event => change("registrationClosesAt", event.target.value)} /></label>
                    <label className="wide">Ruta pública<div className="tags_event_registration_slug"><span>/eventos/</span><input required value={settings.publicSlug} onChange={event => change("publicSlug", event.target.value)} /></div></label>
                    <label className="wide">Título público<input required value={settings.publicTitle} onChange={event => change("publicTitle", event.target.value)} /></label>
                    <label className="wide">Presentación<textarea rows="4" value={settings.publicDescription} onChange={event => change("publicDescription", event.target.value)} /></label>
                    <label className="wide">Mensaje posterior a la solicitud<textarea rows="3" value={settings.successMessage} onChange={event => change("successMessage", event.target.value)} placeholder="Si lo dejás vacío se utilizará el mensaje predeterminado." /></label>
                    <label className="wide">Condiciones de inscripción<textarea rows="3" value={settings.termsText} onChange={event => change("termsText", event.target.value)} placeholder="Si cargás condiciones, el asistente deberá aceptarlas." /></label>
                    <label className="tags_event_registration_check wide"><input type="checkbox" checked={settings.requirePhone} onChange={event => change("requirePhone", event.target.checked)} />Solicitar teléfono obligatorio</label>
                    <div className="wide tags_event_registration_payment_heading"><span>PAGO DE LA INSCRIPCIÓN</span><p>Ofrecé inscripción gratuita, transferencia o cobro automático con Mercado Pago.</p></div>
                    <label>Modalidad de pago<select value={settings.paymentMode} onChange={event => setSettings(current => ({ ...current, paymentMode: event.target.value, currency: event.target.value === "mercadopago" ? "ARS" : current.currency }))}><option value="free">Sin pago previo</option><option value="manual">Pago manual con comprobante</option><option value="mercadopago" disabled={!canConfigurePaymentAccount && !settings.mercadoPagoAccountActive}>Mercado Pago automático{!canConfigurePaymentAccount && !settings.mercadoPagoAccountActive ? " (requiere activación)" : ""}</option></select></label>
                    {settings.paymentMode !== "free" && <>
                        <label>Importe<input type="number" min="0.01" step="0.01" value={settings.ticketPrice} onChange={event => change("ticketPrice", event.target.value)} /></label>
                        <label>Moneda<select value={settings.paymentMode === "mercadopago" ? "ARS" : settings.currency} disabled={settings.paymentMode === "mercadopago"} onChange={event => change("currency", event.target.value)}><option value="ARS">Pesos argentinos</option><option value="USD">Dólares</option></select>{settings.paymentMode === "mercadopago" && <small>Mercado Pago se procesa en pesos argentinos.</small>}</label>
                    </>}
                    {settings.paymentMode === "manual" && <>
                        <label>Título para el pago<input value={settings.manualPaymentTitle} onChange={event => change("manualPaymentTitle", event.target.value)} placeholder="Transferencia bancaria" /></label>
                        <label className="wide">Instrucciones de pago<textarea rows="3" value={settings.manualPaymentInstructions} onChange={event => change("manualPaymentInstructions", event.target.value)} /></label>
                        <label>Titular<input value={settings.manualPaymentHolder} onChange={event => change("manualPaymentHolder", event.target.value)} /></label>
                        <label>Alias<input value={settings.manualPaymentAlias} onChange={event => change("manualPaymentAlias", event.target.value)} /></label>
                        <label className="wide">CBU/CVU<input value={settings.manualPaymentCbu} onChange={event => change("manualPaymentCbu", event.target.value)} /></label>
                    </>}
                    {settings.paymentMode === "mercadopago" && canConfigurePaymentAccount && <div className="wide tags_event_registration_mp_account">
                        <header><div><strong>Cuenta Mercado Pago del negocio</strong><p>Esta cuenta se comparte con todos los eventos del mismo cliente.</p></div><label className="tags_event_registration_switch"><input type="checkbox" checked={settings.mercadoPagoAccountActive} onChange={event => change("mercadoPagoAccountActive", event.target.checked)} /><span />Activa</label></header>
                        <div className="tags_event_registration_fields">
                            <label>Cuenta / titular<input value={settings.mercadoPagoAccountName} onChange={event => change("mercadoPagoAccountName", event.target.value)} /></label>
                            <label>Email de la cuenta<input type="email" value={settings.mercadoPagoAccountEmail} onChange={event => change("mercadoPagoAccountEmail", event.target.value)} /></label>
                            <label>Access Token<input type="password" autoComplete="new-password" value={settings.mercadoPagoAccessToken} onChange={event => change("mercadoPagoAccessToken", event.target.value)} placeholder={settings.mercadoPagoAccessTokenConfigured ? "Configurado · dejá vacío para conservarlo" : "APP_USR-..."} /></label>
                            <label>Firma secreta del webhook<input type="password" autoComplete="new-password" value={settings.mercadoPagoWebhookSecret} onChange={event => change("mercadoPagoWebhookSecret", event.target.value)} placeholder={settings.mercadoPagoWebhookSecretConfigured ? "Configurada · dejá vacío para conservarla" : "Secret signature"} /></label>
                            <label className="wide">URL para Webhooks<input readOnly value={mercadoPagoWebhookUrl} /><small>Copiala en la aplicación de Mercado Pago, activá las notificaciones de Pagos y pegá arriba la firma secreta que te entregue.</small></label>
                        </div>
                    </div>}
                    {settings.paymentMode === "mercadopago" && !canConfigurePaymentAccount && <div className="wide tags_event_registration_mp_account"><strong>Mercado Pago del negocio</strong><p>{settings.mercadoPagoAccountActive ? "La cuenta ya está configurada. Solo tenés que indicar el importe y guardar." : "Solicitá al administrador de la plataforma la activación de Mercado Pago para este negocio."}</p></div>}
                </div>
                <footer><button disabled={busy}>Guardar configuración</button>{publicUrl && <><a href={publicUrl} target="_blank"><FaLink /> Abrir formulario</a><button type="button" className="secondary" onClick={() => navigator.clipboard.writeText(publicUrl)}><FaClipboard /> Copiar enlace</button></>}</footer>
            </form>}

            {activeTab === "registrations" && <section className="tags_event_registration_requests">
                <header><div><h2>Solicitudes recibidas</h2><p>Las solicitudes manuales deben confirmarse antes de habilitar su QR.</p></div><select value={filter} onChange={event => setFilter(event.target.value)}><option value="">Todos los estados</option><option value="pending">Pendientes</option><option value="confirmed">Confirmadas</option><option value="declined">Rechazadas</option><option value="checked_in">Acreditadas</option></select></header>
                <div className="tags_event_registration_request_list">
                    {requests.map(item => <article key={item.registration_id}>
                        <div><span className={`is_${item.status}`}>{item.status === "pending" ? "Pendiente" : item.status === "confirmed" ? "Confirmada" : item.status === "declined" ? "Rechazada" : item.status === "checked_in" ? "Acreditada" : item.status}</span><h3>{item.name}</h3><p>{item.email}{item.phone ? ` · ${item.phone}` : ""}</p></div>
                        <small><FaClock /> {when(item.registered_at)}</small>
                        <EventCredentialMiniature item={item} />
                        {item.payment_id && <div className="tags_event_registration_payment_state"><strong>{item.payment_currency} {Number(item.payment_amount || 0).toLocaleString("es-AR")}</strong><span className={`is_${item.payment_status}`}>{item.payment_status === "pending" ? item.payment_provider === "mercadopago" ? "Pendiente de Mercado Pago" : "Sin comprobante" : item.payment_status === "submitted" ? "Pago en revisión" : item.payment_status === "approved" ? "Pago aprobado" : item.payment_status === "rejected" ? item.payment_provider === "mercadopago" ? "Pago rechazado" : "Comprobante rechazado" : item.payment_status}</span>{item.proof_url && <a href={item.proof_url} target="_blank" rel="noreferrer">Ver comprobante</a>}</div>}
                        {item.payment_provider === "manual" && ["pending", "submitted", "rejected"].includes(item.payment_status) && <div className="tags_event_registration_request_actions"><button type="button" onClick={() => resolveRequest(item, "approve_payment")}><FaCheck /> {item.payment_status === "submitted" ? "Aprobar pago" : "Registrar pago recibido"}</button>{item.payment_status === "submitted" && <button type="button" className="reject" onClick={() => resolveRequest(item, "reject_payment")}><FaXmark /> Rechazar comprobante</button>}</div>}
                        {item.status === "pending" && <div className="tags_event_registration_request_actions"><button type="button" disabled={item.payment_mode !== "free" && item.payment_status !== "approved"} title={item.payment_mode !== "free" && item.payment_status !== "approved" ? "Primero debés confirmar el pago" : "Confirmar inscripción"} onClick={() => resolveRequest(item, "confirm")}><FaCheck /> Confirmar inscripción</button><button type="button" className="reject" onClick={() => resolveRequest(item, "reject")}><FaXmark /> Rechazar</button>{item.payment_mode !== "free" && item.payment_status !== "approved" && <small className="tags_event_registration_payment_required">Confirmá el pago para habilitar la inscripción.</small>}</div>}
                        {["confirmed", "checked_in"].includes(item.status) && <div className="tags_event_registration_request_actions"><button type="button" onClick={() => sendWhatsapp(item)}><FaWhatsapp /> Enviar por WhatsApp</button><button type="button" onClick={() => sendEmail(item)}><FaEnvelope /> Enviar por email</button><button type="button" className="secondary" onClick={() => openCommunications(item)}><FaMessage /> Historial</button></div>}
                        {(item.credential_url || item.qr_token) && <a href={item.credential_url || `/e/access/${item.qr_token}`} target="_blank">Ver credencial</a>}
                        {communications[item.registration_id] && <div className="tags_event_registration_communications">{communications[item.registration_id].length ? communications[item.registration_id].map(entry => <p key={entry.id}><strong>{entry.channel === "email" ? "Email" : "WhatsApp"}</strong><span>{entry.delivery_status === "sent" ? "Enviado" : entry.delivery_status === "failed" ? "Falló" : "Preparado"} · {when(entry.created_at)}</span></p>) : <p>Sin comunicaciones registradas.</p>}</div>}
                    </article>)}
                    {!requests.length && <p className="tags_event_registration_empty">Todavía no hay solicitudes para este filtro.</p>}
                </div>
            </section>}
        </div>
        {confirmation && <div className="tags_event_confirmation_backdrop" onMouseDown={() => !busy && setConfirmation(null)}>
            <section className="tags_event_confirmation_modal" onMouseDown={modalEvent => modalEvent.stopPropagation()}>
                <header><div><small>CONFIRMAR INSCRIPCIÓN</small><h2>{confirmation.item.name}</h2></div><button type="button" onClick={() => setConfirmation(null)}><FaXmark /></button></header>
                <div className="tags_event_confirmation_summary">
                    <article><span>Evento</span><strong>{event?.name}</strong></article>
                    <article><span>Fecha</span><strong>{when(event?.starts_at)}</strong></article>
                    <article><span>Lugar</span><strong>{event?.location || "A confirmar"}</strong></article>
                    <article><span>Pago</span><strong>{confirmation.item.payment_mode === "free" ? "Sin pago previo" : confirmation.item.payment_status === "approved" ? `Aprobado · ${confirmation.item.payment_currency} ${Number(confirmation.item.payment_amount || 0).toLocaleString("es-AR")}` : "Pendiente"}</strong></article>
                </div>
                <div className="tags_event_confirmation_delivery"><h3>Lo que recibirá el inscripto</h3><p>Confirmación de la inscripción, datos del evento y un botón para abrir su Card personal con el código QR de acceso.</p><dl><div><dt>Destinatario</dt><dd>{confirmation.item.email}</dd></div><div><dt>Asunto</dt><dd>Inscripción confirmada · {event?.name}</dd></div><div><dt>Credencial</dt><dd>Se genera al confirmar</dd></div></dl></div>
                <div className="tags_event_confirmation_preview"><small>VISTA PREVIA DE LA CREDENCIAL</small><article><header>{modules?._branding?.logoUrl && <img src={modules._branding.logoUrl} alt="" />}<strong>{modules?._branding?.name || "Organizador"}</strong></header><div><span>Evento</span><h3>{event?.name}</h3>{(event?.location || event?.address) && <p><FaLocationDot /> <strong>{event?.location}</strong>{event?.address && <small>{event.address}</small>}</p>}{event?.starts_at && <p className="is_schedule"><FaCalendarDays /> {when(event.starts_at)}</p>}{event?.credential_note && <p className="is_note">{event.credential_note}</p>}{event?.latitude != null && event?.longitude != null && <em className="is_directions"><FaRoute /> Cómo llegar</em>}<b>{confirmation.item.name}</b>{credentialPreview && <img src={credentialPreview} alt="Vista previa del código QR" />}<em>El código definitivo se genera al confirmar</em></div></article></div>
                <label className="tags_event_confirmation_notify"><input type="checkbox" checked={confirmation.notifyClient} onChange={changeEvent => setConfirmation(current => ({ ...current, notifyClient: changeEvent.target.checked }))} /><span><strong>Notificar al cliente</strong><small>Enviar la confirmación y el acceso a la credencial por email.</small></span></label>
                <footer><button type="button" onClick={() => setConfirmation(null)}>Cancelar</button><button type="button" disabled={busy} onClick={() => resolveRequest(confirmation.item, "confirm", { fromModal: true, notifyClient: confirmation.notifyClient })}><FaCheck /> Confirmar inscripción</button></footer>
            </section>
        </div>}
        {busy && <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(248,250,252,.74)" />}
    </main>;
}
