export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { createSlug } from "@/app/modules/qr-page/lib/createSlug";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function PATCH(req) {
    const body = await req.json().catch(() => null); if (!body) return guestError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0), slug = createSlug(body.slug || "");
    const access = await getGuestAdminAccess({ businessId, guestAppId }); if (!access.allowed) return guestAdminAccessResponse(access);
    if (!slug) return guestError("Slug inválido");
    const [existing] = await db.query("SELECT id FROM tags_guest_apps WHERE slug=? AND id<>? LIMIT 1", [slug, guestAppId]);
    if (existing.length) return guestError("Ese slug ya está en uso", 409);
    await db.query("UPDATE tags_guest_apps SET slug=?,updated_at=NOW() WHERE id=? AND business_id=?", [slug, guestAppId, businessId]);
    await db.query("INSERT INTO tags_guest_audit_log (guest_app_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,'owner',?,'guest_app.slug_changed','guest_app',?,?)", [guestAppId, access.session?.id || access.session?.userId || null, guestAppId, JSON.stringify({ slug })]);
    return Response.json({ ok: true, slug });
}
