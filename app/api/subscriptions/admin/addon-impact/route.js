export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireSubscriptionAdmin, subscriptionAdminError } from "@/app/modules/subscriptions/lib/requireSubscriptionAdmin";
import { syncBusinessQRPageEnabled } from "@/app/modules/addons/lib/syncBusinessQRPageEnabled";

const QUERIES = {
  directory: [
    ["fichas públicas", "SELECT COUNT(*) total FROM tags_directory_listings WHERE business_id=?"],
    ["páginas públicas", "SELECT COUNT(*) total FROM tags_qr_pages WHERE business_id=? AND page_type='directory'"]
  ],
  turnos: [
    ["agendas", "SELECT COUNT(*) total FROM tags_turnos_apps WHERE business_id=?"],
    ["servicios", "SELECT COUNT(*) total FROM tags_turnos_services s INNER JOIN tags_turnos_apps a ON a.id=s.turnos_id WHERE a.business_id=?"],
    ["recursos", "SELECT COUNT(*) total FROM tags_turnos_resources r INNER JOIN tags_turnos_apps a ON a.id=r.turnos_id WHERE a.business_id=?"],
    ["reservas", "SELECT COUNT(*) total FROM tags_turnos_bookings b INNER JOIN tags_turnos_apps a ON a.id=b.turnos_id WHERE a.business_id=?", true]
  ],
  store: [
    ["tiendas", "SELECT COUNT(*) total FROM tags_stores WHERE business_id=? AND app_type='store'"],
    ["productos", "SELECT COUNT(*) total FROM tags_store_products p INNER JOIN tags_stores s ON s.id=p.store_id WHERE s.business_id=? AND s.app_type='store'"],
    ["pedidos", "SELECT COUNT(*) total FROM tags_store_orders o INNER JOIN tags_stores s ON s.id=o.store_id WHERE s.business_id=? AND s.app_type='store'", true]
  ],
  resto: [
    ["restaurantes", "SELECT COUNT(*) total FROM tags_stores WHERE business_id=? AND app_type='resto'"],
    ["productos de la carta", "SELECT COUNT(*) total FROM tags_store_products p INNER JOIN tags_stores s ON s.id=p.store_id WHERE s.business_id=? AND s.app_type='resto'"],
    ["pedidos", "SELECT COUNT(*) total FROM tags_store_orders o INNER JOIN tags_stores s ON s.id=o.store_id WHERE s.business_id=? AND s.app_type='resto'", true],
    ["servicios de mesa", "SELECT COUNT(*) total FROM tags_resto_sessions rs INNER JOIN tags_stores s ON s.id=rs.store_id WHERE s.business_id=?", true]
  ],
  client_reviews: [
    ["formularios", "SELECT COUNT(*) total FROM tags_client_review_forms WHERE business_id=?"],
    ["respuestas", "SELECT COUNT(*) total FROM tags_client_review_responses WHERE business_id=?", true],
    ["páginas públicas", "SELECT COUNT(*) total FROM tags_qr_pages WHERE business_id=? AND page_type='client_reviews'"]
  ],
  loyalty: [
    ["programas", "SELECT COUNT(*) total FROM tags_loyalty_programs WHERE business_id=?"],
    ["premios", "SELECT COUNT(*) total FROM tags_loyalty_rewards r INNER JOIN tags_loyalty_programs p ON p.id=r.program_id WHERE p.business_id=?"],
    ["movimientos", "SELECT COUNT(*) total FROM tags_loyalty_transactions t INNER JOIN tags_loyalty_programs p ON p.id=t.program_id WHERE p.business_id=?", true]
  ],
  ai_chatbot: [
    ["configuraciones", "SELECT COUNT(*) total FROM tags_ai_chatbot_settings WHERE business_id=?"],
    ["lugares donde aparece", "SELECT COUNT(*) total FROM tags_ai_chatbot_surfaces WHERE business_id=?"],
    ["contenidos de conocimiento", "SELECT COUNT(*) total FROM tags_ai_chatbot_knowledge WHERE business_id=?"],
    ["conversaciones registradas", "SELECT COUNT(*) total FROM tags_ai_chatbot_usage WHERE business_id=?", true]
  ],
  google_business_profile: [
    ["perfiles preparados", "SELECT COUNT(*) total FROM tags_google_business_profiles WHERE business_id=?"],
    ["conexiones con Google", "SELECT COUNT(*) total FROM tags_google_business_connections WHERE business_id=?"],
    ["sincronizaciones registradas", "SELECT COUNT(*) total FROM tags_google_business_sync_logs WHERE business_id=?", true]
  ],
  guest_experience: [
    ["aplicaciones Mi Estadía", "SELECT COUNT(*) total FROM tags_guest_apps WHERE business_id=?"],
    ["alojamientos", "SELECT COUNT(*) total FROM tags_guest_units u INNER JOIN tags_guest_apps a ON a.id=u.guest_app_id WHERE a.business_id=?"],
    ["estadías", "SELECT COUNT(*) total FROM tags_guest_stays s INNER JOIN tags_guest_apps a ON a.id=s.guest_app_id WHERE a.business_id=?", true],
    ["movimientos de cuenta", "SELECT COUNT(*) total FROM tags_guest_account_entries e INNER JOIN tags_guest_accounts c ON c.id=e.account_id INNER JOIN tags_guest_apps a ON a.id=c.guest_app_id WHERE a.business_id=?", true]
  ],
  portal_public: [
    ["sitios públicos", "SELECT COUNT(*) total FROM tags_portals WHERE business_id=?"],
    ["accesos a funcionalidades", "SELECT COUNT(*) total FROM tags_portal_routes WHERE business_id=?"]
  ]
};

async function countSafely(sql, businessId) {
  try { const [[row]] = await db.query(sql, [businessId]); return Number(row?.total || 0); }
  catch (error) { if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code)) return null; throw error; }
}

export async function GET(req) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  try {
    const url = new URL(req.url);
    const businessId = Number(url.searchParams.get("businessId") || 0);
    const addonCode = String(url.searchParams.get("addonCode") || "").trim();
    if (!businessId || !addonCode) return Response.json({ ok: false, error: "Faltan el cliente y la funcionalidad" }, { status: 400 });
    const [[addon]] = await db.query(`SELECT ba.id,a.name FROM tags_business_addons ba LEFT JOIN tags_addons a ON BINARY a.code=BINARY ba.addon_code WHERE ba.business_id=? AND ba.addon_code=? ORDER BY ba.id DESC LIMIT 1`, [businessId, addonCode]);
    if (!addon) return Response.json({ ok: false, error: "El cliente no tiene esta funcionalidad" }, { status: 404 });
    const definitions = QUERIES[addonCode] || [];
    const items = [];
    for (const [label, sql, preserve] of definitions) {
      const count = await countSafely(sql, businessId);
      if (count !== null) items.push({ label, count, preserve: Boolean(preserve) });
    }
    return Response.json({ ok: true, impact: { addonCode, addonName: addon.name || addonCode.replaceAll("_", " "), items, configured: definitions.length > 0, hasData: items.some(item => item.count > 0), preservedItems: items.filter(item => item.preserve && item.count > 0).map(item => item.label) } });
  } catch (error) {
    console.error("SUBSCRIPTION ADDON IMPACT ERROR", error);
    return Response.json({ ok: false, error: "No se pudo revisar qué información tiene esta funcionalidad" }, { status: 500 });
  }
}

export async function PATCH(req) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  const body = await req.json().catch(() => null);
  const businessId = Number(body?.businessId || 0);
  const subscriptionId = Number(body?.subscriptionId || 0);
  const addonCode = String(body?.addonCode || "").trim();
  const action = String(body?.action || "");
  if (!businessId || !subscriptionId || !addonCode || !["deactivate_keep_data", "restore"].includes(action)) return Response.json({ ok: false, error: "Solicitud incompleta" }, { status: 400 });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[subscription]] = await conn.query("SELECT id,business_id,status FROM tags_subscriptions WHERE id=? AND business_id=? LIMIT 1 FOR UPDATE", [subscriptionId, businessId]);
    if (!subscription) throw Object.assign(new Error("La suscripción actual no existe"), { status: 404 });
    const [grants] = await conn.query("SELECT id,business_addon_id,quantity,status FROM tags_subscription_addon_grants WHERE subscription_id=? AND business_id=? AND addon_code=? FOR UPDATE", [subscriptionId, businessId, addonCode]);
    if (!grants.length) throw Object.assign(new Error("Esta funcionalidad no forma parte de la suscripción"), { status: 404 });
    const addonIds = grants.map(item => Number(item.business_addon_id)).filter(Boolean);
    const nextStatus = action === "restore" && ["active", "trial"].includes(subscription.status) ? "active" : action === "restore" ? "inactive" : "removed";
    await conn.query("UPDATE tags_subscription_addon_grants SET status=?,updated_at=NOW() WHERE subscription_id=? AND business_id=? AND addon_code=?", [nextStatus, subscriptionId, businessId, addonCode]);
    if (addonIds.length) await conn.query(`UPDATE tags_business_addons SET status=?,updated_at=NOW() WHERE business_id=? AND id IN (${addonIds.map(() => "?").join(",")})`, [nextStatus === "active" ? "active" : "inactive", businessId, ...addonIds]);
    const eventCode = action === "restore" ? "subscription.addon_restored" : "subscription.addon_removed";
    await conn.query("INSERT INTO tags_subscription_audit_events (subscription_id,business_id,event_code,actor_type,actor_id,previous_state_json,next_state_json,context_json) VALUES (?,?,?,'admin',?,?,?,?)", [subscriptionId, businessId, eventCode, Number(access.session?.businessId || 0) || null, JSON.stringify({ addonCode, grants: grants.map(item => ({ id: item.id, quantity: item.quantity, status: item.status })) }), JSON.stringify({ addonCode, status: nextStatus, dataPreserved: true }), JSON.stringify({ action })]);
    await conn.commit();
    await syncBusinessQRPageEnabled(businessId).catch(error => console.error("SUBSCRIPTION ADDON QR SYNC ERROR", error));
    return Response.json({ ok: true, status: nextStatus, message: action === "restore" ? (nextStatus === "active" ? "La funcionalidad volvió a estar habilitada." : "La funcionalidad volvió a incluirse y se habilitará cuando la suscripción esté vigente.") : "La funcionalidad fue quitada y su información quedó guardada." });
  } catch (error) {
    await conn.rollback();
    console.error("SUBSCRIPTION ADDON DEACTIVATE ERROR", error);
    return Response.json({ ok: false, error: error?.message || "No se pudo actualizar la funcionalidad" }, { status: error?.status || 500 });
  } finally { conn.release(); }
}
