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

const LODGING_GROUP_LABELS = {
    property: "Datos del establecimiento",
    services: "Atención y servicios",
    policies: "Políticas",
    foodAndDrink: "Comidas y bebidas",
    pools: "Piscinas",
    wellness: "Bienestar",
    activities: "Actividades",
    transportation: "Transporte",
    families: "Familias",
    connectivity: "Conectividad e Internet",
    business: "Servicios para empresas",
    accessibility: "Accesibilidad",
    pets: "Mascotas",
    parking: "Estacionamiento",
    housekeeping: "Limpieza y habitación",
    healthAndSafety: "Salud y seguridad",
    sustainability: "Sustentabilidad",
    commonLivingArea: "Áreas comunes",
    guestUnits: "Tipos de alojamiento"
};

function emptyLodgingCount() {
    return { total: 0, active: 0, inactive: 0, conditional: 0, details: 0 };
}

function addLodgingCount(target, source) {
    for (const key of Object.keys(target)) target[key] += Number(source[key] || 0);
    return target;
}

function countLodgingValues(value, key = "") {
    const count = emptyLodgingCount();
    if (value == null || value === "") return count;
    if (typeof value === "boolean") return { ...count, total: 1, active: value ? 1 : 0, inactive: value ? 0 : 1 };
    if (typeof value === "string" || typeof value === "number") {
        const conditional = /Exception$/i.test(key) ? 1 : 0;
        return { ...count, total: 1, conditional, details: conditional ? 0 : 1 };
    }
    if (Array.isArray(value)) return value.reduce((result, item) => addLodgingCount(result, countLodgingValues(item, key)), count);
    if (typeof value === "object") return Object.entries(value).reduce((result, [childKey, childValue]) => addLodgingCount(result, countLodgingValues(childValue, childKey)), count);
    return count;
}

function summarizeLodging(payload) {
    const groups = [];
    const totals = emptyLodgingCount();
    for (const [key, value] of Object.entries(payload || {})) {
        if (["name", "metadata", "allUnits", "someUnits"].includes(key)) continue;
        const count = countLodgingValues(value, key);
        if (!count.total) continue;
        addLodgingCount(totals, count);
        groups.push({ key, label: LODGING_GROUP_LABELS[key] || key, ...count });
    }
    return { ...totals, groups, updatedAt: payload?.metadata?.updateTime || "" };
}

function friendlySectionError(section) {
    const labels = { reviews: "reseñas", media: "imágenes", posts: "publicaciones", performance: "estadísticas" };
    return `Google no devolvió ${labels[section] || "esta información"} para este perfil. Puede depender del tipo de negocio, sus permisos o de que la API correspondiente todavía no esté habilitada.`;
}

function reviewStars(value) {
    const map = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    return map[value] || Number(value || 0);
}

function reviewDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "Fecha no informada";
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function RefreshButton({ loading, onClick }) {
    return <button type="button" className="tags_gbp_growth_refresh" onClick={onClick} disabled={loading}>
        <FaRotate className={loading ? "is_spinning" : ""} /> {loading ? "Actualizando..." : "Actualizar"}
    </button>;
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

export default function GoogleBusinessProfileGrowth({ businessId, section, profile, answers = {}, business, connected, onNavigate }) {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pendingAction, setPendingAction] = useState("");
    const [mediaUrl, setMediaUrl] = useState("");
    const [mediaCategory, setMediaCategory] = useState("ADDITIONAL");
    const [postSummary, setPostSummary] = useState("");
    const [postUrl, setPostUrl] = useState("");
    const [editingPostName, setEditingPostName] = useState("");
    const [replies, setReplies] = useState({});
    const [performanceDays, setPerformanceDays] = useState(90);
    const busy = Boolean(pendingAction);

    async function readPayload(response) {
        const text = await response.text();
        if (!text) return {};
        try { return JSON.parse(text); } catch { return {}; }
    }

    async function loadContent(daysOverride) {
        if (!connected) return;
        const requestedDays = [7, 28, 90, 180, 365].includes(Number(daysOverride)) ? Number(daysOverride) : performanceDays;
        setLoading(true);
        try {
            const response = await fetch(`/api/google-business-profile/admin/content?businessId=${businessId}&performanceDays=${requestedDays}`, { cache: "no-store" });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "No se pudo consultar Google");
            setContent(payload);
        } catch {
            setContent({ loadError: true });
        } finally { setLoading(false); }
    }

    useEffect(() => { loadContent(); }, [businessId, connected]);

    async function perform(action, values, successText) {
        setPendingAction(action);
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
        } catch (error) {
            await showAlert({ title: "No se pudo completar", text: error?.message || "Google rechazó la operación. Revisá la conexión y los datos ingresados antes de volver a intentar.", icon: "error" });
            return false;
        } finally { setPendingAction(""); }
    }

    function editPost(post) {
        setEditingPostName(post.name || "");
        setPostSummary(post.summary || "");
        setPostUrl(post.callToAction?.url || "");
    }

    function cancelPostEdit() {
        setEditingPostName("");
        setPostSummary("");
        setPostUrl("");
    }

    async function deletePost(postName) {
        const accepted = await showAlert({ title: "¿Eliminar esta publicación?", text: "También desaparecerá del perfil público de Google y no se puede recuperar desde esta herramienta.", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", cancelButtonText: "Cancelar" });
        if (!accepted) return;
        await perform("delete_post", { postName }, "La publicación fue eliminada de Google.");
    }

    const reviews = [...(content?.reviews?.data?.reviews || [])].sort((left, right) => new Date(right.createTime || 0).getTime() - new Date(left.createTime || 0).getTime());
    const media = content?.media?.data?.mediaItems || [];
    const posts = content?.posts?.data?.localPosts || [];
    const googleLocation = content?.location?.data || {};
    const googleServiceItems = content?.location?.data?.serviceItems || [];
    const googleRegularPeriods = googleLocation?.regularHours?.periods || [];
    const googleAttributes = content?.attributes?.data?.attributes || [];
    const merchantLodgingSummary = useMemo(() => summarizeLodging(content?.lodging?.data), [content?.lodging?.data]);
    const googleUpdatedLodgingSummary = useMemo(() => summarizeLodging(content?.googleUpdatedLodging?.data?.lodging), [content?.googleUpdatedLodging?.data?.lodging]);
    const effectiveLodgingSummary = merchantLodgingSummary.total ? merchantLodgingSummary : googleUpdatedLodgingSummary;
    const metrics = useMemo(() => metricTotals(content?.performance?.data), [content]);
    const unansweredReviews = reviews.filter(item => item.comment && !item.reviewReply?.comment).length;
    const recommendations = useMemo(() => {
        const isAccommodation = profile?.business_type === "accommodation";
        const hasLocalServices = (profile?.services || []).length > 0;
        const hasAccommodationAmenities = Boolean(String(answers?.amenities || "").trim()) || effectiveLodgingSummary.total > 0 || googleAttributes.length > 0;
        const items = [
            { complete: Boolean(business?.description), title: "Completar una buena descripción", text: "Explicá claramente qué ofrece el negocio, a quién atiende y qué lo diferencia.", section: "basic", action: "Ir a Información básica" },
            { complete: Boolean(business?.phone || business?.whatsapp), title: "Agregar un teléfono de contacto", text: "Facilita que las personas llamen o consulten después de encontrar el perfil.", section: "basic", action: "Ir a Información básica" },
            { complete: Boolean(business?.website_url), title: "Vincular el sitio web", text: "Permite que el público conozca más información y realice acciones fuera de Google.", section: "basic", action: "Ir a Información básica" },
            { complete: Boolean(profile?.primary_category_id), title: "Definir la categoría principal", text: "Es una de las señales más importantes para aparecer en búsquedas relevantes.", section: "services", action: "Ir a Categorías y servicios" },
            { complete: Object.keys(profile?.regular_hours || {}).length > 0 || googleRegularPeriods.length > 0, title: "Informar horarios", text: googleRegularPeriods.length > 0 ? "Google ya tiene horarios habituales publicados para este perfil." : "Evitá consultas y visitas cuando el negocio está cerrado.", section: "hours", action: "Ir a Ubicación y horarios" },
            { complete: hasLocalServices || googleServiceItems.length > 0 || (isAccommodation && hasAccommodationAmenities), title: isAccommodation ? "Detallar servicios y comodidades" : "Detallar productos o servicios", text: isAccommodation ? "Informá las comodidades y prestaciones reales del alojamiento." : "Ayuda a explicar con precisión qué puede encontrar cada cliente.", section: "services", action: "Ir a Categorías y servicios" },
            { complete: media.length >= 5, title: "Publicar al menos cinco imágenes", text: "Mostrá el frente, el interior, productos, servicios y al equipo trabajando.", section: "media", action: "Ir a Imágenes" },
            { complete: unansweredReviews === 0, title: "Responder reseñas pendientes", text: unansweredReviews ? `Hay ${unansweredReviews} reseña${unansweredReviews === 1 ? "" : "s"} con comentario sin responder.` : "Las reseñas con comentarios tienen respuesta.", section: "reviews", action: "Ir a Reseñas" },
            { complete: posts.length > 0, title: "Mantener novedades publicadas", text: "Compartí información útil, novedades, promociones o cambios importantes.", section: "posts", action: "Ir a Publicaciones" }
        ];
        const completed = items.filter(item => item.complete).length;
        return { items, score: Math.round((completed / items.length) * 100) };
    }, [answers, business, effectiveLodgingSummary.total, googleAttributes.length, googleRegularPeriods.length, googleServiceItems.length, profile, media.length, posts.length, unansweredReviews]);

    if (!connected) return <section className="tags_gbp_panel tags_gbp_growth_empty"><FaLink /><h2>Primero conectá el perfil de Google</h2><p>Estas herramientas se habilitan cuando elegís la cuenta y el perfil empresarial que querés administrar.</p></section>;
    if (loading && !content) return <section className="tags_gbp_panel tags_gbp_growth_empty"><FaRotate className="is_spinning" /><h2>Consultando Google...</h2></section>;
    if (content?.loadError) return <section className="tags_gbp_panel tags_gbp_growth_empty"><FaRotate /><h2>No pudimos consultar el perfil</h2><p>Revisá que la conexión siga activa y volvé a intentarlo.</p><button type="button" onClick={loadContent}>Volver a intentar</button></section>;

    if (section === "media") return <section className="tags_gbp_growth_grid">
        <article className="tags_gbp_panel"><header><div><small>NUEVA IMAGEN</small><h2>Agregar una foto al perfil</h2><p>Cargala aquí, elegí qué representa y confirmá el envío al perfil de Google.</p></div></header><div className="tags_gbp_media_form"><MediaUploader businessId={businessId} value={mediaUrl} module="google-business-profile" variant="photo" entityId={businessId} accept="image/*" label="Seleccionar imagen" onChange={item => setMediaUrl(item?.url || "")} /><label>Tipo de imagen<select value={mediaCategory} onChange={event => setMediaCategory(event.target.value)}>{MEDIA_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" disabled={busy || !mediaUrl} onClick={async () => { if (await perform("add_media", { sourceUrl: mediaUrl, category: mediaCategory }, "La imagen fue enviada al perfil de Google.")) setMediaUrl(""); }}>{pendingAction === "add_media" ? <FaRotate className="is_spinning" /> : <FaImage />} {pendingAction === "add_media" ? "Enviando..." : "Enviar imagen a Google"}</button></div></article>
        <article className="tags_gbp_panel"><header><div><small>GALERÍA DE GOOGLE</small><h2>Imágenes publicadas</h2><p>{media.length ? `${media.length} imagen${media.length === 1 ? "" : "es"} disponible${media.length === 1 ? "" : "s"}.` : "Todavía no hay imágenes para mostrar."}</p></div><RefreshButton loading={loading} onClick={loadContent} /></header>{content?.media?.available ? <div className="tags_gbp_media_gallery">{media.map(item => <figure key={item.name}><img src={item.googleUrl || item.thumbnailUrl} alt={item.description || "Imagen del perfil"} /><figcaption>{MEDIA_CATEGORIES.find(([value]) => value === item.locationAssociation?.category)?.[1] || "Imagen"}</figcaption></figure>)}{!media.length && <p className="tags_gbp_growth_notice">Google no devolvió imágenes publicadas.</p>}</div> : <p className="tags_gbp_growth_notice">{friendlySectionError("media")}</p>}</article>
    </section>;

    if (section === "reviews") return <section className="tags_gbp_panel">
        <header><div><small>REPUTACIÓN</small><h2>Reseñas y respuestas</h2><p>Ordenadas por fecha de publicación, desde la más reciente. Respondé con un mensaje personal, breve y profesional.</p></div><RefreshButton loading={loading} onClick={loadContent} /></header>
        {content?.reviews?.available ? <div className="tags_gbp_review_list">
            {reviews.map(review => <article key={review.reviewId || review.name}>
                <div className="tags_gbp_review_head"><strong>{review.reviewer?.displayName || "Cliente de Google"}</strong><span>{Array.from({ length: reviewStars(review.starRating) }, (_, index) => <FaStar key={index} />)}</span></div>
                <time className="tags_gbp_review_date" dateTime={review.createTime || undefined}>Publicada el {reviewDate(review.createTime)}</time>
                <p>{review.comment || "Esta persona dejó una calificación sin comentario."}</p>
                {review.reviewReply?.comment && <blockquote><strong>Respuesta actual</strong>{review.reviewReply.comment}</blockquote>}
                <textarea value={replies[review.name] ?? review.reviewReply?.comment ?? ""} onChange={event => setReplies(current => ({ ...current, [review.name]: event.target.value }))} placeholder="Escribí una respuesta..." />
                <button type="button" disabled={busy || !(replies[review.name] ?? review.reviewReply?.comment ?? "").trim()} onClick={() => perform("reply_review", { reviewName: review.name, comment: replies[review.name] ?? review.reviewReply?.comment }, "La respuesta fue enviada a Google.")}>{pendingAction === "reply_review" ? <FaRotate className="is_spinning" /> : <FaCheck />} {pendingAction === "reply_review" ? "Guardando..." : review.reviewReply ? "Actualizar respuesta" : "Responder reseña"}</button>
            </article>)}
            {!reviews.length && <p className="tags_gbp_growth_notice">Este perfil todavía no tiene reseñas para responder.</p>}
        </div> : <p className="tags_gbp_growth_notice">{friendlySectionError("reviews")}</p>}
    </section>;

    if (section === "posts") return <section className="tags_gbp_growth_grid">
        <article className="tags_gbp_panel">
            <header><div><small>{editingPostName ? "EDICIÓN" : "NOVEDAD"}</small><h2>{editingPostName ? "Modificar publicación" : "Crear una publicación"}</h2><p>{editingPostName ? "Revisá el contenido y guardá los cambios en Google." : "Contá una novedad concreta y agregá un enlace solo si ayuda al cliente."}</p></div></header>
            <div className="tags_gbp_post_form">
                <label>Texto<textarea rows="6" maxLength="1500" value={postSummary} onChange={event => setPostSummary(event.target.value)} placeholder="Ej.: Incorporamos un nuevo servicio..." /></label>
                <label>Enlace opcional<input type="url" value={postUrl} onChange={event => setPostUrl(event.target.value)} placeholder="https://..." /></label>
                <div className="tags_gbp_post_form_actions">
                    {editingPostName && <button type="button" className="is_secondary" disabled={busy} onClick={cancelPostEdit}>Cancelar</button>}
                    <button type="button" disabled={busy || !postSummary.trim()} onClick={async () => {
                        const action = editingPostName ? "update_post" : "create_post";
                        const success = await perform(action, { postName: editingPostName, summary: postSummary, url: postUrl }, editingPostName ? "La publicación fue actualizada en Google." : "La publicación fue enviada a Google.");
                        if (success) cancelPostEdit();
                    }}>{["create_post", "update_post"].includes(pendingAction) ? <FaRotate className="is_spinning" /> : <FaBullhorn />} {["create_post", "update_post"].includes(pendingAction) ? "Guardando..." : editingPostName ? "Guardar cambios" : "Publicar en Google"}</button>
                </div>
            </div>
        </article>
        <article className="tags_gbp_panel">
            <header><div><small>PUBLICACIONES</small><h2>Contenido reciente</h2></div><RefreshButton loading={loading} onClick={loadContent} /></header>
            {content?.posts?.available ? <div className="tags_gbp_post_list">
                {posts.map(post => <article key={post.name}><p>{post.summary || "Publicación sin texto."}</p><div>{post.createTime && <span>{new Date(post.createTime).toLocaleDateString("es-AR")}</span>}<div className="tags_gbp_post_actions"><button type="button" className="is_edit" disabled={busy} onClick={() => editPost(post)}>Editar</button><button type="button" disabled={busy} onClick={() => deletePost(post.name)}>{pendingAction === "delete_post" ? <FaRotate className="is_spinning" /> : <FaTrashCan />} {pendingAction === "delete_post" ? "Eliminando..." : "Eliminar"}</button></div></div></article>)}
                {!posts.length && <p className="tags_gbp_growth_notice">No hay publicaciones recientes para mostrar.</p>}
            </div> : <p className="tags_gbp_growth_notice">{friendlySectionError("posts")}</p>}
        </article>
    </section>;

    if (section === "performance") return <section className="tags_gbp_panel"><header><div><small>ÚLTIMOS {performanceDays} DÍAS</small><h2>Rendimiento del perfil</h2><p>Interacciones registradas directamente por Google.</p></div><div className="tags_gbp_performance_actions"><label>Período<select value={performanceDays} disabled={loading} onChange={event => { const days = Number(event.target.value); setPerformanceDays(days); loadContent(days); }}><option value="7">Últimos 7 días</option><option value="28">Últimos 28 días</option><option value="90">Últimos 90 días</option><option value="180">Últimos 6 meses</option><option value="365">Últimos 12 meses</option></select></label><RefreshButton loading={loading} onClick={loadContent} /></div></header>{content?.performance?.available ? <div className="tags_gbp_metrics">{Object.entries(METRIC_LABELS).map(([key, label]) => <article key={key}><FaArrowTrendUp /><span>{label}</span><strong>{Number(metrics[key] || 0).toLocaleString("es-AR")}</strong></article>)}</div> : <p className="tags_gbp_growth_notice">{friendlySectionError("performance")}</p>}<p className="tags_gbp_growth_footnote">Los datos pueden demorar algunos días en consolidarse y dependen de la información que Google habilita para cada perfil.</p></section>;

    return <section className="tags_gbp_optimization">
        <article className="tags_gbp_panel tags_gbp_optimization_score"><div className="tags_gbp_score_ring" style={{ "--score": recommendations.score }}>{recommendations.score}<small>/100</small></div><div><small>OPORTUNIDADES DE MEJORA</small><h2>{recommendations.score >= 80 ? "El perfil está bien trabajado" : "Hay acciones concretas para mejorar"}</h2><p>Este diagnóstico compara la información local del negocio con el contenido que Google permite consultar.</p></div></article>
        <article className="tags_gbp_panel tags_gbp_detected_information">
            <header><div><small>INFORMACIÓN DETECTADA</small><h2>Qué encontramos en el perfil de Google</h2><p>Google administra la lista general de servicios y las comodidades hoteleras como conjuntos diferentes.</p></div><RefreshButton loading={loading} onClick={loadContent} /></header>
            <div className="tags_gbp_source_status">
                <div><span>Servicios generales en Google</span><strong>{googleServiceItems.length}</strong><small>{googleServiceItems.length ? "Servicios publicados en la lista general del perfil." : googleLocation?.metadata?.canModifyServiceList === false ? "Esta categoría no utiliza la lista general de servicios." : "No hay servicios cargados en la lista general. Esto no incluye comodidades hoteleras."}</small></div>
                <div><span>Servicios en el perfil local</span><strong>{(profile?.services || []).length}</strong><small>Son los ingresados en Categorías y servicios.</small></div>
                <div><span>Atributos generales de Google</span><strong>{content?.attributes?.available ? googleAttributes.length : "—"}</strong><small>{content?.attributes?.available ? "Atributos adicionales devueltos por el Perfil de Empresa." : "Google no permitió consultar los atributos generales."}</small></div>
                {profile?.business_type === "accommodation" && <>
                    <div><span>Datos declarados por el alojamiento</span><strong>{content?.lodging?.available ? merchantLodgingSummary.total : "—"}</strong><small>{content?.lodging?.available ? `${merchantLodgingSummary.active} comodidades activas informadas por el negocio.` : "Google no permitió consultar los datos declarados por el alojamiento."}</small></div>
                    <div><span>Datos propuestos por Google</span><strong>{content?.googleUpdatedLodging?.available ? googleUpdatedLodgingSummary.total : "—"}</strong><small>{content?.googleUpdatedLodging?.available ? `${googleUpdatedLodgingSummary.active} comodidades activas en la versión actualizada por Google.` : "Google no devolvió una versión actualizada del alojamiento."}</small></div>
                </>}
            </div>
            {profile?.business_type === "accommodation" && (content?.lodging?.available || content?.googleUpdatedLodging?.available) && <div className="tags_gbp_lodging_summary">
                <div className="tags_gbp_lodging_summary_head"><strong>{merchantLodgingSummary.total ? "Información hotelera declarada por el alojamiento" : googleUpdatedLodgingSummary.total ? "Información hotelera propuesta por Google" : "Información hotelera administrable"}</strong>{effectiveLodgingSummary.updatedAt && <small>Actualizada en Google: {reviewDate(effectiveLodgingSummary.updatedAt)}</small>}</div>
                {effectiveLodgingSummary.groups.length ? <div className="tags_gbp_lodging_groups">{effectiveLodgingSummary.groups.map(group => <article key={group.key}><strong>{group.label}</strong><span>{group.active} activas · {group.total} datos</span>{group.inactive > 0 && <small>{group.inactive} indicadas como no disponibles</small>}{group.conditional > 0 && <small>{group.conditional} con disponibilidad condicionada</small>}</article>)}</div> : <p className="tags_gbp_growth_notice">Google respondió correctamente, pero devolvió cero datos hoteleros declarados y cero actualizaciones propuestas. Si ves comodidades en la ficha pública, pueden provenir de fuentes externas o plataformas de reservas y no estar disponibles como datos editables del Perfil de Empresa.</p>}
            </div>}
        </article>
        <article className="tags_gbp_panel"><header><div><small>PLAN DE ACCIÓN</small><h2>Qué conviene hacer ahora</h2><p>Empezá por los puntos pendientes. Cada botón te lleva directamente al lugar donde se completa.</p></div></header><div className="tags_gbp_optimization_list">{recommendations.items.map(item => <article key={item.title} className={item.complete ? "is_complete" : "is_pending"}>{item.complete ? <FaCheck /> : <FaWandMagicSparkles />}<div><strong>{item.title}</strong><p>{item.text}</p></div><span>{item.complete ? "Completo" : "Pendiente"}</span>{!item.complete && <button type="button" onClick={() => onNavigate?.(item.section)}>{item.action}</button>}</article>)}</div></article>
        <article className="tags_gbp_panel tags_gbp_growth_tip"><FaLocationArrow /><div><strong>Un perfil útil antes que uno recargado</strong><p>La prioridad es que categoría, ubicación, horarios, contacto, servicios e imágenes sean correctos. Después se trabaja la actividad y el rendimiento.</p></div><div className="tags_gbp_growth_tip_actions"><span><FaPhone /> Contacto claro</span><span><FaImage /> Fotos reales</span><span><FaStar /> Reseñas respondidas</span></div></article>
    </section>;
}
