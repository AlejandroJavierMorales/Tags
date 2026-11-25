export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { parseGuestJson, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function GET(req) {
    const params = new URL(req.url).searchParams;
    const businessId = Number(params.get("businessId") || 0);
    const access = await getGuestAdminAccess({ businessId, permission: "guest.dashboard.view" });
    if (!access.allowed) return guestAdminAccessResponse(access);
    const [apps] = await db.query("SELECT * FROM tags_guest_apps WHERE business_id=? LIMIT 1", [businessId]);
    const app = apps[0];
    if (!app) return guestError("Mi Estadía todavía no fue creada", 404, "GUEST_APP_NOT_FOUND");
    const [units] = await db.query("SELECT * FROM tags_guest_units WHERE guest_app_id=? ORDER BY sort_order,name", [app.id]);
    const [unitBlocks] = await db.query("SELECT b.*,u.name unit_name FROM tags_guest_unit_blocks b LEFT JOIN tags_guest_units u ON u.id=b.unit_id WHERE b.guest_app_id=? AND b.status='active' ORDER BY b.starts_on,b.id", [app.id]);
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
    await db.query("UPDATE tags_guest_booking_requests SET status='expired',resolved_at=NOW(),updated_at=NOW() WHERE guest_app_id=? AND status='pending_payment' AND hold_expires_at<=NOW()", [app.id]);
    const [pendingRequests] = await db.query(`SELECT r.*,u.name unit_name,u.code unit_code
        FROM tags_guest_booking_requests r INNER JOIN tags_guest_units u ON u.id=r.unit_id AND u.guest_app_id=r.guest_app_id
        WHERE r.guest_app_id=? AND r.status IN ('pending_payment','expired')
        ORDER BY FIELD(r.status,'pending_payment','expired'),r.created_at DESC LIMIT 500`, [app.id]);
    const stayIds = stays.map(item => item.id);
    let communications = [];
    if (stayIds.length) {
        const placeholders = stayIds.map(() => "?").join(",");
        [communications] = await db.query(`SELECT id,stay_id,event_code,channel,recipient,subject,status,sent_at,failed_at,last_error,created_at FROM tags_guest_communications WHERE direction='outbound' AND stay_id IN (${placeholders}) ORDER BY created_at DESC,id DESC`, stayIds);
        const [quoteEvents] = await db.query(`SELECT CONCAT('quote-',e.id) id,s.id stay_id,e.event_type event_code,e.channel,e.recipient,CONCAT('Presupuesto ',q.quote_code) subject,COALESCE(e.delivery_status,'recorded') status,CASE WHEN e.delivery_status='sent' THEN e.created_at ELSE NULL END sent_at,NULL failed_at,JSON_UNQUOTE(JSON_EXTRACT(e.metadata_json,'$.error')) last_error,e.created_at FROM tags_guest_stays s INNER JOIN tags_guest_lodging_quotes q ON q.id=s.lodging_quote_id AND q.guest_app_id=s.guest_app_id INNER JOIN tags_guest_lodging_quote_events e ON e.quote_id=q.id AND e.guest_app_id=q.guest_app_id WHERE s.id IN (${placeholders}) AND e.event_type IN ('quote.sent','quote.whatsapp_opened')`, stayIds);
        communications.push(...quoteEvents);
        communications.sort((left,right)=>String(right.created_at).localeCompare(String(left.created_at)));
    }
    const communicationsByStay = communications.reduce((map,item) => { (map[item.stay_id] ||= []).push(item); return map; }, {});
    const staysWithCommunications = stays.map(item => ({ ...item, communications: communicationsByStay[item.id] || [] }));
    const [themes] = await db.query("SELECT id,code,name,css_tokens FROM tags_qr_page_themes WHERE is_active=1 ORDER BY sort_order,id");
    const [wifiNetworks] = await db.query("SELECT * FROM tags_guest_wifi_networks WHERE guest_app_id=? ORDER BY sort_order,id", [app.id]);
    const [portals] = await db.query("SELECT theme_code FROM tags_portals WHERE business_id=? LIMIT 1", [businessId]);
    const canSeeStays = access.isOwner || access.permissions?.includes("guest.stays.view");
    const canManageSettings = access.isOwner || access.permissions?.includes("guest.settings.manage");
    const normalizedUnits = units.map(item => ({ ...item, features: parseGuestJson(item.features_json) }));
    return Response.json({ ok: true, access: { isOwner: access.isOwner, isStaff: access.isStaff, permissions: access.permissions || [] }, app: { ...app, settings: canManageSettings ? parseGuestJson(app.settings_json) : {}, styles: canManageSettings ? parseGuestJson(app.styles_json) : {} }, units: canSeeStays || canManageSettings ? normalizedUnits : [], unitBlocks: canSeeStays || canManageSettings ? unitBlocks : [], guests: canSeeStays ? guests : [], stays: canSeeStays ? staysWithCommunications : [], pendingRequests: canSeeStays ? pendingRequests : [], wifiNetworks: canManageSettings ? wifiNetworks : [], themes: canManageSettings ? themes.map(item => ({ ...item, css_tokens: parseGuestJson(item.css_tokens) })) : [], portalThemeCode: canManageSettings ? portals[0]?.theme_code || null : null });
}
