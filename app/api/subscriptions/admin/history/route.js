import { db } from "@/app/lib/tags-db";
import { requireSubscriptionAdmin, subscriptionAdminError } from "@/app/modules/subscriptions/lib/requireSubscriptionAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  const id = Number(new URL(request.url).searchParams.get("id") || 0);
  if (!id) return Response.json({ ok: false, error: "Falta el registro" }, { status: 400 });
  const [result] = await db.query("DELETE FROM tags_subscription_audit_events WHERE id=?", [id]);
  if (!result.affectedRows) return Response.json({ ok: false, error: "Registro inexistente" }, { status: 404 });
  return Response.json({ ok: true });
}
