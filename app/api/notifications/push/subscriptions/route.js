export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { db } from "@/app/lib/tags-db";
import { getTurnosAccess, turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { getGuestAdminAccess } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { sendPushTest } from "@/app/modules/notifications/server/sendBusinessPush";

async function accessFor(request, body = null) {
  const businessId = Number(body?.businessId || new URL(request.url).searchParams.get("businessId") || 0);
  let access = await getTurnosAccess({ businessId });
  if (!access.allowed) access = await getGuestAdminAccess({ businessId, permission: "guest.dashboard.view" });
  return { businessId, access };
}

export async function GET(request) {
  const { access } = await accessFor(request);
  if (!access.allowed) return turnosAccessResponse(access);
  return Response.json({ ok: true, publicKey: process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || "" });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.subscription?.endpoint || !body.subscription?.keys?.p256dh || !body.subscription?.keys?.auth) return Response.json({ error: "Suscripción push inválida" }, { status: 400 });
  const { businessId, access } = await accessFor(request, body);
  if (!access.allowed) return turnosAccessResponse(access);
  const isPlatformAdmin = access.session?.role === "admin";
  const recipientType = isPlatformAdmin ? "platform_admin" : access.session?.type === "business_staff" ? "business_staff" : access.isStaff ? "turnos_staff" : "business_owner";
  const recipientId = isPlatformAdmin ? Number(access.session?.id || access.session?.businessId || 0) || null : access.isStaff ? Number(access.staff?.id || 0) : businessId;
  const subscriptionBusinessId = isPlatformAdmin ? 0 : businessId;
  const endpointHash = crypto.createHash("sha256").update(body.subscription.endpoint).digest("hex");
  await db.query(`INSERT INTO tags_push_subscriptions
    (business_id,recipient_type,recipient_id,endpoint,endpoint_hash,p256dh,auth_secret,user_agent,status,last_seen_at)
    VALUES (?,?,?,?,?,?,?,?, 'active',NOW()) ON DUPLICATE KEY UPDATE business_id=VALUES(business_id),recipient_type=VALUES(recipient_type),recipient_id=VALUES(recipient_id),p256dh=VALUES(p256dh),auth_secret=VALUES(auth_secret),user_agent=VALUES(user_agent),status='active',last_seen_at=NOW()`,
    [subscriptionBusinessId, recipientType, recipientId, body.subscription.endpoint, endpointHash, body.subscription.keys.p256dh, body.subscription.keys.auth, String(request.headers.get("user-agent") || "").slice(0, 500)]);
  if (body.test === true) {
    const test = await sendPushTest(endpointHash);
    if (!test.ok) return Response.json({ error: test.error || "No se pudo enviar la prueba" }, { status: 502 });
  }
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const body = await request.json().catch(() => null);
  const { businessId, access } = await accessFor(request, body);
  if (!access.allowed) return turnosAccessResponse(access);
  const endpoint = String(body?.endpoint || "");
  if (endpoint) await db.query(access.session?.role === "admin" ? "UPDATE tags_push_subscriptions SET status='revoked' WHERE recipient_type='platform_admin' AND endpoint_hash=?" : "UPDATE tags_push_subscriptions SET status='revoked' WHERE business_id=? AND endpoint_hash=?", access.session?.role === "admin" ? [crypto.createHash("sha256").update(endpoint).digest("hex")] : [businessId, crypto.createHash("sha256").update(endpoint).digest("hex")]);
  return Response.json({ ok: true });
}
