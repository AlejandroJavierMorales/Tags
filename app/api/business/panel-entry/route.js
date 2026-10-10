import { db } from "@/app/lib/tags-db";
import { getSessionBusiness } from "@/app/lib/getSessionBusiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTES = {
    panel: ({ id }) => `/dashboard/businesses/${id}`,
    staff: ({ id }) => `/dashboard/businesses/${id}/staff`,
    qr_page: ({ id }) => `/dashboard/businesses/${id}`,
    tags_id: ({ id }) => `/dashboard/businesses/${id}`,
    guest_experience: ({ id }) => `/dashboard/businesses/${id}/guest-experience`,
    store: ({ id }) => `/dashboard/businesses/${id}/store`,
    resto: ({ id }) => `/dashboard/businesses/${id}/resto`,
    turnos: ({ id }) => `/dashboard/businesses/${id}/turnos`,
    client_reviews: ({ id }) => `/dashboard/businesses/${id}/resto/reviews`,
    qr_agency: ({ id }) => `/dashboard/businesses/${id}/qr-agency`,
    ai_chatbot: ({ id }) => `/dashboard/businesses/${id}/ai-chat`,
    google_business_profile: ({ id }) => `/dashboard/businesses/${id}/google-business-profile`,
    loyalty: ({ id }) => `/dashboard/businesses/${id}/loyalty`,
    events: ({ id }) => `/dashboard/businesses/${id}/events`,
    e_events: ({ id }) => `/dashboard/businesses/${id}/events-pro`,
    directory: ({ id }) => `/dashboard/businesses/${id}/directory`,
    portal_public: ({ id }) => `/dashboard/businesses/${id}/portal`,
};

const LABELS = {
    qr_page: "QR-Page", tags_id: "Tags ID",
    panel: "Panel general", guest_experience: "Mi Estadía", store: "Tags Tienda",
    resto: "Restaurant - Carta de menú", turnos: "Turnos y Reservas", client_reviews: "Reseñas de Clientes",
    qr_agency: "Tags QR Agency", ai_chatbot: "Chatbot con IA", loyalty: "Beneficios y fidelización",
    events: "Eventos", e_events: "Eventos Pro",
    directory: "Mi Web", portal_public: "Portal público",
    google_business_profile: "Perfil de Empresa en Google Maps"
};

async function authorized(businessId) {
    const session = await getSessionBusiness();
    return session && (session.role === "admin" || Number(session.id) === businessId) ? session : null;
}

async function optionsFor(businessId) {
    const options = [{ key: "panel", label: LABELS.panel, path: ROUTES.panel({ id: businessId }) }, { key: "staff", label: "Colaboradores", path: ROUTES.staff({ id: businessId }) }];
    const [addons] = await db.query(`SELECT DISTINCT addon_code FROM tags_business_addons WHERE business_id=? AND status='active' AND (expires_at IS NULL OR expires_at>=NOW())`, [businessId]);
    const active = new Set(addons.map(item => String(item.addon_code || "").toLowerCase()));
    const [pages] = await db.query("SELECT DISTINCT page_type,qr_code_id FROM tags_qr_pages WHERE business_id=? AND status='published'", [businessId]);
    const pageTypes = new Set(pages.map(item => String(item.page_type || "").toLowerCase()));
    Object.keys(ROUTES).filter(key => !["panel", "staff"].includes(key)).forEach(key => {
        const available = active.has(key)
            || pageTypes.has(key)
            || (key === "tags_id" && active.has("tagsid"))
            || (key === "client_reviews" && active.has("reviews"))
            || (key === "portal_public" && active.has("portal"));
        if (!available) return;
        const page = pages.find(item => String(item.page_type || "").toLowerCase() === key && item.qr_code_id);
        const path = key === "client_reviews" && page
            ? `/dashboard/businesses/${businessId}/qrs/${page.qr_code_id}/client-reviews`
            : ["qr_page", "tags_id"].includes(key) && page
                ? `/dashboard/businesses/${businessId}/qrs/${page.qr_code_id}/qr-page`
                : ROUTES[key]({ id: businessId });
        options.push({ key, label: LABELS[key], path });
    });
    return options;
}

function parseVisibleKeys(value) {
    if (value == null || value === "") return null;
    if (Array.isArray(value)) return value.map(String);
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch { return null; }
}

async function preferenceFor(businessId) {
    try {
        const [rows] = await db.query("SELECT panel_entry_key,panel_visible_keys FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
        return rows[0] || null;
    } catch (error) {
        if (error?.code !== "ER_BAD_FIELD_ERROR") throw error;
        const [rows] = await db.query("SELECT panel_entry_key FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
        return rows[0] ? { ...rows[0], panel_visible_keys: null } : null;
    }
}

export async function GET(request) {
    try {
        const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
        const session = businessId ? await authorized(businessId) : null;
        if (!businessId || !session) return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
        const preference = await preferenceFor(businessId);
        if (!preference) return Response.json({ ok: false, error: "Cliente no encontrado" }, { status: 404 });
        const configurableOptions = await optionsFor(businessId);
        const configuredKeys = parseVisibleKeys(preference.panel_visible_keys);
        const availableKeys = new Set(configurableOptions.map(item => item.key));
        let visibleKeys = configuredKeys === null
            ? configurableOptions.map(item => item.key)
            : configuredKeys.filter(key => availableKeys.has(key));
        if (!visibleKeys.length) visibleKeys = ["panel"];
        const clientOptions = configurableOptions.filter(item => item.key === "staff" || visibleKeys.includes(item.key));
        const selected = clientOptions.some(item => item.key === preference.panel_entry_key)
            ? preference.panel_entry_key
            : clientOptions[0]?.key || "panel";
        const options = session.role === "admin" ? configurableOptions : clientOptions;
        const selectedPath = configurableOptions.find(item => item.key === selected)?.path || ROUTES.panel({ id: businessId });
        return Response.json({ ok: true, selected, selectedPath, options, visibleKeys, configurableOptions: session.role === "admin" ? configurableOptions : undefined, restricted: configuredKeys !== null, isPlatformAdmin: session.role === "admin" });
    } catch (error) {
        console.error("PANEL ENTRY GET ERROR", error.message);
        return Response.json({ ok: false, error: "No se pudo cargar la configuración de acceso" }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const body = await request.json().catch(() => null);
        const businessId = Number(body?.businessId || 0);
        const key = String(body?.key || "panel");
        const session = businessId ? await authorized(businessId) : null;
        if (!businessId || !ROUTES[key] || !session) return Response.json({ ok: false, error: "Configuración inválida" }, { status: 400 });
        if (session.role !== "admin") return Response.json({ ok: false, error: "Solo el administrador de la plataforma puede configurar esta experiencia" }, { status: 403 });
        const options = await optionsFor(businessId);
        const availableKeys = new Set(options.map(item => item.key));
        const requestedVisible = Array.isArray(body.visibleKeys)
            ? [...new Set(body.visibleKeys.map(String))].filter(item => availableKeys.has(item))
            : options.map(item => item.key);
        if (!requestedVisible.length) return Response.json({ ok: false, error: "El cliente debe conservar al menos una aplicación visible" }, { status: 400 });
        if (!requestedVisible.includes(key)) return Response.json({ ok: false, error: "La aplicación inicial también debe estar visible" }, { status: 400 });
        try {
            await db.query("UPDATE tags_businesses SET panel_entry_key=?,panel_visible_keys=?,updated_at=NOW() WHERE id=?", [key, JSON.stringify(requestedVisible), businessId]);
        } catch (error) {
            if (error?.code === "ER_BAD_FIELD_ERROR") return Response.json({ ok: false, error: "Falta ejecutar la migración de visibilidad del Panel" }, { status: 409 });
            throw error;
        }
        return Response.json({ ok: true, selected: key, visibleKeys: requestedVisible });
    } catch (error) {
        console.error("PANEL ENTRY PATCH ERROR", error.message);
        return Response.json({ ok: false, error: "No se pudo guardar la configuración de acceso" }, { status: 500 });
    }
}
