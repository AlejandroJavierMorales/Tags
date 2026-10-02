"use client";

import { useEffect, useMemo, useState } from "react";
import { FaArrowTrendUp, FaBullhorn, FaCheck, FaImage, FaLink, FaLocationArrow, FaPhone, FaRotate, FaStar, FaTrashCan, FaWandMagicSparkles } from "react-icons/fa6";
import MediaUploader from "@/app/components/MediaUploader";
import showAlert from "@/app/components/showAlert";
import "./GoogleBusinessProfileGrowth.css";

const MEDIA_CATEGORIES = [
    ["ADDITIONAL", "Foto general"], ["COVER", "Portada"], ["PROFILE", "Perfil"],
    ["EXTERIOR", "Exterior"], ["INTERIOR", "Interior"], ["PRODUCT", "Producto"],
    ["AT_WORK", "Trabajando"], ["FOOD_AND_DRINK", "Comidas y bebidas"],
    ["MENU", "Menú"], ["COMMON_AREA", "Área común"], ["ROOMS", "Habitaciones"], ["TEAMS", "Equipo"]
];

const METRIC_LABELS = {
    BUSINESS_IMPRESSIONS_DESKTOP_MAPS: "Vistas en Maps desde computadora",
    BUSINESS_IMPRESSIONS_MOBILE_MAPS: "Vistas en Maps desde celulares",
    BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: "Vistas en Google desde computadora",
    BUSINESS_IMPRESSIONS_MOBILE_SEARCH: "Vistas en Google desde celulares",
    WEBSITE_CLICKS: "Visitas al sitio web",
    CALL_CLICKS: "Llamadas desde Google",
    BUSINESS_DIRECTION_REQUESTS: "Solicitudes de cómo llegar"
};

function friendlySectionError(section) {
    const labels = { reviews: "reseñas", media: "imágenes", posts: "publicaciones", performance: "estadísticas" };
    return `Google no devolvió ${labels[section] || "esta información"} para este perfil. Puede depender del tipo de negocio, sus permisos o de que la API correspondiente todavía no esté habilitada.`;
}

function reviewStars(value) {
    const map = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    return map[value] || Number(value || 0);
}

function metricTotals(payload) {
    const totals = {};
    const groups = payload?.multiDailyMetricTimeSeries || [];
    for (const group of groups) {
        for (const series of group.dailyMetricTimeSeries || []) {
            const values = series.timeSeries?.datedValues || [];
            totals[series.dailyMetric] = values.reduce((sum, item) => sum + Number(item.value || 0), 0);
        }
    }
    return totals;
}

export default function GoogleBusinessProfileGrowth({ businessId, section, profile, business, connected }) {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [mediaUrl, setMediaUrl] = useState("");
    const [mediaCategory, setMediaCategory] = useState("ADDITIONAL");
    const [postSummary, setPostSummary] = useState("");
    const [postUrl, setPostUrl] = useState("");
    const [replies, setReplies] = useState({});

    async function readPayload(response) {
        const text = await response.text();
        if (!text) return {};
        try { return JSON.parse(text); } catch { return {}; }
    }

    async function loadContent() {
        if (!connected) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/google-business-profile/admin/content?businessId=${businessId}`, { cache: "no-store" });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "No se pudo consultar Google");
            setContent(payload);
        } catch {
            setContent({ loadError: true });
        } finally { setLoading(false); }
    }

    useEffect(() => { loadContent(); }, [businessId, connected]);

    async function perform(action, values, successText) {
        setBusy(true);
        try {
            const response = await fetch("/api/google-business-profile/admin/content", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId, action, ...values })
            });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "Google no aceptó la operación");
            await loadContent();
            await showAlert({ title: "Listo", text: successText, icon: "success", timer: 1800 });
            return true;
        } catch {
            await showAlert({ title: "No se pudo completar", text: "Google rechazó la operación. Revisá la conexión y los datos ingresados antes de volver a intentar.", icon: "error" });
            return false;
        } finally { setBusy(false); }
    }

    async function deletePost(postName) {
        const accepted = await showAlert({ title: "¿Eliminar esta publicación?", text: "También desaparecerá del perfil público de Google y no se puede recuperar desde esta herramienta.", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", cancelButtonText: "Cancelar" });
        if (!accepted) return;
        await perform("delete_post", { postName }, "La publicación fue eliminada de Google.");
    }

    const reviews = content?.reviews?.data?.reviews || [];
    const media = content?.media?.data?.mediaItems || [];
    const posts = content?.posts?.data?.localPosts || [];
    const metrics = useMemo(() => metricTotals(content?.performance?.data), [content]);
    const unansweredReviews = reviews.filter(item => item.comment && !item.reviewReply?.comment).length;
    const recommendations = useMemo(() => {
        const items = [
            { complete: Boolean(business?.description), title: "Completar una buena descripción", text: "Explicá claramente qué ofrece el negocio, a quién atiende y qué lo diferencia." },
            { complete: Boolean(business?.phone || business?.whatsapp), title: "Agregar un teléfono de contacto", text: "Facilita que las personas llamen o consulten después de encontrar el perfil." },
            { complete: Boolean(business?.website_url), title: "Vincular el sitio web", text: "Permite que el público conozca más información y realice acciones fuera de Google." },
            { complete: Boolean(profile?.primary_category_id), title: "Definir la categoría principal", text: "Es una de las señales más importantes para aparecer en búsquedas relevantes." },
            { complete: Object.keys(profile?.regular_hours || {}).length > 0, title: "Informar horarios", text: "Evitá consultas y visitas cuando el negocio está cerrado." },
            { complete: (profile?.services || []).length > 0, title: "Detallar productos o servicios", text: "Ayuda a explicar con precisión qué puede encontrar cada cliente." },
            { complete: media.length >= 5, title: "Publicar al menos cinco imágenes", text: "Mostrá el frente, el interior, productos, servicios y al equipo trabajando." },
            { complete: unansweredReviews === 0, title: "Responder reseñas pendientes", text: unansweredReviews ? `Hay ${unansweredReviews} reseña${unansweredReviews === 1 ? "" : "s"} con comentario sin responder.` : "Las reseñas con comentarios tienen respuesta." },
            { complete: posts.length > 0, title: "Mantener novedades publicadas", text: "Compartí información útil, novedades, promociones o cambios importantes." }
        ];
        const completed = items.filter(item => item.complete).length;
        return { items, score: Math.round((completed / items.length) * 100) };
    }, [business, profile, media.length, posts.length, unansweredReviews]);

    if (!connected) return <section className="tags_gbp_panel tags_gbp_growth_empty"><FaLink /><h2>Primero conectá el perfil de Google</h2><p>Estas herramientas se habilitan cuando elegís la cuenta y el perfil empresarial que querés administrar.</p></section>;
    if (loading && !content) return <section className="tags_gbp_panel tags_gbp_growth_empty"><FaRotate className="is_spinning" /><h2>Consultando Google...</h2></section>;
    if (content?.loadError) return <section className="tags_gbp_panel tags_gbp_growth_empty"><FaRotate /><h2>No pudimos consultar el perfil</h2><p>Revisá que la conexión siga activa y volvé a intentarlo.</p><button type="button" onClick={loadContent}>Volver a intentar</button></section>;

    if (section === "media") return <section className="tags_gbp_growth_grid">
        <article className="tags_gbp_panel"><header><div><small>NUEVA IMAGEN</small><h2>Agregar una foto al perfil</h2><p>Cargala aquí, elegí qué representa y confirmá el envío al perfil de Google.</p></div></header><div className="tags_gbp_media_form"><MediaUploader businessId={businessId} value={mediaUrl} module="google-business-profile" variant="photo" entityId={businessId} accept="image/*" label="Seleccionar imagen" onChange={item => setMediaUrl(item?.url || "")} /><label>Tipo de imagen<select value={mediaCategory} onChange={event => setMediaCategory(event.target.value)}>{MEDIA_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" disabled={busy || !mediaUrl} onClick={async () => { if (await perform("add_media", { sourceUrl: mediaUrl, category: mediaCategory }, "La imagen fue enviada al perfil de Google.")) setMediaUrl(""); }}><FaImage /> Enviar imagen a Google</button></div></article>
        <article className="tags_gbp_panel"><header><div><small>GALERÍA DE GOOGLE</small><h2>Imágenes publicadas</h2><p>{media.length ? `${media.length} imagen${media.length === 1 ? "" : "es"} disponible${media.length === 1 ? "" : "s"}.` : "Todavía no hay imágenes para mostrar."}</p></div><button type="button" className="tags_gbp_growth_refresh" onClick={loadContent}><FaRotate /> Actualizar</button></header>{content?.media?.available ? <div className="tags_gbp_media_gallery">{media.map(item => <figure key={item.name}><img src={item.googleUrl || item.thumbnailUrl} alt={item.description || "Imagen del perfil"} /><figcaption>{MEDIA_CATEGORIES.find(([value]) => value === item.locationAssociation?.category)?.[1] || "Imagen"}</figcaption></figure>)}{!media.length && <p className="tags_gbp_growth_notice">Google no devolvió imágenes publicadas.</p>}</div> : <p className="tags_gbp_growth_notice">{friendlySectionError("media")}</p>}</article>
    </section>;

    if (section === "reviews") return <section className="tags_gbp_panel"><header><div><small>REPUTACIÓN</small><h2>Reseñas y respuestas</h2><p>Respondé con un mensaje personal, breve y profesional.</p></div><button type="button" className="tags_gbp_growth_refresh" onClick={loadContent}><FaRotate /> Actualizar</button></header>{content?.reviews?.available ? <div className="tags_gbp_review_list">{reviews.map(review => <article key={review.reviewId || review.name}><div className="tags_gbp_review_head"><strong>{review.reviewer?.displayName || "Cliente de Google"}</strong><span>{Array.from({ length: reviewStars(review.starRating) }, (_, index) => <FaStar key={index} />)}</span></div><p>{review.comment || "Esta persona dejó una calificación sin comentario."}</p>{review.reviewReply?.comment && <blockquote><strong>Respuesta actual</strong>{review.reviewReply.comment}</blockquote>}<textarea value={replies[review.name] ?? review.reviewReply?.comment ?? ""} onChange={event => setReplies(current => ({ ...current, [review.name]: event.target.value }))} placeholder="Escribí una respuesta..." /><button type="button" disabled={busy || !(replies[review.name] ?? review.reviewReply?.comment ?? "").trim()} onClick={() => perform("reply_review", { reviewName: review.name, comment: replies[review.name] ?? review.reviewReply?.comment }, "La respuesta fue enviada a Google.")}><FaCheck /> {review.reviewReply ? "Actualizar respuesta" : "Responder reseña"}</button></article>)}{!reviews.length && <p className="tags_gbp_growth_notice">Este perfil todavía no tiene reseñas para responder.</p>}</div> : <p className="tags_gbp_growth_notice">{friendlySectionError("reviews")}</p>}</section>;

    if (section === "posts") return <section className="tags_gbp_growth_grid">
        <article className="tags_gbp_panel"><header><div><small>NOVEDAD</small><h2>Crear una publicación</h2><p>Contá una novedad concreta y agregá un enlace solo si ayuda al cliente.</p></div></header><div className="tags_gbp_post_form"><label>Texto<textarea rows="6" maxLength="1500" value={postSummary} onChange={event => setPostSummary(event.target.value)} placeholder="Ej.: Incorporamos un nuevo servicio..." /></label><label>Enlace opcional<input type="url" value={postUrl} onChange={event => setPostUrl(event.target.value)} placeholder="https://..." /></label><button type="button" disabled={busy || !postSummary.trim()} onClick={async () => { if (await perform("create_post", { summary: postSummary, url: postUrl }, "La publicación fue enviada a Google.")) { setPostSummary(""); setPostUrl(""); } }}><FaBullhorn /> Publicar en Google</button></div></article>
        <article className="tags_gbp_panel"><header><div><small>PUBLICACIONES</small><h2>Contenido reciente</h2></div><button type="button" className="tags_gbp_growth_refresh" onClick={loadContent}><FaRotate /> Actualizar</button></header>{content?.posts?.available ? <div className="tags_gbp_post_list">{posts.map(post => <article key={post.name}><p>{post.summary || "Publicación sin texto."}</p><div>{post.createTime && <span>{new Date(post.createTime).toLocaleDateString("es-AR")}</span>}<button type="button" disabled={busy} onClick={() => deletePost(post.name)}><FaTrashCan /> Eliminar</button></div></article>)}{!posts.length && <p className="tags_gbp_growth_notice">No hay publicaciones recientes para mostrar.</p>}</div> : <p className="tags_gbp_growth_notice">{friendlySectionError("posts")}</p>}</article>
    </section>;

    if (section === "performance") return <section className="tags_gbp_panel"><header><div><small>ÚLTIMOS 90 DÍAS</small><h2>Rendimiento del perfil</h2><p>Interacciones registradas directamente por Google.</p></div><button type="button" className="tags_gbp_growth_refresh" onClick={loadContent}><FaRotate /> Actualizar</button></header>{content?.performance?.available ? <div className="tags_gbp_metrics">{Object.entries(METRIC_LABELS).map(([key, label]) => <article key={key}><FaArrowTrendUp /><span>{label}</span><strong>{Number(metrics[key] || 0).toLocaleString("es-AR")}</strong></article>)}</div> : <p className="tags_gbp_growth_notice">{friendlySectionError("performance")}</p>}<p className="tags_gbp_growth_footnote">Los datos pueden demorar algunos días en consolidarse y dependen de la información que Google habilita para cada perfil.</p></section>;

    return <section className="tags_gbp_optimization">
        <article className="tags_gbp_panel tags_gbp_optimization_score"><div className="tags_gbp_score_ring" style={{ "--score": recommendations.score }}>{recommendations.score}<small>/100</small></div><div><small>OPORTUNIDADES DE MEJORA</small><h2>{recommendations.score >= 80 ? "El perfil está bien trabajado" : "Hay acciones concretas para mejorar"}</h2><p>Este diagnóstico compara la información local del negocio con el contenido que Google permite consultar.</p></div></article>
        <article className="tags_gbp_panel"><header><div><small>PLAN DE ACCIÓN</small><h2>Qué conviene hacer ahora</h2><p>Empezá por los puntos pendientes. Ningún cambio se publica automáticamente.</p></div></header><div className="tags_gbp_optimization_list">{recommendations.items.map(item => <article key={item.title} className={item.complete ? "is_complete" : "is_pending"}>{item.complete ? <FaCheck /> : <FaWandMagicSparkles />}<div><strong>{item.title}</strong><p>{item.text}</p></div><span>{item.complete ? "Completo" : "Pendiente"}</span></article>)}</div></article>
        <article className="tags_gbp_panel tags_gbp_growth_tip"><FaLocationArrow /><div><strong>Un perfil útil antes que uno recargado</strong><p>La prioridad es que categoría, ubicación, horarios, contacto, servicios e imágenes sean correctos. Después se trabaja la actividad y el rendimiento.</p></div><div className="tags_gbp_growth_tip_actions"><span><FaPhone /> Contacto claro</span><span><FaImage /> Fotos reales</span><span><FaStar /> Reseñas respondidas</span></div></article>
    </section>;
}
