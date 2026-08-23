import { cookies } from "next/headers";
import { verifyTagsSession } from "@/app/lib/signTagsSession";

export async function requireSubscriptionAdmin() {
  const store = await cookies();
  const value = store.get("tags_session")?.value || "";
  const signature = store.get("tags_session_sig")?.value || "";
  if (!value || !verifyTagsSession(value, signature)) return { ok: false, status: 401, error: "No autenticado" };
  try {
    const session = JSON.parse(value);
    return session?.role === "admin"
      ? { ok: true, session }
      : { ok: false, status: 403, error: "Sin permisos" };
  } catch {
    return { ok: false, status: 401, error: "Sesión inválida" };
  }
}

export function subscriptionAdminError(access) {
  return Response.json({ ok: false, error: access.error }, { status: access.status || 403 });
}

