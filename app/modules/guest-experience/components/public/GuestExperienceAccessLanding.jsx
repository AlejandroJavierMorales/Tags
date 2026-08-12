"use client";

import { useEffect, useState } from "react";
import { FaArrowRotateRight, FaCalendarCheck, FaClipboardCheck, FaHouse, FaKey, FaMessage, FaPaperPlane, FaShop, FaStar, FaXmark, FaUtensils, FaWifi } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import "./GuestExperienceAccessLanding.css";

const FaTimes = FaXmark;

const FEATURES = [["precheckin", "Pre-check-in", FaClipboardCheck], ["wifi", "WiFi e información", FaWifi], ["turnos", "Reservar servicios", FaCalendarCheck], ["store", "Tienda", FaShop], ["resto", "Gastronomía", FaUtensils], ["reviews", "Reseñas", FaStar]];

export default function GuestExperienceAccessLanding({ slug, reason = "info" }) {
    const [data, setData] = useState(null), [error, setError] = useState(""), [requestOpen, setRequestOpen] = useState(false), [requestBusy, setRequestBusy] = useState(false), [requestResult, setRequestResult] = useState(null), [form, setForm] = useState({ stayCode: "", identifier: "" });
    useEffect(() => { fetch(`/api/guest-experience/public/access-info?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }).then(async response => ({ response, payload: await response.json().catch(() => ({})) })).then(({ response, payload }) => response.ok ? setData(payload.experience) : setError(payload.error || "No pudimos cargar la información.")).catch(() => setError("No pudimos cargar la información.")); }, [slug]);
    async function requestAccess(event) {
        event.preventDefault();
        setRequestBusy(true); setRequestResult(null);
        try {
            const response = await fetch("/api/guest-experience/public/request-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, ...form }) });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo procesar la solicitud");
            setRequestResult(payload);
        } catch (requestError) { setRequestResult({ error: requestError.message }); }
        finally { setRequestBusy(false); }
    }
    if (!data && !error) return <TagsSpinner size={110} logoSize={58} borderSize={5} background="rgba(255,255,255,.82)" />;
    if (error) return <main className="tags_guest_access_landing tags_guest_access_error"><FaHouse /><h1>Mi Estadía</h1><p>{error}</p></main>;
    const expired = reason === "expired" || reason === "invalid";
    return <main className="tags_guest_access_landing" style={data.coverUrl ? { backgroundImage: `linear-gradient(135deg,rgba(5,21,15,.94),rgba(10,43,28,.78)),url(${data.coverUrl})` } : undefined}><section className="tags_guest_access_card"><header><div className="tags_guest_access_brand">{data.logoUrl ? <img src={data.logoUrl} alt={data.name} /> : <span><FaHouse /></span>}<strong>{data.name}</strong></div><div className="tags_guest_access_key"><FaKey /></div></header><div className="tags_guest_access_content">{expired ? <div className="tags_guest_access_notice"><FaArrowRotateRight /><strong>Tu enlace de acceso ya no está disponible</strong><p>Solicitá al alojamiento que te envíe un nuevo enlace para ingresar a Mi Estadía.</p></div> : <><span className="tags_guest_access_eyebrow">EXPERIENCIA DEL HUÉSPED</span><h1>Mi Estadía</h1><p>{data.welcomeMessage || "Todo lo que necesitás durante tu estadía, en un solo lugar."}</p></>}<div className="tags_guest_access_features">{FEATURES.filter(([key]) => key === "store" ? data.capabilities.store : key === "resto" ? data.capabilities.resto : key === "reviews" ? data.capabilities.reviews : true).map(([key, label, Icon]) => <div key={key}><Icon /><span>{label}</span></div>)}</div><div className="tags_guest_access_help"><FaMessage /><p>El acceso es personal y se envía por email o WhatsApp al huésped de una reserva confirmada.</p></div><button type="button" className="tags_guest_access_request_button" onClick={() => { setRequestOpen(true); setRequestResult(null); }}><FaPaperPlane /> Solicitar nuevo enlace</button></div></section>{requestOpen && <div className="tags_guest_access_modal_backdrop" onMouseDown={() => !requestBusy && setRequestOpen(false)}><section className="tags_guest_access_modal" onMouseDown={event => event.stopPropagation()}><header><div><span>ACCESO A MI ESTADÍA</span><h2>Solicitar nuevo enlace</h2></div><button type="button" aria-label="Cerrar" onClick={() => !requestBusy && setRequestOpen(false)}><FaTimes /></button></header>{requestResult?.error ? <div className="tags_guest_access_modal_body"><div className="tags_guest_access_request_error">{requestResult.error}</div><button type="button" onClick={() => setRequestResult(null)}>Volver a intentar</button></div> : requestResult ? <div className="tags_guest_access_modal_body"><div className="tags_guest_access_request_success"><strong>{requestResult.message}</strong>{requestResult.whatsappUrl && <a href={requestResult.whatsappUrl} target="_blank" rel="noreferrer"><FaMessage /> Enviarme el enlace por WhatsApp</a>}</div><button type="button" onClick={() => setRequestOpen(false)}>Cerrar</button></div> : <form className="tags_guest_access_modal_body" onSubmit={requestAccess}><p>Ingresá el código de tu reserva y el email o WhatsApp informado al alojamiento.</p><label>Código de reserva<input required value={form.stayCode} onChange={event => setForm(current => ({ ...current, stayCode: event.target.value }))} placeholder="Ej.: Temp26-27:E001" /></label><label>Email o WhatsApp<input required value={form.identifier} onChange={event => setForm(current => ({ ...current, identifier: event.target.value }))} placeholder="Email o 3546520243" /></label><div className="tags_guest_access_modal_actions"><button type="button" disabled={requestBusy} onClick={() => setRequestOpen(false)}>Cancelar</button><button type="submit" disabled={requestBusy}>{requestBusy ? "Procesando..." : "Solicitar enlace"}</button></div></form>}</section></div>}</main>;
}
