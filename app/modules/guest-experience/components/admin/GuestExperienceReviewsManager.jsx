"use client";

import { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaChevronDown, FaChevronLeft, FaChevronRight, FaEye, FaGoogle, FaStar, FaWhatsapp } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./GuestExperienceReviewsManager.css";

function read(response) { return response.text().then(text => { try { return text ? JSON.parse(text) : {}; } catch { return { error: "Respuesta inválida del servidor" }; } }); }
function date(value) { return value ? new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"; }
function whatsapp(value) { let digits = String(value || "").replace(/\D/g, ""); if (digits.startsWith("00")) digits = digits.slice(2); if (digits.startsWith("54")) return digits.startsWith("549") ? digits : `549${digits.slice(2).replace(/^15/, "")}`; digits = digits.replace(/^0/, "").replace(/^15/, ""); return digits ? `549${digits}` : ""; }

export default function GuestExperienceReviewsManager({ businessId, data, onBack }) {
    const [state, setState] = useState({ form: null, questions: [], responses: [], page: 1, pages: 0, total: 0, summary: { total: 0, average: 0 } });
    const [filters, setFilters] = useState({ period: "30", rating: "all", sort: "recent" });
    const [detail, setDetail] = useState(null), [busy, setBusy] = useState(false), [page, setPage] = useState(1);
    async function load(nextPage = page, nextFilters = filters) {
        setBusy(true);
        try {
            const params = new URLSearchParams({ businessId: String(businessId), guestAppId: String(data.app.id), page: String(nextPage), period: nextFilters.period, rating: nextFilters.rating, sort: nextFilters.sort });
            const response = await fetch(`/api/guest-experience/admin/reviews?${params}`, { cache: "no-store" });
            const payload = await read(response);
            if (!response.ok) return showAlert({ title: "No se pudieron cargar las reseñas", text: payload.error, icon: "error" });
            setState(payload); setPage(nextPage);
        } finally { setBusy(false); }
    }
    useEffect(() => { load(1); }, [businessId, data.app.id, filters.period, filters.rating, filters.sort]);
    async function openDetail(id) {
        if (detail?.response?.id === id) return setDetail(null);
        setBusy(true);
        try {
            const response = await fetch(`/api/guest-experience/admin/reviews?businessId=${businessId}&guestAppId=${data.app.id}&responseId=${id}`, { cache: "no-store" });
            const payload = await read(response);
            if (!response.ok) return showAlert({ title: "No se pudo cargar el detalle", text: payload.error, icon: "error" });
            setDetail(payload);
        } finally { setBusy(false); }
    }
    const threshold = Number(state.form?.positive_threshold || 4), googleUrl = state.form?.google_review_url || "";
    const message = item => `Hola ${item.customer_name || ""}, gracias por habernos visitado y por calificar tu experiencia en ${data.app.name || "nuestro alojamiento"}. Si tenés un momento, nos ayudarías mucho dejando también tu reseña en Google haciendo click en el siguiente enlace: ${googleUrl}`;
    const pages = useMemo(() => Array.from({ length: state.pages || 0 }, (_, index) => index + 1), [state.pages]);
    function updateFilter(field, value) { setFilters(current => ({ ...current, [field]: value })); setPage(1); setDetail(null); }
    return <section className="tags_guest_reviews_admin">
        <header className="tags_guest_reviews_heading"><div><span>EXPERIENCIA DEL HUÉSPED</span><h2>Reseñas</h2><p>Consultá las opiniones recibidas y contactá a cada huésped.</p></div>{onBack && <button type="button" onClick={onBack}><FaArrowLeft /> Volver</button>}</header>
        <section className="tags_guest_reviews_google"><div><FaGoogle /><div><span>Invitación a Google</span><strong>Umbral configurado: {threshold}/5</strong><small>{threshold >= 4 ? "Las calificaciones iguales o superiores invitan a dejar una reseña en Google." : "El umbral está configurado en Tags Reviews."}</small></div></div>{googleUrl ? <a href={googleUrl} target="_blank" rel="noreferrer">Ver enlace configurado</a> : <b>Falta configurar el enlace de Google</b>}</section>
        <section className="tags_guest_reviews_questions"><header><div><span>FORMULARIO ACTIVO</span><h3>Preguntas configuradas</h3></div><strong>{state.questions.length}</strong></header>{state.questions.length ? <ol>{state.questions.map(item => <li key={item.id}><span>{item.question_text}</span>{item.is_required ? <small>Obligatoria</small> : <small>Opcional</small>}</li>)}</ol> : <p>No hay preguntas visibles configuradas.</p>}</section>
        <section className="tags_guest_reviews_kpis"><article><span>RESEÑAS</span><strong>{state.summary?.total || 0}</strong><small>Según los filtros</small></article><article><span>CALIFICACIÓN PROMEDIO</span><strong>{Number(state.summary?.average || 0).toFixed(1)} <FaStar /></strong><small>Sobre 5 estrellas</small></article><div className="tags_guest_reviews_filters"><label>Período<select value={filters.period} onChange={event => updateFilter("period", event.target.value)}><option value="30">Últimos 30 días</option><option value="7">Últimos 7 días</option><option value="90">Últimos 90 días</option><option value="365">Último año</option><option value="all">Todas las fechas</option></select></label><label>Calificación<select value={filters.rating} onChange={event => updateFilter("rating", event.target.value)}><option value="all">Todas</option><option value="5">5 estrellas</option><option value="4">4 estrellas</option><option value="3">3 estrellas</option><option value="2">2 estrellas</option><option value="1">1 estrella</option></select></label><label>Orden<select value={filters.sort} onChange={event => updateFilter("sort", event.target.value)}><option value="recent">Más recientes</option><option value="oldest">Más antiguas</option></select></label></div></section>
        <section className="tags_guest_reviews_list"><header><div><span>RESPUESTAS RECIBIDAS</span><h3>Reseñas</h3></div><strong>{state.total} total</strong></header>{state.responses.map(item => { const phone = whatsapp(item.customer_phone); return <article key={item.id} className={detail?.response?.id === item.id ? "is_open" : ""}><button type="button" className="tags_guest_reviews_row" onClick={() => openDetail(item.id)}><time>{date(item.created_at)}</time><span className="tags_guest_reviews_customer"><strong>{item.customer_name || "Cliente sin nombre"}</strong><small>{item.customer_email || "Sin email"}</small></span><span className="tags_guest_reviews_rating"><span>{[1, 2, 3, 4, 5].map(star => <FaStar key={star} className={star <= Math.round(Number(item.average_rating || 0)) ? "is_filled" : ""} />)}</span><b>{Number(item.average_rating || 0).toFixed(1)}</b></span><span className="tags_guest_reviews_verified">{item.verified_purchase ? "V" : ""}</span><FaChevronDown className="tags_guest_reviews_arrow" /></button>{detail?.response?.id === item.id && <div className="tags_guest_reviews_detail"><dl><div><dt>Cliente</dt><dd>{item.customer_name || "—"}</dd></div><div><dt>Email</dt><dd>{item.customer_email || "—"}</dd></div><div><dt>Teléfono</dt><dd>{item.customer_phone || "—"}</dd></div><div><dt>Comentario general</dt><dd>{detail.response.general_comment || "Sin comentario general"}</dd></div></dl><div className="tags_guest_reviews_answers">{detail.answers.map(answer => <div key={answer.id}><strong>{answer.question_text || "Respuesta"}</strong><span>{[1, 2, 3, 4, 5].map(star => <FaStar key={star} className={star <= Number(answer.rating || 0) ? "is_filled" : ""} />)} {answer.rating || "—"}/5</span>{answer.comment && <p>{answer.comment}</p>}</div>)}</div><footer>{phone ? <a href={`https://wa.me/${phone}?text=${encodeURIComponent(message(item))}`} target="_blank" rel="noreferrer"><FaWhatsapp /> Agradecer por WhatsApp</a> : <span className="tags_guest_reviews_no_phone">No hay teléfono para contactar por WhatsApp</span>}<span className="tags_guest_reviews_public"><FaEye /> {item.is_public ? "Visible" : "Privada"}</span></footer></div>}</article>; })}{!state.responses.length && !busy && <p className="tags_guest_reviews_empty">Todavía no hay reseñas recibidas.</p>}</section>
        {state.pages > 1 && <nav className="tags_guest_reviews_pagination"><button type="button" disabled={page <= 1} onClick={() => load(page - 1)}><FaChevronLeft /></button>{pages.map(value => <button type="button" key={value} className={value === page ? "is_active" : ""} onClick={() => load(value)}>{value}</button>)}<button type="button" disabled={page >= state.pages} onClick={() => load(page + 1)}><FaChevronRight /></button></nav>}
        {busy && <TagsSpinner size={105} logoSize={55} borderSize={5} background="rgba(255,255,255,.72)" />}
    </section>;
}
