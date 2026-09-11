import { db } from "@/app/lib/tags-db";
import { getGoogleBusinessAdminAccess, googleBusinessError } from "@/app/modules/google-business-profile/lib/googleBusinessAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    try {
        const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const [rows] = await db.query("SELECT id,action,direction,status,error_message,created_at FROM tags_google_business_sync_logs WHERE business_id=? ORDER BY id DESC LIMIT 100", [businessId]);
        return Response.json({ ok: true, logs: rows });
    } catch (error) {
        return googleBusinessError(error);
    }
}
