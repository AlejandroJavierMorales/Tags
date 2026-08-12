export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { createSlug } from "@/app/modules/qr-page/lib/createSlug";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function POST(req) {
    const body = await req.json().catch(() => null);
    if (!body) return guestError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0);
    const name = cleanGuestText(body.name, 190);
    const slug = createSlug(body.slug || name);
    if (!businessId || !name || !slug) return guestError("businessId, nombre y slug son requeridos");
    const access = await getGuestAdminAccess({ businessId });
    if (!access.allowed) return guestAdminAccessResponse(access);
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [addons] = await connection.query("SELECT id FROM tags_business_addons WHERE business_id=? AND addon_code='guest_experience' AND status='active' AND (expires_at IS NULL OR expires_at>=NOW()) LIMIT 1 FOR UPDATE", [businessId]);
        if (!addons.length) { await connection.rollback(); return guestError("El cliente no tiene Guest Experience activo", 403); }
        const [existing] = await connection.query("SELECT id FROM tags_guest_apps WHERE business_id=? LIMIT 1", [businessId]);
        if (existing.length) { await connection.rollback(); return guestError("Este negocio ya tiene Mi Estadía creada", 409); }
        const [slugRows] = await connection.query("SELECT id FROM tags_guest_apps WHERE slug=? LIMIT 1", [slug]);
        if (slugRows.length) { await connection.rollback(); return guestError("Ese slug ya está en uso", 409); }
        const [businesses] = await connection.query("SELECT id,logo_url,cover_url FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
        if (!businesses[0]) { await connection.rollback(); return guestError("Negocio no encontrado", 404); }
        const [portalThemes] = await connection.query("SELECT t.id,t.code FROM tags_portals p INNER JOIN tags_qr_page_themes t ON t.code=p.theme_code AND t.is_active=1 WHERE p.business_id=? LIMIT 1", [businessId]);
        const [defaultThemes] = portalThemes.length ? [[]] : await connection.query("SELECT id,code FROM tags_qr_page_themes WHERE code='tags_default' AND is_active=1 LIMIT 1");
        const theme = portalThemes[0] || defaultThemes[0] || null;
        const defaultTemplate = { code: "guest_default", sections: ["stay_summary", "precheckin", "wifi", "benefits", "turnos", "store", "resto", "messages", "account", "reviews"] };
        const settings = { sessionGraceDays: 7, themeId: theme?.id || null, themeCode: theme?.code || "tags_default", themeOverride: false, reservationCodeBase: "R000", reservationCodePrefix: "R", reservationCodePadding: 3, reservationCodeCounter: 0, checkinTime: "15:00", checkoutTime: "10:00", depositPercentage: 0, reminderHoursBefore: 48, template: defaultTemplate };
        const [result] = await connection.query("INSERT INTO tags_guest_apps (business_id,slug,name,logo_url,cover_url,welcome_message,timezone,status,settings_json,styles_json) VALUES (?,?,?,?,?,'Bienvenido a tu experiencia de estadía','America/Argentina/Buenos_Aires','draft',?,?)", [businessId, slug, name, businesses[0].logo_url || null, businesses[0].cover_url || null, JSON.stringify(settings), JSON.stringify({})]);
        await connection.query(`INSERT INTO tags_guest_request_categories (guest_app_id,code,name,description,icon_code,requires_schedule,sort_order) VALUES
            (?,'cleaning','Limpieza','Solicitud de limpieza de la unidad','cleaning',1,10),
            (?,'maintenance','Mantenimiento','Informar un inconveniente o reparación','maintenance',0,20),
            (?,'breakfast','Desayuno','Solicitar desayuno cuando el alojamiento lo ofrece','breakfast',1,30),
            (?,'linens','Ropa blanca','Solicitar toallas, sábanas u otra ropa blanca','linens',0,40),
            (?,'general','Consulta general','Otras consultas para el alojamiento','general',0,50)`, [result.insertId,result.insertId,result.insertId,result.insertId,result.insertId]);
        await connection.query("INSERT INTO tags_guest_audit_log (guest_app_id,actor_type,actor_id,action,entity_type,entity_id) VALUES (?,'owner',?,'guest_app.created','guest_app',?)", [result.insertId, access.session?.id || access.session?.userId || null, result.insertId]);
        await connection.commit();
        return Response.json({ ok: true, guestAppId: result.insertId, slug });
    } catch (error) {
        await connection.rollback();
        console.error("GUEST EXPERIENCE ACTIVATE ERROR:", error);
        return Response.json({ ok: false, error: "No se pudo activar Mi Estadía" }, { status: 500 });
    } finally { connection.release(); }
}
