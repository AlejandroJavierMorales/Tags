export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { db } from "@/app/lib/tags-db";
import { requireSubscriptionAdmin, subscriptionAdminError } from "@/app/modules/subscriptions/lib/requireSubscriptionAdmin";
import { sendPushTest } from "@/app/modules/notifications/server/sendBusinessPush";

export async function GET() {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  return Response.json({ ok: true, publicKey: process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || "" });
}

export async function POST(request) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  const body = await request.json().catch(() => null);
  const subscription = body?.subscription;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return Response.json({ error: "Suscripción push inválida" }, { status: 400 });
  }
  const recipientId = Number(access.session?.businessId || access.session?.id || 0) || null;
  const endpointHash = crypto.createHash("sha256").update(subscription.endpoint).digest("hex");
  await db.query(`INSERT INTO tags_push_subscriptions
    (business_id,recipient_type,recipient_id,endpoint,endpoint_hash,p256dh,auth_secret,user_agent,status,last_seen_at)
    VALUES (0,'platform_admin',?,?,?,?,?,?, 'active',NOW())
    ON DUPLICATE KEY UPDATE business_id=0,recipient_type='platform_admin',recipient_id=VALUES(recipient_id),p256dh=VALUES(p256dh),auth_secret=VALUES(auth_secret),user_agent=VALUES(user_agent),status='active',last_seen_at=NOW()`,
    [recipientId, subscription.endpoint, endpointHash, subscription.keys.p256dh, subscription.keys.auth, String(request.headers.get("user-agent") || "").slice(0, 500)]);
  if (body.test === true) {
    const test = await sendPushTest(endpointHash);
    if (!test.ok) return Response.json({ error: test.error || "No se pudo enviar la prueba" }, { status: 502 });
  }
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  const body = await request.json().catch(() => null);
  const endpoint = String(body?.endpoint || "");
  if (endpoint) {
    const endpointHash = crypto.createHash("sha256").update(endpoint).digest("hex");
    await db.query("UPDATE tags_push_subscriptions SET status='revoked' WHERE recipient_type='platform_admin' AND endpoint_hash=?", [endpointHash]);
  }
  return Response.json({ ok: true });
}
