export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { db } from "@/app/lib/tags-db";
import { getGuestPublicSession } from "@/app/modules/guest-experience/lib/getGuestPublicSession";

async function context(request, body = null) {
  const slug = String(body?.slug || new URL(request.url).searchParams.get("slug") || "");
  return { slug, session: await getGuestPublicSession(slug) };
}

export async function GET(request) {
  const { session } = await context(request);
  if (!session) return Response.json({ error: "La sesión venció o no es válida" }, { status: 401 });
  return Response.json({ ok: true, publicKey: process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || "" });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const subscription = body?.subscription;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return Response.json({ error: "Suscripción push inválida" }, { status: 400 });
  const { session } = await context(request, body);
  if (!session) return Response.json({ error: "La sesión venció o no es válida" }, { status: 401 });
  const endpointHash = crypto.createHash("sha256").update(subscription.endpoint).digest("hex");
  await db.query(`INSERT INTO tags_push_subscriptions
    (business_id,recipient_type,recipient_id,endpoint,endpoint_hash,p256dh,auth_secret,user_agent,status,last_seen_at)
    VALUES (?,'guest',?,?,?,?,?,?, 'active',NOW()) ON DUPLICATE KEY UPDATE business_id=VALUES(business_id),recipient_type='guest',recipient_id=VALUES(recipient_id),p256dh=VALUES(p256dh),auth_secret=VALUES(auth_secret),user_agent=VALUES(user_agent),status='active',last_seen_at=NOW()`,
    [session.business_id, session.guest_id, subscription.endpoint, endpointHash, subscription.keys.p256dh, subscription.keys.auth, String(request.headers.get("user-agent") || "").slice(0, 500)]);
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const body = await request.json().catch(() => null);
  const { session } = await context(request, body);
  if (!session) return Response.json({ error: "La sesión venció o no es válida" }, { status: 401 });
  const endpoint = String(body?.endpoint || "");
  if (endpoint) await db.query("UPDATE tags_push_subscriptions SET status='revoked' WHERE business_id=? AND recipient_type='guest' AND recipient_id=? AND endpoint_hash=?", [session.business_id, session.guest_id, crypto.createHash("sha256").update(endpoint).digest("hex")]);
  return Response.json({ ok: true });
}
