"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaArrowLeft, FaBuilding, FaCheck, FaClockRotateLeft, FaGoogle, FaListCheck, FaLocationDot, FaMagnifyingGlass, FaRotate, FaTriangleExclamation } from "react-icons/fa6";
import BusinessDetailsFields, { EMPTY_BUSINESS_DETAILS } from "@/app/components/businesses/BusinessDetailsFields";
import showAlert from "@/app/components/showAlert";
import { questionsForBusinessType } from "@/app/modules/google-business-profile/lib/googleBusinessConstants";
import "./GoogleBusinessProfileAdmin.css";
import "./GoogleBusinessProfileGoogle.css";

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

export default function GoogleBusinessProfileAdmin({ businessId }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState("summary");
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
        const accepted = await showAlert({ title: "¿Desconectar Google?", text: "Tags dejará de consultar y sincronizar este perfil. No se elimina el negocio de Google.", icon: "warning", showCancelButton: true, confirmButtonText: "Desconectar", cancelButtonText: "Cancelar" });
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

    async function syncGoogle() {
        setBusy(true);
        try {
            const previewResponse = await fetch(`/api/google-business-profile/admin/sync?businessId=${businessId}`, { cache: "no-store" });
            const previewPayload = await readPayload(previewResponse);
            if (!previewResponse.ok) throw new Error(previewPayload.error || "No se pudo preparar la sincronización");
            const preview = previewPayload.preview || {};
            const summary = [
                `Nombre: ${preview.title || "-"}`,
                `Teléfono: ${preview.phoneNumbers?.primaryPhone || "-"}`,
                `Web: ${preview.websiteUri || "-"}`,
                `Dirección: ${preview.storefrontAddress?.addressLines?.join(" ") || "-"}`,
                `Categoría: ${preview.categories?.primaryCategory?.name || "-"}`
            ].join("\n");
            const accepted = await showAlert({ title: "¿Actualizar Google con estos datos?", text: `${summary}\n\nGoogle puede revisar cambios sensibles y, en algunos casos, pedir una nueva verificación.`, icon: "warning", showCancelButton: true, confirmButtonText: "Sincronizar", cancelButtonText: "Cancelar" });
            if (!accepted) return;
            const response = await fetch("/api/google-business-profile/admin/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId }) });
            const payload = await readPayload(response);
            if (!response.ok) throw new Error(payload.error || "Google no aceptó la actualización");
            await loadAll();
            await showAlert({ title: "Sincronización completada", text: "Google recibió la información seleccionada desde Tags.", icon: "success" });
        } catch (error) { await showAlert({ title: "No se pudo sincronizar", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    async function startVerification(option) {
        const method = option.verificationMethod;
        const emailAddress = verificationEmail || (option.emailData?.user && option.emailData?.domain ? `${option.emailData.user}@${option.emailData.domain}` : "");
        const accepted = await showAlert({ title: "¿Iniciar esta verificación?", text: `Método: ${method}. Google enviará las instrucciones al destino indicado y controlará el proceso.`, icon: "warning", showCancelButton: true, confirmButtonText: "Iniciar", cancelButtonText: "Cancelar" });
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

    if (loading) return <main className="tags_gbp_admin"><section className="tags_gbp_loading">Cargando Tags Google Maps Profile...</section></main>;
    const score = Number(data?.profile?.completion_score || 0);
    return <main className="tags_gbp_admin">
        <header className="tags_gbp_hero">
            <div className="tags_gbp_identity"><span><FaLocationDot /></span><div><small>HERRAMIENTA CONTRATADA</small><h1>Tags Google Maps Profile</h1><p>Centro de presencia digital de {data?.business?.display_name || data?.business?.name}.</p></div></div>
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
            <div className="tags_gbp_kpis"><article><FaBuilding /><span>Perfil Tags</span><strong>{statusLabel(data?.profile?.profile_status)}</strong></article><article><FaGoogle /><span>Conexión Google</span><strong>{statusLabel(connection?.connection_status || "not_connected")}</strong></article><article><FaLocationDot /><span>Perfil seleccionado</span><strong>{connection?.google_location_label || "Pendiente"}</strong></article></div>
            <article className="tags_gbp_panel"><header><div><small>PRÓXIMAS ACCIONES</small><h2>Recomendaciones</h2></div></header><div className="tags_gbp_recommendations">{(data?.recommendations || []).map(item => <div key={item.title} className={`priority_${item.priority}`}><FaTriangleExclamation /><div><strong>{item.title}</strong><p>{item.description}</p></div></div>)}{!(data?.recommendations || []).length && <div className="is_complete"><FaCheck /><div><strong>Perfil completo</strong><p>La información central está lista para revisar la conexión con Google.</p></div></div>}</div></article>
        </section>}

        {activeTab === "profile" && <form className="tags_gbp_profile" onSubmit={saveProfile}>
            <section className="tags_gbp_panel"><header><div><small>PASO 1</small><h2>¿Qué tipo de negocio tenés?</h2><p>Esto adapta las preguntas y recomendaciones del módulo.</p></div></header><div className="tags_gbp_type_grid">{(data?.businessTypes || []).map(type => <button type="button" key={type.id} className={profile.business_type === type.id ? "selected" : ""} onClick={() => { setProfile(current => ({ ...current, business_type: type.id })); setAnswers({}); }}><strong>{type.label}</strong><span>{type.description}</span></button>)}</div></section>
            <section className="tags_gbp_panel"><header><div><small>PASO 2</small><h2>Datos centrales del negocio</h2><p>Estos datos son la fuente única que comparten las demás herramientas de Tags.</p></div></header><div className="tags_gbp_form_grid"><label>Email<input type="email" required value={details.email || ""} onChange={event => setDetails(current => ({ ...current, email: event.target.value }))} /></label><label>Teléfono<input value={details.phone || ""} onChange={event => setDetails(current => ({ ...current, phone: event.target.value }))} /></label><BusinessDetailsFields values={details} onChange={setDetails} businessId={businessId} places={data?.places || []} /></div></section>
            <section className="tags_gbp_panel"><header><div><small>PASO 3</small><h2>Ubicación y atención</h2></div></header><div className="tags_gbp_form_grid"><label className="tags_gbp_check"><input type="checkbox" checked={Boolean(Number(profile.has_physical_location))} onChange={event => setProfile(current => ({ ...current, has_physical_location: event.target.checked ? 1 : 0 }))} /> Atiende en una ubicación física</label><label className="tags_gbp_check"><input type="checkbox" checked={Boolean(Number(profile.is_service_area_business))} onChange={event => setProfile(current => ({ ...current, is_service_area_business: event.target.checked ? 1 : 0 }))} /> Atiende en zonas o domicilios del cliente</label><label className="is_wide">Zonas de servicio<textarea value={(profile.service_areas || []).join("\n")} onChange={event => setProfile(current => ({ ...current, service_areas: event.target.value.split(/\r?\n/).filter(Boolean) }))} placeholder="Una localidad o zona por línea" /></label></div><div className="tags_gbp_hours">{DAYS.map(([key, label]) => { const day = profile.regular_hours?.[key] || {}; return <div key={key}><strong>{label}</strong><label><input type="checkbox" checked={!day.closed} onChange={event => setProfile(current => ({ ...current, regular_hours: { ...(current.regular_hours || {}), [key]: { ...day, closed: !event.target.checked } } }))} /> Abierto</label><input type="time" disabled={day.closed} value={day.open || "09:00"} onChange={event => setProfile(current => ({ ...current, regular_hours: { ...(current.regular_hours || {}), [key]: { ...day, open: event.target.value } } }))} /><input type="time" disabled={day.closed} value={day.close || "18:00"} onChange={event => setProfile(current => ({ ...current, regular_hours: { ...(current.regular_hours || {}), [key]: { ...day, close: event.target.value } } }))} /></div>})}</div></section>
            <section className="tags_gbp_panel"><header><div><small>PASO 4</small><h2>Categoría oficial de Google</h2><p>No se inventan categorías: se seleccionan desde Google cuando la cuenta está conectada.</p></div></header>{connection ? <><div className="tags_gbp_category_search"><input value={categoryQuery} onChange={event => setCategoryQuery(event.target.value)} placeholder="Ej.: hotel, restaurante, electricista" /><button type="button" onClick={searchCategories} disabled={busy}><FaMagnifyingGlass /> Buscar</button></div><div className="tags_gbp_category_results">{categories.map(category => <button type="button" key={category.name} className={profile.primary_category_id === category.name ? "selected" : ""} onClick={() => setProfile(current => ({ ...current, primary_category_id: category.name, primary_category_name: category.displayName }))}><strong>{category.displayName}</strong><small>{category.name}</small></button>)}</div>{profile.primary_category_name && <p className="tags_gbp_selected">Categoría seleccionada: <strong>{profile.primary_category_name}</strong></p>}</> : <p className="tags_gbp_notice">Conectá Google para consultar categorías oficiales disponibles en Argentina.</p>}</section>
            <section className="tags_gbp_panel"><header><div><small>PASO 5</small><h2>Servicios e información específica</h2></div></header><div className="tags_gbp_form_grid"><label className="is_wide">Servicios principales<textarea rows="5" value={serviceText} onChange={event => setServiceText(event.target.value)} placeholder="Un servicio por línea" /></label>{questions.map(question => <label className={question.type === "textarea" ? "is_wide" : ""} key={question.code}>{question.label}{question.type === "textarea" ? <textarea value={answers[question.code] ?? ""} onChange={event => setAnswers(current => ({ ...current, [question.code]: event.target.value }))} /> : <input type={question.type} value={answers[question.code] ?? ""} onChange={event => setAnswers(current => ({ ...current, [question.code]: event.target.value }))} />}{question.help && <small>{question.help}</small>}</label>)}</div></section>
            <div className="tags_gbp_savebar"><button type="submit" disabled={busy}>{busy ? "Guardando..." : "Guardar perfil empresarial"}</button></div>
        </form>}

        {activeTab === "google" && <section className="tags_gbp_google">
            <article className="tags_gbp_panel"><header><div><small>CONEXIÓN OFICIAL</small><h2>Google Business Profile</h2><p>La autorización se realiza con la cuenta Google propietaria o administradora del negocio.</p></div></header>{!configured ? <div className="tags_gbp_warning"><FaTriangleExclamation /><div><strong>Integración pendiente de configurar</strong><p>Faltan credenciales del proyecto aprobado de Google Business Profile en el servidor.</p></div></div> : !connection ? <a className="tags_gbp_google_button" href={`/api/google-business-profile/oauth/start?businessId=${businessId}`}><FaGoogle /> Continuar con Google</a> : <div className="tags_gbp_connection"><div><span>Cuenta autorizada</span><strong>{connection.google_user_email || "Cuenta Google"}</strong></div><div><span>Estado</span><strong>{statusLabel(connection.connection_status)}</strong></div><button type="button" onClick={disconnect}>Desconectar</button></div>}</article>
            {connection && <article className="tags_gbp_panel"><header><div><small>PASO 1</small><h2>Seleccioná la cuenta empresarial</h2></div></header><select value={connection.google_account_name || ""} onChange={event => event.target.value && updateConnection("select_account", event.target.value)} disabled={busy}><option value="">Seleccionar cuenta</option>{(connection.accounts || []).map(account => <option key={account.name} value={account.name}>{account.accountName || account.name} · {account.role || account.type}</option>)}</select></article>}
            {connection?.google_account_name && <article className="tags_gbp_panel"><header><div><small>PASO 2</small><h2>Seleccioná el perfil del negocio</h2><p>Tags no crea duplicados: primero se revisan los perfiles que ya administra esta cuenta.</p></div></header><div className="tags_gbp_location_list">{(connection.locations || []).map(location => <button type="button" key={location.name} className={connection.google_location_name === location.name ? "selected" : ""} onClick={() => updateConnection("select_location", location.name)}><FaLocationDot /><div><strong>{location.title || location.name}</strong><span>{[location.storefrontAddress?.addressLines?.join(" "), location.storefrontAddress?.locality].filter(Boolean).join(", ") || "Sin dirección informada"}</span></div>{connection.google_location_name === location.name && <FaCheck />}</button>)}{!(connection.locations || []).length && <p className="tags_gbp_notice">Esta cuenta no devolvió perfiles administrables. Usá la búsqueda del paso siguiente para reclamar uno existente o crear uno nuevo.</p>}</div></article>}
            {connection?.google_account_name && !connection?.google_location_name && <article className="tags_gbp_panel"><header><div><small>PASO 3</small><h2>Buscar antes de crear</h2><p>Tags usa nombre, dirección, teléfono y categoría oficial para encontrar posibles coincidencias.</p></div><button type="button" className="tags_gbp_inline_action" onClick={searchMatches} disabled={busy}><FaMagnifyingGlass /> Buscar en Google</button></header>{matchesSearched && <div className="tags_gbp_matches">{matches.map(match => <article key={match.name}><FaLocationDot /><div><strong>{match.location?.title || match.name}</strong><span>{[match.location?.storefrontAddress?.addressLines?.join(" "), match.location?.storefrontAddress?.locality].filter(Boolean).join(", ")}</span></div>{match.requestAdminRightsUri ? <a href={match.requestAdminRightsUri} target="_blank" rel="noreferrer">Solicitar acceso</a> : <button type="button" onClick={() => createLocation(match.location)}>Crear y administrar</button>}</article>)}{!matches.length && <div className="tags_gbp_no_match"><strong>No encontramos coincidencias.</strong><p>Revisá los datos y, si son correctos, podés crear el perfil.</p><button type="button" onClick={() => createLocation()}>Crear nuevo perfil</button></div>}</div>}</article>}
            {connection?.google_location_name && <article className="tags_gbp_panel"><header><div><small>PASO 3</small><h2>Estado y verificación</h2><p>Google determina qué métodos están disponibles para este negocio.</p></div><button type="button" className="tags_gbp_inline_action" onClick={checkVerification} disabled={busy}><FaRotate /> Consultar estado</button></header>{verification && <><div className={verification.verified ? "tags_gbp_verification is_verified" : "tags_gbp_verification"}>{verification.verified ? <><FaCheck /><div><strong>Negocio verificado</strong><p>Google reconoce a esta cuenta como administradora del perfil.</p></div></> : <><FaTriangleExclamation /><div><strong>Verificación pendiente</strong><p>{verification.options?.length ? `Google ofrece ${verification.options.length} opción u opciones de verificación.` : verification.optionsError || "Google puede requerir una acción externa desde su plataforma."}</p></div></>}</div>{!verification.verified && (verification.options || []).length > 0 && <div className="tags_gbp_verification_options">{verification.options.map(option => <div key={`${option.verificationMethod}-${option.phoneNumber || option.emailData?.domain || "option"}`}><div><strong>{option.verificationMethod}</strong><span>{option.phoneNumber || (option.emailData ? `${option.emailData.user || ""}@${option.emailData.domain || ""}` : "Método administrado por Google")}</span></div>{option.verificationMethod === "EMAIL" && option.emailData?.isUserNameEditable && <input type="email" value={verificationEmail} onChange={event => setVerificationEmail(event.target.value)} placeholder={`usuario@${option.emailData.domain}`} />}<button type="button" onClick={() => startVerification(option)} disabled={busy}>Elegir método</button></div>)}</div>}{!verification.verified && <div className="tags_gbp_pin"><input value={verificationPin} onChange={event => setVerificationPin(event.target.value)} placeholder="Código de verificación recibido" /><button type="button" onClick={completeVerification} disabled={busy || !verificationPin.trim()}>Verificar código</button></div>}</>}</article>}
            {connection?.google_location_name && <article className="tags_gbp_panel"><header><div><small>SINCRONIZACIÓN MANUAL</small><h2>Actualizar Google desde Tags</h2><p>Se validan primero los datos y se muestra un resumen antes de enviarlos.</p></div><button type="button" className="tags_gbp_inline_action" onClick={syncGoogle} disabled={busy}><FaRotate /> Revisar y sincronizar</button></header><p className="tags_gbp_notice">Nombre, contacto, sitio web, descripción, categoría, dirección, coordenadas y horarios se toman de la fuente central del negocio.</p></article>}
        </section>}

        {activeTab === "history" && <section className="tags_gbp_panel tags_gbp_history"><header><div><small>AUDITORÍA</small><h2>Historial de conexión y sincronización</h2></div><button type="button" onClick={loadAll}><FaRotate /> Actualizar</button></header><div className="tags_gbp_table_wrap"><table><thead><tr><th>Fecha</th><th>Acción</th><th>Dirección</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>{logs.map(item => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString("es-AR")}</td><td>{item.action}</td><td>{item.direction}</td><td><span className={`status_${item.status}`}>{item.status}</span></td><td>{item.error_message || "-"}</td></tr>)}{!logs.length && <tr><td colSpan="5">Todavía no hay movimientos registrados.</td></tr>}</tbody></table></div></section>}
    </main>;
}
