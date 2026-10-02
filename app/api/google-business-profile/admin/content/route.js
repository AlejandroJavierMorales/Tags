import { getGoogleBusinessAdminAccess, googleBusinessError } from "@/app/modules/google-business-profile/lib/googleBusinessAccess";
import { accessTokenForBusiness, googleBusinessRequest, logGoogleAction } from "@/app/modules/google-business-profile/server/googleBusinessApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MY_BUSINESS_API = "https://mybusiness.googleapis.com/v4";
const PERFORMANCE_API = "https://businessprofileperformance.googleapis.com/v1";
const MEDIA_CATEGORIES = new Set(["COVER", "PROFILE", "EXTERIOR", "INTERIOR", "PRODUCT", "AT_WORK", "FOOD_AND_DRINK", "MENU", "COMMON_AREA", "ROOMS", "TEAMS", "ADDITIONAL"]);

function resources(connection) {
    const accountId = String(connection.google_account_name || "").split("/").pop();
    const locationId = String(connection.google_location_name || "").split("/").pop();
    if (!accountId || !locationId) {
        const error = new Error("Seleccioná primero una cuenta y un perfil de Google");
        error.status = 400;
        throw error;
    }
    return { locationId, legacyLocation: `accounts/${accountId}/locations/${locationId}` };
}

async function optional(promise) {
    try { return { available: true, data: await promise }; }
    catch (error) { return { available: false, error: error.message, data: null }; }
}

function performanceUrl(locationId) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 89);
    const params = new URLSearchParams();
    ["BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_MAPS", "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH", "WEBSITE_CLICKS", "CALL_CLICKS", "BUSINESS_DIRECTION_REQUESTS"].forEach(metric => params.append("dailyMetrics", metric));
    params.set("dailyRange.startDate.year", String(start.getFullYear()));
    params.set("dailyRange.startDate.month", String(start.getMonth() + 1));
    params.set("dailyRange.startDate.day", String(start.getDate()));
    params.set("dailyRange.endDate.year", String(end.getFullYear()));
    params.set("dailyRange.endDate.month", String(end.getMonth() + 1));
    params.set("dailyRange.endDate.day", String(end.getDate()));
    return `${PERFORMANCE_API}/locations/${locationId}:fetchMultiDailyMetricsTimeSeries?${params}`;
}

export async function GET(request) {
    try {
        const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const { connection, accessToken } = await accessTokenForBusiness(businessId);
        const { locationId, legacyLocation } = resources(connection);
        const [reviews, media, posts, performance] = await Promise.all([
            optional(googleBusinessRequest(accessToken, `${MY_BUSINESS_API}/${legacyLocation}/reviews?pageSize=50&orderBy=${encodeURIComponent("updateTime desc")}`)),
            optional(googleBusinessRequest(accessToken, `${MY_BUSINESS_API}/${legacyLocation}/media?pageSize=100`)),
            optional(googleBusinessRequest(accessToken, `${MY_BUSINESS_API}/${legacyLocation}/localPosts?pageSize=50`)),
            optional(googleBusinessRequest(accessToken, performanceUrl(locationId)))
        ]);
        return Response.json({ ok: true, reviews, media, posts, performance });
    } catch (error) {
        console.error("GOOGLE BUSINESS CONTENT GET ERROR", error.message);
        return googleBusinessError(error);
    }
}

export async function POST(request) {
    let businessId = 0;
    try {
        const body = await request.json().catch(() => null);
        businessId = Number(body?.businessId || 0);
        const action = String(body?.action || "");
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const { connection, accessToken } = await accessTokenForBusiness(businessId);
        const { legacyLocation } = resources(connection);
        let result;
        if (action === "reply_review") {
            const reviewName = String(body?.reviewName || "");
            const comment = String(body?.comment || "").trim().slice(0, 4096);
            if (!reviewName.startsWith(`${legacyLocation}/reviews/`) || !comment) return Response.json({ ok: false, error: "Ingresá una respuesta válida" }, { status: 400 });
            result = await googleBusinessRequest(accessToken, `${MY_BUSINESS_API}/${reviewName}/reply`, { method: "PUT", body: JSON.stringify({ comment }) });
        } else if (action === "create_post") {
            const summary = String(body?.summary || "").trim().slice(0, 1500);
            if (!summary) return Response.json({ ok: false, error: "Escribí el contenido de la publicación" }, { status: 400 });
            const post = { languageCode: "es-419", topicType: "STANDARD", summary };
            const url = String(body?.url || "").trim();
            if (url) post.callToAction = { actionType: "LEARN_MORE", url };
            result = await googleBusinessRequest(accessToken, `${MY_BUSINESS_API}/${legacyLocation}/localPosts`, { method: "POST", body: JSON.stringify(post) });
        } else if (action === "delete_post") {
            const postName = String(body?.postName || "");
            if (!postName.startsWith(`${legacyLocation}/localPosts/`)) return Response.json({ ok: false, error: "Publicación inválida" }, { status: 400 });
            result = await googleBusinessRequest(accessToken, `${MY_BUSINESS_API}/${postName}`, { method: "DELETE" });
        } else if (action === "add_media") {
            const rawSourceUrl = String(body?.sourceUrl || "").trim();
            const sourceUrl = rawSourceUrl ? new URL(rawSourceUrl, new URL(request.url).origin).toString() : "";
            const category = String(body?.category || "ADDITIONAL").toUpperCase();
            if (!/^https:\/\//i.test(sourceUrl) || !MEDIA_CATEGORIES.has(category)) return Response.json({ ok: false, error: "Imagen o categoría inválida" }, { status: 400 });
            result = await googleBusinessRequest(accessToken, `${MY_BUSINESS_API}/${legacyLocation}/media`, { method: "POST", body: JSON.stringify({ mediaFormat: "PHOTO", locationAssociation: { category }, sourceUrl }) });
        } else {
            return Response.json({ ok: false, error: "Acción inválida" }, { status: 400 });
        }
        await logGoogleAction({ businessId, action, direction: "tags_to_google", status: "success", responseData: { name: result?.name || null } });
        return Response.json({ ok: true, result });
    } catch (error) {
        if (businessId) await logGoogleAction({ businessId, action: "manage_content", direction: "tags_to_google", status: "error", error }).catch(() => {});
        return googleBusinessError(error);
    }
}
