export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { parseGuestJson, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function GET(req) {
    const params = new URL(req.url).searchParams;
    const businessId = Number(params.get("businessId") || 0);
    const access = await getGuestAdminAccess({ businessId });
    if (!access.allowed) return guestAdminAccessResponse(access);
    const [apps] = await db.query("SELECT * FROM tags_guest_apps WHERE business_id=? LIMIT 1", [businessId]);
    const app = apps[0];
    if (!app) return guestError("Mi Estadía todavía no fue creada", 404, "GUEST_APP_NOT_FOUND");
    const [units] = await db.query("SELECT * FROM tags_guest_units WHERE guest_app_id=? ORDER BY sort_order,name", [app.id]);
    const [guests] = await db.query("SELECT * FROM tags_guest_people WHERE business_id=? ORDER BY name LIMIT 500", [businessId]);
    const [stays] = await db.query(`SELECT s.*,u.name unit_name,g.name guest_name,g.email guest_email,g.phone guest_phone,g.document_number,
        (SELECT pc.status FROM tags_guest_precheckins pc WHERE pc.stay_id=s.id LIMIT 1) precheckin_status,
        (SELECT pc.vehicle_plate FROM tags_guest_precheckins pc WHERE pc.stay_id=s.id LIMIT 1) vehicle_plate,
        (SELECT pc.vehicle_make_model FROM tags_guest_precheckins pc WHERE pc.stay_id=s.id LIMIT 1) vehicle_make_model,
        (SELECT GROUP_CONCAT(gp.name ORDER BY sp.role DESC,gp.name SEPARATOR '||') FROM tags_guest_stay_people sp INNER JOIN tags_guest_people gp ON gp.id=sp.guest_id WHERE sp.stay_id=s.id) passenger_names,
        (SELECT GROUP_CONCAT(CONCAT(gp.name,'~~',COALESCE(gp.document_number,'')) ORDER BY sp.role DESC,gp.name SEPARATOR '||') FROM tags_guest_stay_people sp INNER JOIN tags_guest_people gp ON gp.id=sp.guest_id WHERE sp.stay_id=s.id) passenger_details,
        (SELECT COALESCE(SUM(CASE WHEN e.status='confirmed' THEN e.total_amount ELSE 0 END),0) FROM tags_guest_accounts ac INNER JOIN tags_guest_account_entries e ON e.account_id=ac.id WHERE ac.stay_id=s.id) account_balance
        ,(SELECT COALESCE(SUM(p.amount),0) FROM tags_guest_accounts ac INNER JOIN tags_guest_payments p ON p.account_id=ac.id WHERE ac.stay_id=s.id) paid_total
        ,(SELECT MAX(c.created_at) FROM tags_guest_communications c WHERE c.stay_id=s.id AND c.event_code='access_link') last_access_sent_at
        ,(SELECT MAX(c.created_at) FROM tags_guest_communications c WHERE c.stay_id=s.id AND c.event_code='arrival_reminder') last_reminder_sent_at
        ,(SELECT COUNT(*) FROM tags_guest_communications c WHERE c.stay_id=s.id) communication_count
        FROM tags_guest_stays s LEFT JOIN tags_guest_units u ON u.id=s.unit_id INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id WHERE s.guest_app_id=? ORDER BY s.starts_at DESC LIMIT 500`, [app.id]);
    const stayIds = stays.map(item => item.id);
    let communications = [];
    if (stayIds.length) {
        const placeholders = stayIds.map(() => "?").join(",");
        [communications] = await db.query(`SELECT id,stay_id,event_code,channel,recipient,subject,status,sent_at,failed_at,last_error,created_at FROM tags_guest_communications WHERE direction='outbound' AND stay_id IN (${placeholders}) ORDER BY created_at DESC,id DESC`, stayIds);
    }
    const communicationsByStay = communications.reduce((map,item) => { (map[item.stay_id] ||= []).push(item); return map; }, {});
    const staysWithCommunications = stays.map(item => ({ ...item, communications: communicationsByStay[item.id] || [] }));
    const [themes] = await db.query("SELECT id,code,name,css_tokens FROM tags_qr_page_themes WHERE is_active=1 ORDER BY sort_order,id");
    const [wifiNetworks] = await db.query("SELECT * FROM tags_guest_wifi_networks WHERE guest_app_id=? ORDER BY sort_order,id", [app.id]);
    const [portals] = await db.query("SELECT theme_code FROM tags_portals WHERE business_id=? LIMIT 1", [businessId]);
    return Response.json({ ok: true, app: { ...app, settings: parseGuestJson(app.settings_json), styles: parseGuestJson(app.styles_json) }, units, guests, stays: staysWithCommunications, wifiNetworks, themes: themes.map(item => ({ ...item, css_tokens: parseGuestJson(item.css_tokens) })), portalThemeCode: portals[0]?.theme_code || null });
}
