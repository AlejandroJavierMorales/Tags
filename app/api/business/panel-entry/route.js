import { db } from "@/app/lib/tags-db";
import { getSessionBusiness } from "@/app/lib/getSessionBusiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTES = {
    panel: ({ id }) => `/dashboard/businesses/${id}`,
    guest_experience: ({ id }) => `/dashboard/businesses/${id}/guest-experience`,
    store: ({ id }) => `/dashboard/businesses/${id}/store`,
    resto: ({ id }) => `/dashboard/businesses/${id}/resto`,
    turnos: ({ id }) => `/dashboard/businesses/${id}/turnos`,
    client_reviews: ({ id }) => `/dashboard/businesses/${id}/resto/reviews`,
    qr_agency: ({ id }) => `/dashboard/businesses/${id}/qr-agency`,
    ai_chatbot: ({ id }) => `/dashboard/businesses/${id}/ai-chat`,
    google_business_profile: ({ id }) => `/dashboard/businesses/${id}/google-business-profile`,
    loyalty: ({ id }) => `/dashboard/businesses/${id}/loyalty`,
    directory: ({ id }) => `/dashboard/businesses/${id}/directory`,
    portal_public: ({ id }) => `/dashboard/businesses/${id}/portal`,
};

const LABELS = {
    panel: "Panel general", guest_experience: "Mi Estadía", store: "Tags Tienda",
    resto: "Tags Resto", turnos: "Tags Turnos", client_reviews: "Tags Reviews",
    qr_agency: "Tags QR Agency", ai_chatbot: "Chatbot con IA", loyalty: "Beneficios y fidelización",
    directory: "Mi Web", portal_public: "Portal público",
};

LABELS.google_business_profile = "Google Maps Profile";

async function authorized(businessId) {
    const session = await getSessionBusiness();
    return session && (session.role === "admin" || Number(session.id) === businessId) ? session : null;
}

async function optionsFor(businessId) {
    const options = [{ key: "panel", label: LABELS.panel, path: ROUTES.panel({ id: businessId }) }];
    const [addons] = await db.query(`SELECT DISTINCT addon_code FROM tags_business_addons WHERE business_id=? AND status='active' AND (expires_at IS NULL OR expires_at>=NOW())`, [businessId]);
    const active = new Set(addons.map(item => String(item.addon_code || "").toLowerCase()));
    const [pages] = await db.query("SELECT DISTINCT page_type,qr_code_id FROM tags_qr_pages WHERE business_id=? AND status='published'", [businessId]);
    const pageTypes = new Set(pages.map(item => String(item.page_type || "").toLowerCase()));
    Object.keys(ROUTES).filter(key => key !== "panel").forEach(key => {
        const available = active.has(key) || pageTypes.has(key) || (key === "client_reviews" && active.has("reviews")) || (key === "portal_public" && active.has("portal"));
        if (available) {
            const page = pages.find(item => String(item.page_type || "").toLowerCase() === key && item.qr_code_id);
            const path = key === "client_reviews" && page
                ? `/dashboard/businesses/${businessId}/qrs/${page.qr_code_id}/client-reviews`
                : ROUTES[key]({ id: businessId });
            options.push({ key, label: LABELS[key], path });
        }
    });
    return options;
}

export async function GET(request) {
    try {
        const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
        if (!businessId || !(await authorized(businessId))) return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
        const [rows] = await db.query("SELECT panel_entry_key FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
        if (!rows[0]) return Response.json({ ok: false, error: "Cliente no encontrado" }, { status: 404 });
        const options = await optionsFor(businessId);
        const selected = options.some(item => item.key === rows[0].panel_entry_key) ? rows[0].panel_entry_key : "panel";
        return Response.json({ ok: true, selected, options });
    } catch (error) {
        console.error("PANEL ENTRY GET ERROR", error.message);
        return Response.json({ ok: false, error: "No se pudo cargar la preferencia de acceso" }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const body = await request.json().catch(() => null);
        const businessId = Number(body?.businessId || 0);
        const key = String(body?.key || "panel");
        if (!businessId || !ROUTES[key] || !(await authorized(businessId))) return Response.json({ ok: false, error: "Preferencia inválida" }, { status: 400 });
        const options = await optionsFor(businessId);
        if (!options.some(item => item.key === key)) return Response.json({ ok: false, error: "La funcionalidad no está activa para este cliente" }, { status: 400 });
        await db.query("UPDATE tags_businesses SET panel_entry_key=?, updated_at=NOW() WHERE id=?", [key, businessId]);
        return Response.json({ ok: true, selected: key });
    } catch (error) {
        console.error("PANEL ENTRY PATCH ERROR", error.message);
        return Response.json({ ok: false, error: "No se pudo guardar la preferencia de acceso" }, { status: 500 });
    }
}
