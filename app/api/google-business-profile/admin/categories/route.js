import { getGoogleBusinessAdminAccess, googleBusinessError } from "@/app/modules/google-business-profile/lib/googleBusinessAccess";
import { accessTokenForBusiness, getGoogleCategories, searchGoogleCategories } from "@/app/modules/google-business-profile/server/googleBusinessApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    try {
        const url = new URL(request.url);
        const businessId = Number(url.searchParams.get("businessId") || 0);
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const { accessToken } = await accessTokenForBusiness(businessId);
        const categoryId = url.searchParams.get("categoryId") || "";
        const categories = categoryId
            ? await getGoogleCategories(accessToken, categoryId, url.searchParams.get("region") || "AR", "es-419")
            : await searchGoogleCategories(accessToken, url.searchParams.get("q") || "", url.searchParams.get("region") || "AR", "es-419");
        return Response.json({ ok: true, categories });
    } catch (error) {
        return googleBusinessError(error);
    }
}
