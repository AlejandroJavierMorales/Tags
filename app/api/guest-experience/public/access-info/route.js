export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { guestError, parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function GET(req) {
    try {
        const slug = new URL(req.url).searchParams.get("slug");
        if (!slug) return guestError("Slug requerido", 400);
        const [rows] = await db.query("SELECT id,name,slug,logo_url,cover_url,welcome_message,settings_json FROM tags_guest_apps WHERE slug=? AND status='published' LIMIT 1", [slug]);
        const app = rows[0];
        if (!app) return guestError("La página de Mi Estadía no está disponible", 404);
        const [commerce] = await db.query("SELECT module_type FROM tags_guest_commerce_integrations WHERE guest_app_id=? AND is_active=1 GROUP BY module_type", [app.id]);
        const [reviews] = await db.query("SELECT p.slug FROM tags_qr_pages p INNER JOIN tags_business_addons a ON a.business_id=p.business_id AND a.addon_code='client_reviews' AND a.status='active' AND (a.expires_at IS NULL OR a.expires_at>=NOW()) WHERE p.business_id=(SELECT business_id FROM tags_guest_apps WHERE id=?) AND p.page_type='client_reviews' AND p.status='published' LIMIT 1", [app.id]);
        return Response.json({ ok: true, experience: { name: app.name, slug: app.slug, logoUrl: app.logo_url, coverUrl: app.cover_url, welcomeMessage: app.welcome_message, settings: parseGuestJson(app.settings_json), capabilities: { store: commerce.some(item => item.module_type === "store"), resto: commerce.some(item => item.module_type === "resto"), reviews: Boolean(reviews[0]) } } });
    } catch (error) {
        console.error("GUEST ACCESS INFO ERROR", error);
        return guestError("No se pudo cargar la información de Mi Estadía", 500);
    }
}
