"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaArrowLeft, FaBriefcase, FaBuilding, FaBullhorn, FaChartLine, FaCheck, FaClock, FaClockRotateLeft, FaComments, FaGoogle, FaImage, FaListCheck, FaLocationDot, FaMagnifyingGlass, FaRotate, FaTriangleExclamation, FaWandMagicSparkles } from "react-icons/fa6";
import BusinessDetailsFields, { EMPTY_BUSINESS_DETAILS } from "@/app/components/businesses/BusinessDetailsFields";
import showAlert from "@/app/components/showAlert";
import { questionsForBusinessType } from "@/app/modules/google-business-profile/lib/googleBusinessConstants";
import GoogleBusinessProfileGrowth from "./GoogleBusinessProfileGrowth";
import "./GoogleBusinessProfileAdmin.css";
import "./GoogleBusinessProfileGoogle.css";
import "./GoogleBusinessProfileSections.css";

const DAYS = [
    ["monday", "Lunes"], ["tuesday", "Martes"], ["wednesday", "Miércoles"],
    ["thursday", "Jueves"], ["friday", "Viernes"], ["saturday", "Sábado"], ["sunday", "Domingo"]
];

function initialPlaceSelection(localityId, places) {
    const result = { primary_place_id: localityId ? String(localityId) : "", region_place_id: "", province_place_id: "", country_place_id: "" };
    let current = places.find(item => Number(item.id) === Number(localityId));
    while (current) {
        if (["region"].includes(current.place_type)) result.region_place_id = String(current.id);
        if (["province", "state"].includes(current.place_type)) result.province_place_id = String(current.id);
        if (current.place_type === "country") result.country_place_id = String(current.id);
        current = places.find(item => Number(item.id) === Number(current.parent_id));
    }
    return result;
}

async function readPayload(response) {
    const text = await response.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch { return {}; }
}

function statusLabel(value) {
    const labels = { not_connected: "Google no conectado", connected: "Google conectado", profile_in_progress: "Perfil en preparación", profile_complete: "Perfil completo", verified: "Verificado", published: "Publicado", not_started: "Sin iniciar" };
    return labels[value] || value || "Sin iniciar";
}

function accountRoleLabel(value) {
    const labels = { PRIMARY_OWNER: "Propietario principal", OWNER: "Propietario", MANAGER: "Administrador", SITE_MANAGER: "Administrador del perfil", ORGANIZATION: "Organización", PERSONAL: "Cuenta personal" };
    return labels[value] || "Cuenta habilitada";
}

function verificationMethodLabel(value) {
    const labels = { EMAIL: "Correo electrónico", SMS: "Mensaje de texto", PHONE_CALL: "Llamada telefónica", ADDRESS: "Correo postal", VIDEO_RECORDING: "Video grabado", VIDEO_CALL: "Videollamada", VETTED_PARTNER: "Proveedor autorizado", AUTO: "Verificación automática" };
    return labels[value] || "Método indicado por Google";
}

const SYNC_FIELD_LABELS = {
    title: "Nombre comercial",
    phoneNumbers: "Teléfono",
    websiteUri: "Sitio web",
    profile: "Descripción",
    categories: "Categorías",
    storefrontAddress: "Dirección",
    latlng: "Coordenadas",
    regularHours: "Horarios",
    specialHours: "Horarios especiales"
};

function syncFieldValue(field, source = {}) {
    const value = source?.[field];
    if (value == null) return "Sin informar";
    if (field === "phoneNumbers") return value.primaryPhone || "Sin informar";
    if (field === "profile") return value.description || "Sin informar";
    if (field === "categories") {
        const primary = value.primaryCategory?.displayName || value.primaryCategory?.name;
        const secondary = (value.additionalCategories || []).map(item => item.displayName || item.name).filter(Boolean);
        return [primary, ...secondary].filter(Boolean).join(" · ") || "Sin informar";
    }
    if (field === "storefrontAddress") return [value.addressLines?.join(" "), value.locality, value.administrativeArea, value.postalCode].filter(Boolean).join(", ") || "Sin informar";
    if (field === "latlng") return Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude)) ? `${Number(value.latitude).toFixed(6)}, ${Number(value.longitude).toFixed(6)}` : "Sin informar";
    if (field === "regularHours") return (value.periods || []).map(period => `${period.openDay}: ${String(period.openTime?.hours ?? "").padStart(2, "0")}:${String(period.openTime?.minutes ?? 0).padStart(2, "0")}–${String(period.closeTime?.hours ?? "").padStart(2, "0")}:${String(period.closeTime?.minutes ?? 0).padStart(2, "0")}`).join(" · ") || "Sin informar";
    if (field === "specialHours") return (value.specialHourPeriods || []).map(period => { const date = `${String(period.startDate?.day || "").padStart(2, "0")}/${String(period.startDate?.month || "").padStart(2, "0")}/${period.startDate?.year || ""}`; return period.closed ? `${date}: cerrado` : `${date}: horario especial`; }).join(" · ") || "Sin informar";
    return String(value || "Sin informar");
}

function comparableSyncValue(field, source = {}) {
    if (field === "categories") return [source?.categories?.primaryCategory?.name, ...(source?.categories?.additionalCategories || []).map(item => item.name)].filter(Boolean).sort().join("|");
    return syncFieldValue(field, source).trim().toLowerCase();
}

const HISTORY_ACTIONS = {
    oauth_connect: "Conexión con Google",
    disconnect: "Desconexión de Google",
    list_accounts: "Consulta de cuentas empresariales",
    list_locations: "Consulta de perfiles administrados",
    select_account: "Selección de cuenta empresarial",
    select_location: "Selección del perfil del negocio",
    search_matches: "Búsqueda de perfiles existentes",
    create_location: "Creación de perfil en Google",
    verification_status: "Consulta del estado de verificación",
    start_verification: "Inicio de la verificación",
    complete_verification: "Confirmación de la verificación",
    sync_profile: "Actualización de datos en Google",
    reply_review: "Respuesta a una reseña",
    create_post: "Nueva publicación en Google",
    delete_post: "Eliminación de una publicación",
    add_media: "Nueva imagen en Google",
    manage_content: "Administración del contenido"
};

function historyAction(value) {
    return HISTORY_ACTIONS[value] || "Actualización del perfil";
}

function historyDirection(value, localProfileLabel) {
    if (value === "tags_to_google") return `${localProfileLabel} → Perfil en Google`;
    if (value === "google_to_tags") return `Perfil en Google → ${localProfileLabel}`;
    return "Operación interna";
}

function historyStatus(value) {
    if (value === "success") return "Completado";
    if (value === "error") return "No completado";
    return value === "pending" ? "Pendiente" : "Registrado";
}

function historyDetail(item) {
    if (item.status !== "error") return "La operación se realizó correctamente.";
    const message = String(item.error_message || "").toLowerCase();
    if (message.includes("insufficient authentication scopes")) return "Google no otorgó todos los permisos necesarios. Es necesario volver a conectar la cuenta.";
    if (message.includes("unauthorized") || message.includes("invalid_grant")) return "La autorización de Google venció o fue revocada. Volvé a conectar la cuenta.";
    if (message.includes("quota")) return "Google alcanzó temporalmente el límite de consultas. Intentá nuevamente más tarde.";
    if (message.includes("not found")) return "Google no encontró el perfil o el contenido solicitado.";
    return "Google no pudo completar la operación. Revisá la conexión y los datos antes de volver a intentar.";
}

export default function GoogleBusinessProfileAdmin({ businessId }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState("summary");
    const [profileSection, setProfileSection] = useState("basic");
    const [data, setData] = useState(null);
    const [connection, setConnection] = useState(null);
    const [configured, setConfigured] = useState(false);
    const [logs, setLogs] = useState([]);
    const [details, setDetails] = useState(EMPTY_BUSINESS_DETAILS);
    const [profile, setProfile] = useState({});
    const [answers, setAnswers] = useState({});
    const [serviceText, setServiceText] = useState("");
    const [categoryQuery, setCategoryQuery] = useState("");
    const [categories, setCategories] = useState([]);
    const [matches, setMatches] = useState([]);
    const [matchesSearched, setMatchesSearched] = useState(false);
    const [verification, setVerification] = useState(null);
    const [verificationEmail, setVerificationEmail] = useState("");
    const [verificationPin, setVerificationPin] = useState("");
    const [syncPreview, setSyncPreview] = useState(null);
    const [syncFields, setSyncFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    async function loadAll() {
        setLoading(true);
        try {
            const [profileResponse, connectionResponse, logsResponse] = await Promise.all([
                fetch(`/api/google-business-profile/admin/profile?businessId=${businessId}`, { cache: "no-store" }),
                fetch(`/api/google-business-profile/admin/connection?businessId=${businessId}`, { cache: "no-store" }),
                fetch(`/api/google-business-profile/admin/logs?businessId=${businessId}`, { cache: "no-store" })
            ]);
            const [profilePayload, connectionPayload, logsPayload] = await Promise.all([readPayload(profileResponse), readPayload(connectionResponse), readPayload(logsResponse)]);
            if (!profileResponse.ok) throw new Error(profilePayload.error || "No se pudo cargar el perfil");
            const business = profilePayload.business || {};
            const places = profilePayload.places || [];
            const primaryPlace = (profilePayload.selectedPlaces || []).find(item => item.relation_type === "location" && Number(item.is_primary)) || (profilePayload.selectedPlaces || [])[0];
            setData(profilePayload);
            setDetails({ ...EMPTY_BUSINESS_DETAILS, ...business, ...initialPlaceSelection(primaryPlace?.place_id, places) });
            setProfile(profilePayload.profile || {});
            setAnswers(profilePayload.answers || {});
            setServiceText((profilePayload.profile?.services || []).join("\n"));
            setConnection(connectionPayload.connection || null);
            setConfigured(Boolean(connectionPayload.configured));
            setLogs(logsPayload.logs || []);
        } catch (error) {
            await showAlert({ title: "No se pudo cargar", text: error.message, icon: "error" });
        } finally { setLoading(false); }
    }

    useEffect(() => { loadAll(); }, [businessId]);
    useEffect(() => {
        const google = searchParams.get("google");
        if (!google) return;
        setActiveTab("google");
        if (google === "connected") showAlert({ title: "Google conectado", text: "Ahora seleccioná la cuenta y el perfil que querés administrar.", icon: "success" });
        else if (google !== "cancelled") showAlert({ title: "No se pudo conectar Google", text: google === "configuration_error" ? "Revisá las variables de entorno del módulo." : "Revisá la autorización e intentá nuevamente.", icon: "error" });
    }, [searchParams]);

    const questions = useMemo(() => questionsForBusinessType(profile.business_type).map(question => ({ ...question, value: answers[question.code] ?? "" })), [profile.business_type, answers]);

    async function saveProfile(event) {
        event.preventDefault();
        if (!profile.business_type) return showAlert({ title: "Falta el tipo de negocio", text: "Seleccioná la actividad que mejor representa al negocio.", icon: "warning" });
        setBusy(true);
        try {
            const sharedResponse = await fetch("/api/business/profile", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId, displayName: details.display_name, email: details.email, phone: details.phone, description: details.description, logoUrl: details.logo_url, coverUrl: details.cover_url, whatsapp: details.whatsapp, address: details.address, postalCode: details.postal_code, latitude: details.latitude, longitude: details.longitude, primaryPlaceId: details.primary_place_id, websiteUrl: details.website_url, instagramUrl: details.instagram_url, facebookUrl: details.facebook_url })
            });
            const sharedPayload = await readPayload(sharedResponse);
            if (!sharedResponse.ok) throw new Error(sharedPayload.error || "No se pudieron guardar los datos comunes");
            const moduleResponse = await fetch("/api/google-business-profile/admin/profile", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId, ...profile, services: serviceText.split(/\r?\n/).map(item => item.trim()).filter(Boolean), answers })
            });
            const modulePayload = await readPayload(moduleResponse);
            if (!moduleResponse.ok) throw new Error(modulePayload.error || "No se pudo guardar el perfil de Google");
            await loadAll();
            await showAlert({ title: "Perfil actualizado", text: "Los datos comunes quedaron actualizados para toda la plataforma.", icon: "success", timer: 1800 });
        } catch (error) {
            await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" });
        } finally { setBusy(false); }
    }

    async function searchCategories() {
        if (categoryQuery.trim().length < 2) return;
        setBusy(true);
        try {
            const response = await fetch(`/api/google-business-profile/admin/categories?businessId=${businessId}&q=${encodeURIComponent(categoryQuery.trim())}`, { cache: "no-store" });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "No se pudieron buscar categorías");
            setCategories(payload.categories || []);
        } catch (error) { await showAlert({ title: "Búsqueda no disponible", text: error.message, icon: "info" }); }
        finally { setBusy(false); }
    }

    async function updateConnection(action, value) {
        setBusy(true);
        try {
            const response = await fetch("/api/google-business-profile/admin/connection", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, action, ...(action === "select_account" ? { accountName: value } : { locationName: value }) }) });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "No se pudo actualizar la conexión");
            setConnection(payload.connection);
        } catch (error) { await showAlert({ title: "No se pudo actualizar", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    async function disconnect() {
        const accepted = await showAlert({ title: "¿Desconectar Google?", text: "La herramienta dejará de consultar y sincronizar este perfil. No se elimina el negocio de Google.", icon: "warning", showCancelButton: true, confirmButtonText: "Desconectar", cancelButtonText: "Cancelar" });
        if (!accepted) return;
        const response = await fetch("/api/google-business-profile/admin/connection", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId }) });
        if (response.ok) { setConnection(null); await loadAll(); }
    }

    async function searchMatches() {
        setBusy(true);
        try {
            const response = await fetch(`/api/google-business-profile/admin/matches?businessId=${businessId}`, { cache: "no-store" });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "No se pudo buscar el negocio");
            setMatches(payload.matches || []); setMatchesSearched(true);
        } catch (error) { await showAlert({ title: "No se pudo buscar", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    async function createLocation(location = null) {
        const accepted = await showAlert({ title: "¿Crear un nuevo perfil en Google?", text: "Confirmá solamente si ningún resultado corresponde al negocio. Crear duplicados puede perjudicar su presencia en Google.", icon: "warning", showCancelButton: true, confirmButtonText: "Validar y crear", cancelButtonText: "Cancelar" });
        if (!accepted) return;
        setBusy(true);
        try {
            const response = await fetch("/api/google-business-profile/admin/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, location }) });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "Google no pudo crear el perfil");
            await loadAll(); setMatches([]); setMatchesSearched(false);
            await showAlert({ title: "Perfil creado", text: "Google recibió el perfil. Ahora revisá las opciones de verificación disponibles.", icon: "success" });
        } catch (error) { await showAlert({ title: "No se pudo crear", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    async function checkVerification() {
        setBusy(true);
        try {
            const response = await fetch(`/api/google-business-profile/admin/verification?businessId=${businessId}`, { cache: "no-store" });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "No se pudo consultar la verificación");
            setVerification(payload);
        } catch (error) { await showAlert({ title: "Verificación no disponible", text: error.message, icon: "info" }); }
        finally { setBusy(false); }
    }

    async function prepareGoogleSync() {
        setBusy(true);
        try {
            const previewResponse = await fetch(`/api/google-business-profile/admin/sync?businessId=${businessId}`, { cache: "no-store" });
            const previewPayload = await readPayload(previewResponse);
            if (!previewResponse.ok) throw new Error(previewPayload.error || "No se pudo preparar la sincronización");
            setSyncPreview(previewPayload);
            setSyncFields((previewPayload.fields || []).filter(field => comparableSyncValue(field, previewPayload.current) !== comparableSyncValue(field, previewPayload.preview)));
        } catch (error) { await showAlert({ title: "No se pudo comparar", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    async function syncGoogle() {
        if (!syncFields.length) return showAlert({ title: "No seleccionaste cambios", text: `Marcá al menos un dato del ${localProfileReference} para enviarlo a Google.`, icon: "info" });
        const accepted = await showAlert({ title: "¿Enviar los datos seleccionados?", text: "Google puede revisar cambios sensibles y, en algunos casos, pedir una nueva verificación.", icon: "warning", showCancelButton: true, confirmButtonText: "Sincronizar", cancelButtonText: "Cancelar" });
        if (!accepted) return;
        setBusy(true);
        try {
            const response = await fetch("/api/google-business-profile/admin/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, fields: syncFields }) });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "Google no aceptó la actualización");
            setSyncPreview(null); setSyncFields([]);
            await loadAll();
            await showAlert({ title: "Sincronización completada", text: `Google recibió la información seleccionada desde el ${localProfileReference}.`, icon: "success" });
        } catch (error) { await showAlert({ title: "No se pudo sincronizar", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    async function startVerification(option) {
        const method = option.verificationMethod;
        const emailAddress = verificationEmail || (option.emailData?.user && option.emailData?.domain ? `${option.emailData.user}@${option.emailData.domain}` : "");
        const accepted = await showAlert({ title: "¿Iniciar esta verificación?", text: `Método: ${verificationMethodLabel(method)}. Google enviará las instrucciones al destino indicado y controlará el proceso.`, icon: "warning", showCancelButton: true, confirmButtonText: "Iniciar", cancelButtonText: "Cancelar" });
        if (!accepted) return;
        setBusy(true);
        try {
            const response = await fetch("/api/google-business-profile/admin/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, method, emailAddress, phoneNumber: option.phoneNumber, mailerContact: data?.business?.display_name || data?.business?.name, option }) });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "Google no pudo iniciar la verificación");
            await checkVerification();
            await showAlert({ title: "Verificación iniciada", text: payload.verification?.state === "COMPLETED" ? "Google verificó el negocio automáticamente." : "Seguí las instrucciones del método elegido.", icon: "success" });
        } catch (error) { await showAlert({ title: "No se pudo iniciar", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    async function completeVerification() {
        if (!verificationPin.trim()) return;
        setBusy(true);
        try {
            const response = await fetch("/api/google-business-profile/admin/verification", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, pin: verificationPin.trim() }) });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "Google no aceptó el código");
            setVerificationPin(""); await checkVerification();
            await showAlert({ title: payload.verification?.state === "COMPLETED" ? "Negocio verificado" : "Código enviado", icon: "success" });
        } catch (error) { await showAlert({ title: "No se pudo completar", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    if (loading) return <main className="tags_gbp_admin"><section className="tags_gbp_loading">Cargando perfiles del negocio...</section></main>;
    const score = Number(data?.profile?.completion_score || 0);
    const directoryName = String(data?.directory?.name || "").trim();
    const localProfileLabel = directoryName || "Perfil local";
    const localProfileReference = directoryName ? `perfil en ${directoryName}` : "perfil local";
    return <main className="tags_gbp_admin">
        <header className="tags_gbp_hero">
            <div className="tags_gbp_identity"><span><FaLocationDot /></span><div><small>HERRAMIENTA CONTRATADA</small><h1>Perfil de Negocio en Google</h1><p>Centro de presencia digital de {data?.business?.display_name || data?.business?.name}.</p></div></div>
            <button type="button" onClick={() => router.push(`/dashboard/businesses/${businessId}`)}><FaArrowLeft /> Volver al Panel</button>
        </header>
        <nav className="tags_gbp_tabs">
            <button className={activeTab === "summary" ? "active" : ""} onClick={() => setActiveTab("summary")}><FaListCheck /> Resumen</button>
            <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}><FaBuilding /> Perfil del negocio</button>
            <button className={activeTab === "google" ? "active" : ""} onClick={() => setActiveTab("google")}><FaGoogle /> Conectar Google</button>
            <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}><FaClockRotateLeft /> Historial</button>
        </nav>

        {activeTab === "summary" && <section className="tags_gbp_summary">
            <article className="tags_gbp_score"><div className="tags_gbp_score_ring" style={{ "--score": score }}>{score}<small>/100</small></div><div><small>PRESENCIA DIGITAL</small><h2>{score >= 80 ? "Perfil bien encaminado" : "Todavía hay datos para completar"}</h2><p>El puntaje evalúa identidad, contacto, ubicación, horarios, categoría, servicios, imágenes y presencia web.</p></div></article>
            <div className="tags_gbp_kpis"><article><FaBuilding /><span>{localProfileLabel}</span><strong>{statusLabel(data?.profile?.profile_status)}</strong></article><article><FaGoogle /><span>Conexión Google</span><strong>{statusLabel(connection?.connection_status || "not_connected")}</strong></article><article><FaLocationDot /><span>Perfil seleccionado</span><strong>{connection?.google_location_label || "Pendiente"}</strong></article></div>
            <article className="tags_gbp_panel"><header><div><small>PRÓXIMAS ACCIONES</small><h2>Recomendaciones</h2></div></header><div className="tags_gbp_recommendations">{(data?.recommendations || []).map(item => <div key={item.title} className={`priority_${item.priority}`}><FaTriangleExclamation /><div><strong>{item.title}</strong><p>{item.description}</p></div></div>)}{!(data?.recommendations || []).length && <div className="is_complete"><FaCheck /><div><strong>Perfil completo</strong><p>La información central está lista para revisar la conexión con Google.</p></div></div>}</div></article>
        </section>}

        {activeTab === "profile" && <form className="tags_gbp_profile" onSubmit={saveProfile}>
            <nav className="tags_gbp_profile_tabs" aria-label="Secciones del perfil empresarial">
                <button type="button" className={profileSection === "basic" ? "active" : ""} onClick={() => setProfileSection("basic")}><FaBuilding /><span>Información básica</span></button>
                <button type="button" className={profileSection === "hours" ? "active" : ""} onClick={() => setProfileSection("hours")}><FaClock /><span>Ubicación y horarios</span></button>
                <button type="button" className={profileSection === "services" ? "active" : ""} onClick={() => setProfileSection("services")}><FaBriefcase /><span>Categorías y servicios</span></button>
                <button type="button" className={profileSection === "media" ? "active" : ""} onClick={() => setProfileSection("media")}><FaImage /><span>Imágenes</span></button>
                <button type="button" className={profileSection === "reviews" ? "active" : ""} onClick={() => setProfileSection("reviews")}><FaComments /><span>Reseñas</span></button>
                <button type="button" className={profileSection === "posts" ? "active" : ""} onClick={() => setProfileSection("posts")}><FaBullhorn /><span>Publicaciones</span></button>
                <button type="button" className={profileSection === "performance" ? "active" : ""} onClick={() => setProfileSection("performance")}><FaChartLine /><span>Rendimiento</span></button>
                <button type="button" className={profileSection === "optimization" ? "active" : ""} onClick={() => setProfileSection("optimization")}><FaWandMagicSparkles /><span>Optimización</span></button>
            </nav>
            <section className={`tags_gbp_panel ${profileSection === "basic" ? "" : "tags_gbp_section_hidden"}`}><header><div><small>PASO 1</small><h2>¿Qué tipo de negocio tenés?</h2><p>Esto adapta las preguntas y recomendaciones del módulo.</p></div></header><div className="tags_gbp_type_grid">{(data?.businessTypes || []).map(type => <button type="button" key={type.id} className={profile.business_type === type.id ? "selected" : ""} onClick={() => { setProfile(current => ({ ...current, business_type: type.id })); setAnswers({}); }}><strong>{type.label}</strong><span>{type.description}</span></button>)}</div></section>
            <section className={`tags_gbp_panel ${profileSection === "basic" ? "" : "tags_gbp_section_hidden"}`}><header><div><small>PASO 2</small><h2>Datos centrales del negocio</h2><p>Estos datos son la fuente principal del {localProfileReference}.</p></div></header><div className="tags_gbp_form_grid"><label>Email<input type="email" required={profileSection === "basic"} value={details.email || ""} onChange={event => setDetails(current => ({ ...current, email: event.target.value }))} /></label><label>Teléfono<input value={details.phone || ""} onChange={event => setDetails(current => ({ ...current, phone: event.target.value }))} /></label><BusinessDetailsFields values={details} onChange={setDetails} businessId={businessId} places={data?.places || []} /></div></section>
            <section className={`tags_gbp_panel ${profileSection === "hours" ? "" : "tags_gbp_section_hidden"}`}><header><div><small>PASO 3</small><h2>Ubicación y atención</h2></div></header><div className="tags_gbp_form_grid"><label className="tags_gbp_check"><input type="checkbox" checked={Boolean(Number(profile.has_physical_location))} onChange={event => setProfile(current => ({ ...current, has_physical_location: event.target.checked ? 1 : 0 }))} /> Atiende en una ubicación física</label><label className="tags_gbp_check"><input type="checkbox" checked={Boolean(Number(profile.is_service_area_business))} onChange={event => setProfile(current => ({ ...current, is_service_area_business: event.target.checked ? 1 : 0 }))} /> Atiende en zonas o domicilios del cliente</label><label className="is_wide">Zonas de servicio<textarea value={(profile.service_areas || []).join("\n")} onChange={event => setProfile(current => ({ ...current, service_areas: event.target.value.split(/\r?\n/).filter(Boolean) }))} placeholder="Una localidad o zona por línea" /></label></div><div className="tags_gbp_hours">{DAYS.map(([key, label]) => { const day = profile.regular_hours?.[key] || {}; return <div key={key}><strong>{label}</strong><label><input type="checkbox" checked={!day.closed} onChange={event => setProfile(current => ({ ...current, regular_hours: { ...(current.regular_hours || {}), [key]: { ...day, closed: !event.target.checked } } }))} /> Abierto</label><input type="time" disabled={day.closed} value={day.open || "09:00"} onChange={event => setProfile(current => ({ ...current, regular_hours: { ...(current.regular_hours || {}), [key]: { ...day, open: event.target.value } } }))} /><input type="time" disabled={day.closed} value={day.close || "18:00"} onChange={event => setProfile(current => ({ ...current, regular_hours: { ...(current.regular_hours || {}), [key]: { ...day, close: event.target.value } } }))} /></div>})}</div></section>
            <section className={`tags_gbp_panel ${profileSection === "hours" ? "" : "tags_gbp_section_hidden"}`}>
                <header><div><small>FECHAS ESPECIALES</small><h2>Feriados y horarios excepcionales</h2><p>Informá solamente los días que funcionan distinto del horario habitual.</p></div><button type="button" className="tags_gbp_inline_action" onClick={() => setProfile(current => ({ ...current, special_hours: [...(current.special_hours || []), { date: "", closed: true, open: "09:00", close: "18:00" }] }))}>Agregar fecha</button></header>
                <div className="tags_gbp_special_hours">{(profile.special_hours || []).map((item, index) => <article key={`${item.date}-${index}`}><label>Fecha<input type="date" value={item.date || ""} onChange={event => setProfile(current => ({ ...current, special_hours: current.special_hours.map((entry, position) => position === index ? { ...entry, date: event.target.value } : entry) }))} /></label><label className="tags_gbp_check"><input type="checkbox" checked={Boolean(item.closed)} onChange={event => setProfile(current => ({ ...current, special_hours: current.special_hours.map((entry, position) => position === index ? { ...entry, closed: event.target.checked } : entry) }))} /> Cerrado todo el día</label><label>Desde<input type="time" disabled={item.closed} value={item.open || "09:00"} onChange={event => setProfile(current => ({ ...current, special_hours: current.special_hours.map((entry, position) => position === index ? { ...entry, open: event.target.value } : entry) }))} /></label><label>Hasta<input type="time" disabled={item.closed} value={item.close || "18:00"} onChange={event => setProfile(current => ({ ...current, special_hours: current.special_hours.map((entry, position) => position === index ? { ...entry, close: event.target.value } : entry) }))} /></label><button type="button" onClick={() => setProfile(current => ({ ...current, special_hours: current.special_hours.filter((_, position) => position !== index) }))}>Quitar</button></article>)}{!(profile.special_hours || []).length && <p className="tags_gbp_notice">No hay fechas especiales cargadas. El horario habitual se aplicará todos los días.</p>}</div>
            </section>
            <section className={`tags_gbp_panel ${profileSection === "services" ? "" : "tags_gbp_section_hidden"}`}><header><div><small>PASO 4</small><h2>Categoría oficial de Google</h2><p>No se inventan categorías: se seleccionan desde Google cuando la cuenta está conectada.</p></div></header>{connection ? <><div className="tags_gbp_category_search"><input value={categoryQuery} onChange={event => setCategoryQuery(event.target.value)} placeholder="Ej.: hotel, restaurante, electricista" /><button type="button" onClick={searchCategories} disabled={busy}><FaMagnifyingGlass /> Buscar</button></div><div className="tags_gbp_category_results">{categories.map(category => <article key={category.name} className={profile.primary_category_id === category.name ? "selected" : ""}><div><strong>{category.displayName}</strong><small>Categoría oficial de Google</small></div><div><button type="button" onClick={() => setProfile(current => ({ ...current, primary_category_id: category.name, primary_category_name: category.displayName, secondary_categories: (current.secondary_categories || []).filter(item => (typeof item === "string" ? item : item.name) !== category.name) }))}>Usar como principal</button><button type="button" disabled={profile.primary_category_id === category.name || (profile.secondary_categories || []).length >= 9 || (profile.secondary_categories || []).some(item => (typeof item === "string" ? item : item.name) === category.name)} onClick={() => setProfile(current => ({ ...current, secondary_categories: [...(current.secondary_categories || []), { name: category.name, displayName: category.displayName }].slice(0, 9) }))}>Agregar como secundaria</button></div></article>)}</div>{profile.primary_category_name && <p className="tags_gbp_selected">Categoría principal: <strong>{profile.primary_category_name}</strong></p>}{(profile.secondary_categories || []).length > 0 && <div className="tags_gbp_secondary_categories"><strong>Categorías secundarias</strong><div>{profile.secondary_categories.map(item => { const value = typeof item === "string" ? { name: item, displayName: item } : item; return <button type="button" key={value.name} onClick={() => setProfile(current => ({ ...current, secondary_categories: (current.secondary_categories || []).filter(category => (typeof category === "string" ? category : category.name) !== value.name) }))}>{value.displayName || value.name} ×</button>; })}</div></div>}</> : <p className="tags_gbp_notice">Conectá Google para consultar categorías oficiales disponibles en Argentina.</p>}</section>
            <section className={`tags_gbp_panel ${profileSection === "services" ? "" : "tags_gbp_section_hidden"}`}><header><div><small>PASO 5</small><h2>Servicios e información específica</h2></div></header><div className="tags_gbp_form_grid"><label className="is_wide">Servicios principales<textarea rows="5" value={serviceText} onChange={event => setServiceText(event.target.value)} placeholder="Un servicio por línea" /></label>{questions.map(question => <label className={question.type === "textarea" ? "is_wide" : ""} key={question.code}>{question.label}{question.type === "textarea" ? <textarea value={answers[question.code] ?? ""} onChange={event => setAnswers(current => ({ ...current, [question.code]: event.target.value }))} /> : <input type={question.type} value={answers[question.code] ?? ""} onChange={event => setAnswers(current => ({ ...current, [question.code]: event.target.value }))} />}{question.help && <small>{question.help}</small>}</label>)}</div></section>
            {["media", "reviews", "posts", "performance", "optimization"].includes(profileSection) && <GoogleBusinessProfileGrowth businessId={businessId} section={profileSection} profile={profile} business={{ ...(data?.business || {}), ...details }} connected={Boolean(connection?.google_location_name)} />}
            {["basic", "hours", "services"].includes(profileSection) && <div className="tags_gbp_savebar"><button type="submit" disabled={busy}>{busy ? "Guardando..." : "Guardar cambios"}</button></div>}
        </form>}

        {activeTab === "google" && <section className="tags_gbp_google">
            <article className="tags_gbp_panel"><header><div><small>CONEXIÓN OFICIAL</small><h2>Google Business Profile</h2><p>La autorización se realiza con la cuenta Google propietaria o administradora del negocio.</p></div></header>{!configured ? <div className="tags_gbp_warning"><FaTriangleExclamation /><div><strong>Integración pendiente de configurar</strong><p>Faltan credenciales del proyecto aprobado de Google Business Profile en el servidor.</p></div></div> : !connection ? <a className="tags_gbp_google_button" href={`/api/google-business-profile/oauth/start?businessId=${businessId}`}><FaGoogle /> Continuar con Google</a> : <div className="tags_gbp_connection"><div><span>Cuenta autorizada</span><strong>{connection.google_user_email || "Cuenta Google"}</strong></div><div><span>Estado</span><strong>{statusLabel(connection.connection_status)}</strong></div><button type="button" onClick={disconnect}>Desconectar</button></div>}</article>
            {connection && <article className="tags_gbp_panel"><header><div><small>PASO 1</small><h2>Seleccioná la cuenta empresarial</h2></div></header><select value={connection.google_account_name || ""} onChange={event => event.target.value && updateConnection("select_account", event.target.value)} disabled={busy}><option value="">Seleccionar cuenta</option>{(connection.accounts || []).map(account => <option key={account.name} value={account.name}>{account.accountName || account.name} · {accountRoleLabel(account.role || account.type)}</option>)}</select></article>}
            {connection?.google_account_name && <article className="tags_gbp_panel"><header><div><small>PASO 2</small><h2>Seleccioná el perfil del negocio</h2><p>La plataforma no crea duplicados: primero se revisan los perfiles que ya administra esta cuenta.</p></div></header><div className="tags_gbp_location_list">{(connection.locations || []).map(location => <button type="button" key={location.name} className={connection.google_location_name === location.name ? "selected" : ""} onClick={() => updateConnection("select_location", location.name)}><FaLocationDot /><div><strong>{location.title || location.name}</strong><span>{[location.storefrontAddress?.addressLines?.join(" "), location.storefrontAddress?.locality].filter(Boolean).join(", ") || "Sin dirección informada"}</span></div>{connection.google_location_name === location.name && <FaCheck />}</button>)}{!(connection.locations || []).length && <p className="tags_gbp_notice">Esta cuenta no devolvió perfiles administrables. Usá la búsqueda del paso siguiente para reclamar uno existente o crear uno nuevo.</p>}</div></article>}
            {connection?.google_account_name && !connection?.google_location_name && <article className="tags_gbp_panel"><header><div><small>PASO 3</small><h2>Buscar antes de crear</h2><p>La búsqueda usa nombre, dirección, teléfono y categoría oficial para encontrar posibles coincidencias.</p></div><button type="button" className="tags_gbp_inline_action" onClick={searchMatches} disabled={busy}><FaMagnifyingGlass /> Buscar en Google</button></header>{matchesSearched && <div className="tags_gbp_matches">{matches.map(match => <article key={match.name}><FaLocationDot /><div><strong>{match.location?.title || match.name}</strong><span>{[match.location?.storefrontAddress?.addressLines?.join(" "), match.location?.storefrontAddress?.locality].filter(Boolean).join(", ")}</span></div>{match.requestAdminRightsUri ? <a href={match.requestAdminRightsUri} target="_blank" rel="noreferrer">Solicitar acceso</a> : <button type="button" onClick={() => createLocation(match.location)}>Crear y administrar</button>}</article>)}{!matches.length && <div className="tags_gbp_no_match"><strong>No encontramos coincidencias.</strong><p>Revisá los datos y, si son correctos, podés crear el perfil.</p><button type="button" onClick={() => createLocation()}>Crear nuevo perfil</button></div>}</div>}</article>}
            {connection?.google_location_name && <article className="tags_gbp_panel"><header><div><small>PASO 3</small><h2>Estado y verificación</h2><p>Google determina qué métodos están disponibles para este negocio.</p></div><button type="button" className="tags_gbp_inline_action" onClick={checkVerification} disabled={busy}><FaRotate /> Consultar estado</button></header>{verification && <><div className={verification.verified ? "tags_gbp_verification is_verified" : "tags_gbp_verification"}>{verification.verified ? <><FaCheck /><div><strong>Negocio verificado</strong><p>Google reconoce a esta cuenta como administradora del perfil.</p></div></> : <><FaTriangleExclamation /><div><strong>Verificación pendiente</strong><p>{verification.options?.length ? `Google ofrece ${verification.options.length} opción u opciones de verificación.` : verification.optionsError || "Google puede requerir una acción externa desde su plataforma."}</p></div></>}</div>{!verification.verified && (verification.options || []).length > 0 && <div className="tags_gbp_verification_options">{verification.options.map(option => <div key={`${option.verificationMethod}-${option.phoneNumber || option.emailData?.domain || "option"}`}><div><strong>{verificationMethodLabel(option.verificationMethod)}</strong><span>{option.phoneNumber || (option.emailData ? `${option.emailData.user || ""}@${option.emailData.domain || ""}` : "Método administrado por Google")}</span></div>{option.verificationMethod === "EMAIL" && option.emailData?.isUserNameEditable && <input type="email" value={verificationEmail} onChange={event => setVerificationEmail(event.target.value)} placeholder={`usuario@${option.emailData.domain}`} />}<button type="button" onClick={() => startVerification(option)} disabled={busy}>Elegir método</button></div>)}</div>}{!verification.verified && <div className="tags_gbp_pin"><input value={verificationPin} onChange={event => setVerificationPin(event.target.value)} placeholder="Código de verificación recibido" /><button type="button" onClick={completeVerification} disabled={busy || !verificationPin.trim()}>Verificar código</button></div>}</>}</article>}
            {connection?.google_location_name && <article className="tags_gbp_panel"><header><div><small>SINCRONIZACIÓN MANUAL</small><h2>Comparar perfiles</h2><p>Revisá cada diferencia y elegí exactamente qué datos querés enviar.</p></div><button type="button" className="tags_gbp_inline_action" onClick={prepareGoogleSync} disabled={busy}><FaRotate /> {syncPreview ? "Actualizar comparación" : "Comparar datos"}</button></header><p className="tags_gbp_notice">La comparación es de solo lectura. Google no se modifica hasta que selecciones campos y confirmes la sincronización.</p>{syncPreview && <div className="tags_gbp_sync_compare"><div className="tags_gbp_sync_compare_head"><strong>Dato</strong><strong>Perfil en Google</strong><strong>{localProfileLabel}</strong><strong>Enviar</strong></div>{(syncPreview.fields || []).map(field => { const changed = comparableSyncValue(field, syncPreview.current) !== comparableSyncValue(field, syncPreview.preview); return <label key={field} className={changed ? "is_changed" : "is_equal"}><strong>{SYNC_FIELD_LABELS[field] || field}{!changed && <span><FaCheck /> Sin cambios</span>}</strong><span>{syncFieldValue(field, syncPreview.current)}</span><span>{field === "categories" ? [profile.primary_category_name, ...(profile.secondary_categories || []).map(item => typeof item === "string" ? item : item.displayName || item.name)].filter(Boolean).join(" · ") || syncFieldValue(field, syncPreview.preview) : syncFieldValue(field, syncPreview.preview)}</span><input type="checkbox" checked={syncFields.includes(field)} disabled={!changed || busy} onChange={event => setSyncFields(current => event.target.checked ? [...new Set([...current, field])] : current.filter(item => item !== field))} aria-label={`Enviar ${SYNC_FIELD_LABELS[field] || field} a Google`} /></label>})}<div className="tags_gbp_sync_actions"><button type="button" onClick={() => { setSyncPreview(null); setSyncFields([]); }} disabled={busy}>Cerrar comparación</button><button type="button" onClick={syncGoogle} disabled={busy || !syncFields.length}>Sincronizar {syncFields.length || ""} {syncFields.length === 1 ? "dato" : "datos"}</button></div></div>}</article>}
        </section>}

        {activeTab === "history" && <section className="tags_gbp_panel tags_gbp_history"><header><div><small>ACTIVIDAD DEL PERFIL</small><h2>Historial de cambios y conexiones</h2><p>Acá podés comprobar qué se hizo, desde dónde y si Google aceptó la operación.</p></div><button type="button" onClick={loadAll}><FaRotate /> Actualizar</button></header><div className="tags_gbp_table_wrap"><table><thead><tr><th>Fecha y hora</th><th>Movimiento</th><th>Origen y destino</th><th>Resultado</th><th>Información</th></tr></thead><tbody>{logs.map(item => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString("es-AR")}</td><td><strong>{historyAction(item.action)}</strong></td><td>{historyDirection(item.direction, localProfileLabel)}</td><td><span className={`status_${item.status}`}>{historyStatus(item.status)}</span></td><td>{historyDetail(item)}</td></tr>)}{!logs.length && <tr><td colSpan="5">Todavía no hay movimientos registrados.</td></tr>}</tbody></table></div></section>}
    </main>;
}
