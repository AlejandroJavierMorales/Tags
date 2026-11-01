export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function GET(req) {
    const params = new URL(req.url).searchParams;
    const businessId = Number(params.get("businessId") || 0), guestAppId = Number(params.get("guestAppId") || 0);
    const access = await getGuestAdminAccess({ businessId, guestAppId });
    if (!access.allowed) return guestAdminAccessResponse(access);
    const [rows] = await db.query(`SELECT p.id,p.title,p.description,p.category,p.image_url,p.images_json,q.title page_title
        FROM tags_qr_page_products p INNER JOIN tags_qr_pages q ON q.id=p.page_id
        WHERE q.business_id=? AND q.page_type='directory' AND p.is_visible=1
        ORDER BY p.sort_order,p.id`, [businessId]);
    return Response.json({ ok: true, products: rows.map(item => { const parsed = parseGuestJson(item.images_json, []); return { ...item, images: Array.isArray(parsed) && parsed.length ? parsed : item.image_url ? [{ url: item.image_url, alt: item.title }] : [] }; }) });
}
