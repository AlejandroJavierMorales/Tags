import { getGoogleBusinessAdminAccess } from "@/app/modules/google-business-profile/lib/googleBusinessAccess";
import { googleAuthorizationUrl } from "@/app/modules/google-business-profile/server/googleBusinessApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
    const access = await getGoogleBusinessAdminAccess(businessId);
    if (!access.allowed) return Response.redirect(new URL("/login", request.url));
    try {
        const publicHost = String(request.headers.get("x-tags-public-host") || request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
        const forwardedProto = String(request.headers.get("x-forwarded-proto") || "").split(",")[0].trim();
        const protocol = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : new URL(request.url).protocol.replace(":", "");
        const returnOrigin = publicHost ? `${protocol}://${publicHost}` : new URL(request.url).origin;
        return Response.redirect(googleAuthorizationUrl(businessId, returnOrigin));
    } catch (error) {
        const target = new URL(`/dashboard/businesses/${businessId}/google-business-profile`, request.url);
        target.searchParams.set("google", "configuration_error");
        return Response.redirect(target);
    }
}
