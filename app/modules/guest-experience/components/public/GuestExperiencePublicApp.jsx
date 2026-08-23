"use client";
import { useEffect, useState } from "react";
import { FaArrowLeft, FaCalendarCheck, FaClipboardCheck, FaComments, FaGift, FaHouse, FaReceipt, FaShop, FaStar, FaUtensils, FaWifi } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import GuestExperiencePrecheckin from "./GuestExperiencePrecheckin";
import GuestExperienceInformation from "./GuestExperienceInformation";
import GuestExperiencePublicAccount from "./GuestExperiencePublicAccount";
import GuestExperienceNearbyPlaces from "./GuestExperienceNearbyPlaces";
import GuestExperienceBenefits from "./GuestExperienceBenefits";
import GuestExperienceMessages from "./GuestExperienceMessages";
import GuestExperienceTurnos from "./GuestExperienceTurnos";
import GuestExperienceCommerce from "./GuestExperienceCommerce";
import GuestExperienceCommerceByType from "./GuestExperienceCommerceByType";
import ClientReviewsPublicRenderer from "@/app/modules/client-reviews/renderers/ClientReviewsPublicRenderer";
import GuestExperienceAccessLanding from "./GuestExperienceAccessLanding";
import "./GuestExperiencePublicApp.css";
import "./GuestExperiencePublicBrand.css";
import "./GuestExperiencePublicTheme.css";

const SECTIONS = [
    ["pre-checkin", "Pre-Check-in", FaClipboardCheck],
    ["wifi", "WiFi e información", FaWifi],
    ["beneficios", "Beneficios", FaGift],
    ["actividades", "Reservar servicios", FaCalendarCheck],
    ["tienda", "Tienda", FaShop],
    ["gastronomia", "Gastronomía", FaUtensils],
    ["mensajes", "Mensajes", FaComments],
    ["cerca", "Lugares cercanos", FaHouse],
    ["cuenta", "Cuenta de la estadía", FaReceipt],
    ["resena", "Calificar experiencia", FaStar]
];

let activeSchedule = null;
function formatDate(value) { return value ? new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""; }
function date(value) { const result = formatDate(value), key = String(value || "").slice(0, 10); if (!activeSchedule || !result) return result; if (key === activeSchedule.starts) return `${result} ${activeSchedule.checkin}`; if (key === activeSchedule.ends) return `${result} ${activeSchedule.checkout}`; return result; }
function time(value) { const [hour, minute] = String(value || "").split(":"); return hour ? `${Number(hour)}${minute && Number(minute) ? `:${String(minute).padStart(2, "0")}` : ""}hs` : ""; }
function reviewStars(value) { const rating = Math.max(0, Math.min(5, Math.round(Number(value || 0) * 2) / 2)); return [1, 2, 3, 4, 5].map(star => star - 0.5 === rating ? <i key={star} className="is_half"><FaStar /><span><FaStar /></span></i> : <i key={star} className={star <= Math.floor(rating) ? "is_full" : "is_empty"}><FaStar /></i>); }
function publicExperiencePath(slug) { if (typeof window === "undefined") return `/p/${slug}/mi-estadia`; const marker = "/mi-estadia"; const index = window.location.pathname.indexOf(marker); return index >= 0 ? `${window.location.pathname.slice(0, index)}${marker}` : `/p/${slug}/mi-estadia`; }

export default function GuestExperiencePublicApp({ slug, initialSection, initialData = null, previewMode = false }) {
    const [data, setData] = useState(initialData), [section, setSection] = useState(initialSection), [error, setError] = useState(""), [busy, setBusy] = useState(!initialData), [reviewRating, setReviewRating] = useState(null), [accessReason, setAccessReason] = useState("info");
    useEffect(() => { try { const stored = window.sessionStorage.getItem(`tags_guest_review_rating:${slug}`); if (stored) setReviewRating(Number(stored)); } catch {} }, [slug]);
    useEffect(() => { if (data?.review?.rating != null) setReviewRating(Number(data.review.rating)); }, [data?.review?.rating]);
    useEffect(() => {
        if (initialData) return;
        let cancelled = false;
        async function load() {
            try {
                const requestedReason = new URLSearchParams(window.location.search).get("access");
                if (["expired", "invalid"].includes(requestedReason)) setAccessReason(requestedReason);
                const response = await fetch(`/api/guest-experience/public/session?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
                const text = await response.text();
                let payload;
                try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
                if (cancelled) return;
                if (response.ok && payload) setData(payload);
                else setError(payload?.error || `No pudimos abrir Mi Estadía${response.status ? ` (HTTP ${response.status})` : ""}.`);
            } catch { if (!cancelled) setError("No pudimos conectarnos con Mi Estadía."); }
            finally { if (!cancelled) setBusy(false); }
        }
        load();
        return () => { cancelled = true; };
    }, [slug, initialData]);
    function navigate(next) { setSection(next); if (!previewMode) { const suffix = next === "inicio" ? "" : `/${next}`; window.history.pushState({}, "", `${publicExperiencePath(slug)}${suffix}`); window.scrollTo({ top: 0, behavior: "smooth" }); } }
    useEffect(() => { const back = () => setSection(window.location.pathname.split("/mi-estadia/")[1]?.split("/")[0] || "inicio"); window.addEventListener("popstate", back); return () => window.removeEventListener("popstate", back); }, []);
    useEffect(() => { const tokens = data?.experience?.theme?.css_tokens || {}, root = document.documentElement; for (const [key, value] of Object.entries(tokens)) if (key.startsWith("--")) root.style.setProperty(key, String(value)); return () => { for (const key of Object.keys(tokens)) if (key.startsWith("--")) root.style.removeProperty(key); }; }, [data]);
    if (busy) return <TagsSpinner size={120} borderSize={5} background="rgba(255,255,255,.82)" showLogo={false} />;
    if (error || !data) return <GuestExperienceAccessLanding slug={slug} reason={accessReason} />;
    const { experience, stay, guest } = data;
    const capabilities = experience.capabilities || { store: true, resto: true };
    const sectionVisibility = experience.settings?.sectionVisibility || {};
    const isSectionVisible = key => sectionVisibility[key] !== false;
    const visibleSections = SECTIONS.filter(([key]) => isSectionVisible(key)).filter(([key]) => key !== "tienda" || capabilities.store).filter(([key]) => key !== "gastronomia" || capabilities.resto).filter(([key]) => key !== "resena" || capabilities.reviews);
    const activeSection = section !== "inicio" && !isSectionVisible(section) ? "inicio" : section;
    const statusLabel = stay.status === "active" ? "En curso" : stay.status === "checked_out" ? "Finalizada" : "Reserva confirmada";
    const precheckinDone = ["submitted", "reviewed", "checked_in"].includes(stay.precheckinStatus);
    activeSchedule = { starts: String(stay.startsAt || "").slice(0, 10), ends: String(stay.endsAt || "").slice(0, 10), checkin: time(experience.settings?.checkinTime) || "A confirmar", checkout: time(experience.settings?.checkoutTime) || "A confirmar" };
    const checkinLabel = `${formatDate(stay.startsAt)} ${activeSchedule.checkin}`;
    const checkoutLabel = `${formatDate(stay.endsAt)} ${activeSchedule.checkout}`;
    const previewInformation = { wifiNetworks: [], information: experience.settings || {} };
    const previewAccount = data?.account || { account: null, entries: [], summary: { charges: 0, discounts: 0, paid: 0, balance: 0 } };
    const sectionContent = activeSection === "pre-checkin" ? <GuestExperiencePrecheckin slug={slug} previewData={previewMode ? { stay, guest } : null} onSubmitted={() => navigate("inicio")} onStatusChange={status => setData(current => ({ ...current, stay: { ...current.stay, precheckinStatus: status } }))} /> : activeSection === "wifi" ? <GuestExperienceInformation slug={slug} previewData={previewMode ? previewInformation : null} /> : activeSection === "cerca" ? <GuestExperienceNearbyPlaces slug={slug} previewData={previewMode ? { categories: [], places: [], originLabel: experience.name } : null} /> : activeSection === "beneficios" ? <GuestExperienceBenefits slug={slug} previewData={previewMode ? { categories: [], campaigns: [] } : null} /> : activeSection === "actividades" ? <GuestExperienceTurnos slug={slug} previewData={previewMode ? { services: [], bookings: [], guest } : null} /> : activeSection === "tienda" ? <GuestExperienceCommerceByType slug={slug} moduleType="store" previewData={previewMode ? { integrations: [], orders: [], guest, stay } : null} /> : activeSection === "gastronomia" ? <GuestExperienceCommerceByType slug={slug} moduleType="resto" previewData={previewMode ? { integrations: [], orders: [], guest, stay } : null} /> : activeSection === "mensajes" ? <GuestExperienceMessages slug={slug} previewData={previewMode ? { messages: [], requests: [], categories: [] } : null} /> : activeSection === "cuenta" ? <GuestExperiencePublicAccount slug={slug} previewData={previewMode ? previewAccount : null} /> : activeSection === "resena" && experience.reviewSlug ? <ClientReviewsPublicRenderer slug={experience.reviewSlug} initialCustomer={guest} onSubmitted={rating => { setReviewRating(rating); try { window.sessionStorage.setItem(`tags_guest_review_rating:${slug}`, String(rating)); } catch {} }} /> : <><span>PRÓXIMA ETAPA</span><h2>{SECTIONS.find(item => item[0] === activeSection)?.[1] || "Mi Estadía"}</h2><p>Esta sección ya forma parte del shell seguro de la estadía y se habilitará en la etapa funcional correspondiente.</p></>;
    return <main className="tags_guest_public_app"><header className="tags_guest_public_hero" style={experience.coverUrl ? { backgroundImage: `linear-gradient(180deg,rgba(9,25,17,.2),rgba(9,25,17,.78)),url(${experience.coverUrl})` } : undefined}><div className="tags_guest_public_brand">{experience.logoUrl ? <img src={experience.logoUrl} alt={experience.name} /> : <div><FaHouse /></div>}<span>{experience.name}</span></div><div className="tags_guest_public_welcome"><p>{experience.welcomeMessage || "Bienvenido a tu experiencia de estadía"}</p><h1>Mi Estadía</h1><strong>{guest.name}</strong><span>{stay.unitName || "Tu alojamiento"} · {date(stay.startsAt)} al {date(stay.endsAt)}</span></div></header>{activeSection === "inicio" ? <section className="tags_guest_public_home"><div className="tags_guest_public_status"><span>Estadía {stay.code}</span><strong>{statusLabel}</strong></div><div className="tags_guest_public_summary"><div><small>Ingreso</small><strong>{date(stay.startsAt)}</strong></div><div><small>Egreso</small><strong>{date(stay.endsAt)}</strong></div><div><small>Pasajeros</small><strong>{Number(stay.adults || 0) + Number(stay.children || 0)}</strong></div>{isSectionVisible("pre-checkin")&&<button type="button" className={precheckinDone ? "is_done" : ""} onClick={() => navigate("pre-checkin")}><FaClipboardCheck /><span>{precheckinDone ? "Pre-check-in enviado" : "Completar pre-check-in"}</span></button>}</div><div className="tags_guest_public_grid">{visibleSections.map(([key, label, Icon]) => <button key={key} type="button" onClick={() => navigate(key)}><Icon /><span>{label}</span>{key === "pre-checkin" && <small>{precheckinDone ? "Enviado" : "Pendiente"}</small>}{key === "resena" && reviewRating !== null && <small className="tags_guest_public_review_rating">{reviewStars(reviewRating)} <b>{Number(reviewRating).toFixed(1)}</b></small>}</button>)}</div></section> : <section className="tags_guest_public_section"><button className="tags_guest_public_back" type="button" onClick={() => navigate("inicio")}><FaArrowLeft />Mi Estadía</button><div className="tags_guest_public_section_card">{sectionContent}</div></section>}</main>;
}
