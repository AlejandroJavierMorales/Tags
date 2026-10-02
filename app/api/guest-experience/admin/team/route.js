export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "node:crypto";
import { db } from "@/app/lib/tags-db";
import { sendMagicLink } from "@/app/lib/mailgun";
import { getChannelContextFromHost, getRequestBaseUrl, getRequestHost } from "@/app/lib/channelContext";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { GUEST_STAFF_ROLES, parseStaffPermissions } from "@/app/modules/business-staff/lib/businessStaffPermissions";

async function ownerAccess(source) {
  const businessId = Number(source.businessId || 0);
  const guestAppId = Number(source.guestAppId || 0);
  const access = await getGuestAdminAccess({ businessId, guestAppId });
  return { businessId, guestAppId, access };
}

export async function GET(request) {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const { businessId, guestAppId, access } = await ownerAccess(query);
  if (!access.allowed) return guestAdminAccessResponse(access);
  if (!access.isOwner) return guestError("Solo el propietario puede administrar el equipo", 403);
  const [rows] = await db.query(
    `SELECT st.id,st.name,st.email,st.phone,st.status,st.invited_at,st.last_access_at,
            aa.role_code,aa.permissions_json
       FROM tags_business_staff st
       INNER JOIN tags_business_staff_app_access aa
         ON aa.staff_id=st.id AND aa.business_id=st.business_id
      WHERE st.business_id=? AND aa.app_code='guest_experience'
        AND aa.app_instance_id=?
      ORDER BY st.status='active' DESC,st.name`,
    [businessId, guestAppId],
  );
  return Response.json({
    ok: true,
    staff: rows.map(item => ({ ...item, permissions: parseStaffPermissions(item.permissions_json) })),
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const { businessId, guestAppId, access } = await ownerAccess(body);
  if (!access.allowed) return guestAdminAccessResponse(access);
  if (!access.isOwner) return guestError("Solo el propietario puede administrar el equipo", 403);
  const name = cleanGuestText(body.name, 190);
  const email = cleanGuestText(body.email, 190).toLowerCase();
  const phone = cleanGuestText(body.phone, 60) || null;
  const roleCode = GUEST_STAFF_ROLES[body.roleCode] ? body.roleCode : "reception";
  let permissions = roleCode === "custom"
    ? parseStaffPermissions(body.permissions).filter(code => code.startsWith("guest."))
    : GUEST_STAFF_ROLES[roleCode].permissions;
  permissions = [...new Set([
    "guest.dashboard.view",
    ...permissions,
    ...(permissions.includes("guest.stays.manage") || permissions.includes("guest.checkin.manage") ? ["guest.stays.view"] : []),
    ...(permissions.includes("guest.payments.register") ? ["guest.accounts.view"] : []),
    ...(permissions.includes("guest.messages.reply") ? ["guest.messages.view"] : []),
  ])];
  if (permissions.length === 1) permissions.push("guest.stays.view");
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return guestError("Nombre y email válido son obligatorios");
  const [[owner]] = await db.query("SELECT id FROM tags_businesses WHERE id=? AND LOWER(email)=? LIMIT 1", [businessId, email]);
  if (owner) return guestError("Ese email ya corresponde al propietario del negocio", 409);

  const connection = await db.getConnection();
  let staffId;
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query(
      "SELECT id FROM tags_business_staff WHERE business_id=? AND LOWER(email)=? LIMIT 1 FOR UPDATE",
      [businessId, email],
    );
    staffId = existing[0]?.id;
    if (staffId) {
      await connection.query(
        "UPDATE tags_business_staff SET name=?,email=?,phone=?,status='active' WHERE id=?",
        [name, email, phone, staffId],
      );
    } else {
      const [created] = await connection.query(
        "INSERT INTO tags_business_staff (business_id,name,email,phone,status,created_by_id) VALUES (?,?,?,?,'active',?)",
        [businessId, name, email, phone, access.session?.userId || access.session?.id || businessId],
      );
      staffId = created.insertId;
    }
    await connection.query(
      `INSERT INTO tags_business_staff_app_access
        (staff_id,business_id,app_code,app_instance_id,role_code,permissions_json,status)
       VALUES (?,?,'guest_experience',?,?,?,'active')
       ON DUPLICATE KEY UPDATE role_code=VALUES(role_code),
         permissions_json=VALUES(permissions_json),status='active'`,
      [staffId, businessId, guestAppId, roleCode, JSON.stringify(permissions)],
    );

    const [resto] = await connection.query(
      `SELECT rs.id FROM tags_resto_staff rs
        INNER JOIN tags_stores s ON s.id=rs.store_id
       WHERE s.business_id=? AND s.app_type='resto'
         AND LOWER(rs.email)=? LIMIT 1`,
      [businessId, email],
    );
    if (resto[0]) {
      await connection.query(
        `INSERT IGNORE INTO tags_business_staff_legacy_links
          (staff_id,business_id,module_code,legacy_staff_id)
         VALUES (?,?,'resto',?)`,
        [staffId, businessId, resto[0].id],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("GUEST TEAM SAVE ERROR", error);
    return guestError("No se pudo guardar el integrante", 500);
  } finally {
    connection.release();
  }
  return sendInvitation(request, { businessId, guestAppId, staffId });
}

async function sendInvitation(request, { businessId, guestAppId, staffId }) {
  const [[staff]] = await db.query(
    `SELECT st.id,st.name,st.email,a.name app_name,a.logo_url
       FROM tags_business_staff st
       INNER JOIN tags_guest_apps a ON a.id=? AND a.business_id=st.business_id
      WHERE st.id=? AND st.business_id=? AND st.status='active' LIMIT 1`,
    [guestAppId, staffId, businessId],
  );
  if (!staff) return guestError("Integrante no encontrado", 404);
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await db.query(
    "UPDATE tags_business_staff_auth_tokens SET used_at=NOW() WHERE staff_id=? AND used_at IS NULL",
    [staffId],
  );
  await db.query(
    `INSERT INTO tags_business_staff_auth_tokens
      (staff_id,business_id,token_hash,expires_at,requested_ip)
     VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL 15 MINUTE),?)`,
    [staffId, businessId, tokenHash, String(request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null],
  );
  const baseUrl = getRequestBaseUrl(request);
  if (!baseUrl) return guestError("No se pudo determinar la URL del acceso", 500);
  const link = `${baseUrl}/api/business-staff/auth/verify?token=${encodeURIComponent(token)}`;
  const channel = await getChannelContextFromHost(getRequestHost(request));
  const brand = channel.brandConfig || {};
  try {
    await sendMagicLink(staff.email, link, {
      name: staff.app_name,
      logo: staff.logo_url || brand.logoUrl || brand.logo_url || "",
      color: brand.primaryColor || "#0fb957",
      from: brand.mailFrom || brand.mail_from,
      mailgunDomain: brand.mailgunDomain || brand.mailgun_domain,
    });
    await db.query("UPDATE tags_business_staff SET invited_at=NOW() WHERE id=?", [staffId]);
    return Response.json({ ok: true, id: staffId, invited: true });
  } catch (error) {
    console.error("GUEST TEAM INVITATION ERROR", error);
    return guestError("El integrante se guardó, pero no se pudo enviar la invitación", 502);
  }
}

export async function PATCH(request) {
  const body = await request.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const { businessId, guestAppId, access } = await ownerAccess(body);
  if (!access.allowed) return guestAdminAccessResponse(access);
  if (!access.isOwner) return guestError("Solo el propietario puede administrar el equipo", 403);
  const staffId = Number(body.staffId || 0);
  if (!staffId) return guestError("Integrante inválido");
  if (body.action === "invite") return sendInvitation(request, { businessId, guestAppId, staffId });
  const status = body.status === "inactive" ? "inactive" : "active";
  await db.query(
    `UPDATE tags_business_staff st
       INNER JOIN tags_business_staff_app_access aa
         ON aa.staff_id=st.id AND aa.business_id=st.business_id
       SET st.status=?,aa.status=?
      WHERE st.id=? AND st.business_id=? AND aa.app_code='guest_experience'
        AND aa.app_instance_id=?`,
    [status, status, staffId, businessId, guestAppId],
  );
  return Response.json({ ok: true });
}
