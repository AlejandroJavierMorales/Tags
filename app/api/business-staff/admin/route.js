import crypto from "node:crypto";
import { db } from "@/app/lib/tags-db";
import { sendMagicLink } from "@/app/lib/mailgun";
import { getChannelContextFromHost, getRequestBaseUrl, getRequestHost } from "@/app/lib/channelContext";
import { BUSINESS_STAFF_MODULES, BUSINESS_STAFF_PERMISSION_CATALOG, getBusinessStaffPermissions } from "@/app/modules/business-staff/lib/businessStaffPermissions";
import { businessStaffAdminError, getBusinessStaff, requireBusinessOwner } from "@/app/modules/business-staff/lib/businessStaffAdminAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function email(value) { const result = String(value || "").trim().toLowerCase(); return /^\S+@\S+\.\S+$/.test(result) ? result : ""; }
function ip(request) { return String(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "").split(",")[0].trim().slice(0, 64) || null; }
function argentinaWhatsapp(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("54")) return digits.startsWith("549") ? digits : `549${digits.slice(2).replace(/^15/, "")}`;
  digits = digits.replace(/^0/, "").replace(/^15/, "");
  return digits ? `549${digits}` : "";
}

async function sendInvitation(request, businessId, staffId, delivery = "email") {
  try {
    const [[staff]] = await db.query("SELECT id,name,email,phone FROM tags_business_staff WHERE id=? AND business_id=? AND status='active' LIMIT 1", [staffId, businessId]);
    if (!staff) return Response.json({ ok: false, error: "Colaborador no encontrado" }, { status: 404 });
    const token = crypto.randomBytes(32).toString("base64url");
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    await db.query("UPDATE tags_business_staff_auth_tokens SET used_at=NOW() WHERE staff_id=? AND used_at IS NULL", [staffId]);
    await db.query("INSERT INTO tags_business_staff_auth_tokens (staff_id,business_id,token_hash,expires_at,requested_ip) VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL 15 MINUTE),?)", [staffId, businessId, hash, ip(request)]);
    const baseUrl = getRequestBaseUrl(request);
    if (!baseUrl) return Response.json({ ok: false, error: "No se pudo determinar la URL del acceso" }, { status: 500 });
    const channel = await getChannelContextFromHost(getRequestHost(request));
    const brand = channel.brandConfig || {};
    const link = `${baseUrl}/api/business-staff/auth/verify?token=${encodeURIComponent(token)}`;
    if (delivery === "whatsapp") {
      const recipient = argentinaWhatsapp(staff.phone);
      if (!recipient) return Response.json({ ok: false, error: "El colaborador no tiene un número de WhatsApp válido." }, { status: 400 });
      const businessName = String(brand.name || brand.siteName || brand.site_name || "tu negocio").trim();
      const message = `Hola ${staff.name}, te enviamos el acceso al panel de ${businessName}:\n${link}\n\nEl enlace vence en 15 minutos y puede utilizarse una sola vez.`;
      await db.query("UPDATE tags_business_staff SET invited_at=NOW() WHERE id=?", [staffId]);
      return Response.json({ ok: true, invited: true, delivery: "whatsapp", whatsappUrl: `https://wa.me/${recipient}?text=${encodeURIComponent(message)}` });
    }
    await sendMagicLink(staff.email, link, { name: staff.name, logo: brand.logoUrl || brand.logo_url || "", color: brand.primaryColor || "#26734f", from: brand.mailFrom || brand.mail_from, mailgunDomain: brand.mailgunDomain || brand.mailgun_domain });
    await db.query("UPDATE tags_business_staff SET invited_at=NOW() WHERE id=?", [staffId]);
    return Response.json({ ok: true, invited: true });
  } catch (error) {
    console.error("BUSINESS STAFF INVITATION ERROR", error);
    return Response.json({ ok: false, error: "No se pudo generar o enviar el acceso del colaborador." }, { status: 500 });
  }
}

export async function GET(request) {
  const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
  const access = await requireBusinessOwner(businessId);
  if (!access.ok) return businessStaffAdminError(access);
  const [addons] = await db.query("SELECT DISTINCT addon_code FROM tags_business_addons WHERE business_id=? AND status='active' AND (expires_at IS NULL OR expires_at>=NOW())", [businessId]);
  const [apps] = await db.query("SELECT DISTINCT app_code FROM tags_turnos_apps WHERE business_id=? AND status<>'deleted'", [businessId]).catch(() => [[]]);
  const [pages] = await db.query("SELECT DISTINCT page_type FROM tags_qr_pages WHERE business_id=? AND status='published'", [businessId]).catch(() => [[]]);
  const active = new Set(addons.map(item => String(item.addon_code || "").toLowerCase()));
  apps.forEach(item => active.add(String(item.app_code || "").toLowerCase()));
  pages.forEach(item => active.add(String(item.page_type || "").toLowerCase()));
  const aliases = {
    web: "directory",
    directory_web: "directory",
    directory_plus: "directory",
    portal: "portal_public",
    reviews: "client_reviews",
    client_review: "client_reviews",
    google_maps_profile: "google_business_profile",
    google_profile: "google_business_profile",
    business_profile: "google_business_profile",
    tagsid: "tags_id",
  };
  [...active].forEach(code => { if (aliases[code]) active.add(aliases[code]); });
  if (active.has("reviews")) active.add("client_reviews");
  if (active.has("portal")) active.add("portal_public");
  const modules = Object.fromEntries(Object.entries(BUSINESS_STAFF_MODULES)
    .filter(([code]) => active.has(code))
    .map(([code, module]) => [code, { ...module, permissions: BUSINESS_STAFF_PERMISSION_CATALOG[code] || [] }]));
  return Response.json({ ok: true, staff: await getBusinessStaff(businessId), modules });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const businessId = Number(body?.businessId || 0);
  const access = await requireBusinessOwner(businessId);
  if (!access.ok) return businessStaffAdminError(access);
  const name = String(body?.name || "").trim().slice(0, 190);
  const staffEmail = email(body?.email);
  const phone = String(body?.phone || "").trim().slice(0, 60) || null;
  const requested = Array.isArray(body?.access) ? body.access : [];
  if (!name || !staffEmail || !requested.length) return Response.json({ ok: false, error: "Nombre, email y al menos un módulo son obligatorios" }, { status: 400 });
  const validRequested = requested.filter(item => BUSINESS_STAFF_MODULES[String(item?.appCode || "")]);
  if (!validRequested.length) return Response.json({ ok: false, error: "Seleccioná al menos un módulo válido" }, { status: 400 });
  if (String(access.session?.email || "").toLowerCase() === staffEmail) return Response.json({ ok: false, error: "Ese email pertenece al propietario" }, { status: 409 });
  const connection = await db.getConnection();
  let staffId;
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query("SELECT id FROM tags_business_staff WHERE business_id=? AND LOWER(email)=? LIMIT 1 FOR UPDATE", [businessId, staffEmail]);
    if (existing[0]) { staffId = existing[0].id; await connection.query("UPDATE tags_business_staff SET name=?,email=?,phone=?,status='active' WHERE id=?", [name, staffEmail, phone, staffId]); }
    else { const [created] = await connection.query("INSERT INTO tags_business_staff (business_id,name,email,phone,status,created_by_id) VALUES (?,?,?,?,'active',?)", [businessId, name, staffEmail, phone, access.session?.id || null]); staffId = created.insertId; }
    await connection.query("DELETE FROM tags_business_staff_app_access WHERE staff_id=? AND business_id=?", [staffId, businessId]);
    for (const item of validRequested) {
      const appCode = String(item?.appCode || "");
      const module = BUSINESS_STAFF_MODULES[appCode];
      if (!module) continue;
      const roleCode = module.roles[item?.roleCode] ? item.roleCode : "custom";
      const allowed = new Set((BUSINESS_STAFF_PERMISSION_CATALOG[appCode] || []).map(([code]) => code));
      const permissions = [...new Set((Array.isArray(item?.permissions) ? item.permissions : []).map(String).filter(code => allowed.has(code)))];
      await connection.query(`INSERT INTO tags_business_staff_app_access (staff_id,business_id,app_code,app_instance_id,role_code,permissions_json,status) VALUES (?,?,?,?,?,?,'active') ON DUPLICATE KEY UPDATE role_code=VALUES(role_code),permissions_json=VALUES(permissions_json),status='active'`, [staffId, businessId, appCode, Number(item?.appInstanceId || 0), roleCode, JSON.stringify(permissions)]);
    }
    await connection.commit();
  } catch (error) { await connection.rollback(); console.error("BUSINESS STAFF SAVE ERROR", error); return Response.json({ ok: false, error: "No se pudo guardar el colaborador" }, { status: 500 }); }
  finally { connection.release(); }
  return sendInvitation(request, businessId, staffId);
}

export async function PATCH(request) {
  const body = await request.json().catch(() => null);
  const businessId = Number(body?.businessId || 0); const access = await requireBusinessOwner(businessId);
  if (!access.ok) return businessStaffAdminError(access);
  const staffId = Number(body?.staffId || 0); if (!staffId) return Response.json({ ok: false, error: "Colaborador inválido" }, { status: 400 });
  if (body.action === "invite") return sendInvitation(request, businessId, staffId, "email");
  if (body.action === "invite_whatsapp") return sendInvitation(request, businessId, staffId, "whatsapp");
  if (body.action === "delete") {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query("SELECT id FROM tags_business_staff WHERE id=? AND business_id=? LIMIT 1 FOR UPDATE", [staffId, businessId]);
      if (!rows[0]) { await connection.rollback(); return Response.json({ ok: false, error: "Colaborador no encontrado" }, { status: 404 }); }
      await connection.query("DELETE FROM tags_business_staff_app_access WHERE staff_id=? AND business_id=?", [staffId, businessId]);
      await connection.query("DELETE FROM tags_business_staff_legacy_links WHERE staff_id=? AND business_id=?", [staffId, businessId]);
      await connection.query("DELETE FROM tags_business_staff_auth_tokens WHERE staff_id=? AND business_id=?", [staffId, businessId]);
      await connection.query("DELETE FROM tags_business_staff WHERE id=? AND business_id=?", [staffId, businessId]);
      await connection.commit();
      return Response.json({ ok: true, deleted: true });
    } catch (error) { await connection.rollback(); console.error("BUSINESS STAFF DELETE ERROR", error); return Response.json({ ok: false, error: "No se pudo eliminar el colaborador" }, { status: 500 }); }
    finally { connection.release(); }
  }
  const status = body.status === "inactive" ? "inactive" : "active";
  await db.query("UPDATE tags_business_staff SET status=? WHERE id=? AND business_id=?", [status, staffId, businessId]);
  await db.query("UPDATE tags_business_staff_app_access SET status=? WHERE staff_id=? AND business_id=?", [status, staffId, businessId]);
  return Response.json({ ok: true });
}
