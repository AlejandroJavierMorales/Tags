import { db } from "@/app/lib/tags-db";
import { getGoogleBusinessAdminAccess, googleBusinessError } from "@/app/modules/google-business-profile/lib/googleBusinessAccess";
import { accessTokenForBusiness, createGoogleLocation, listGoogleLocations, logGoogleAction, searchGoogleLocations } from "@/app/modules/google-business-profile/server/googleBusinessApi";
import { buildGoogleLocationPayload, sanitizeGoogleLocation } from "@/app/modules/google-business-profile/server/buildGoogleLocationPayload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    try {
        const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const { accessToken } = await accessTokenForBusiness(businessId);
        const matches = await searchGoogleLocations(accessToken, await buildGoogleLocationPayload(businessId));
        await logGoogleAction({ businessId, action: "search_matches", status: "success", responseData: { count: matches.length } });
        return Response.json({ ok: true, matches });
    } catch (error) {
        console.error("GOOGLE BUSINESS MATCHES GET ERROR", error.message);
        return googleBusinessError(error);
    }
}

export async function POST(request) {
    let businessId = 0;
    try {
        const body = await request.json().catch(() => null);
        businessId = Number(body?.businessId || 0);
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const { connection, accessToken } = await accessTokenForBusiness(businessId);
        if (!connection.google_account_name) return Response.json({ ok: false, error: "Selecciona primero la cuenta empresarial de Google" }, { status: 400 });
        const source = body?.location && typeof body.location === "object" ? body.location : await buildGoogleLocationPayload(businessId);
        const location = { ...sanitizeGoogleLocation(source), storeCode: source.storeCode || `tags-${businessId}-${Date.now()}` };
        await createGoogleLocation(accessToken, connection.google_account_name, location, true);
        const created = await createGoogleLocation(accessToken, connection.google_account_name, location, false);
        const locations = await listGoogleLocations(accessToken, connection.google_account_name);
        await db.query("UPDATE tags_google_business_connections SET google_location_name=?,google_location_label=?,google_place_id=?,google_maps_url=?,locations_json=?,connection_status='connected',verification_status='not_started',last_sync_at=NOW(),last_error=NULL,updated_at=NOW() WHERE business_id=?", [created.name, created.title || location.title, created.metadata?.placeId || null, created.metadata?.mapsUri || null, JSON.stringify(locations), businessId]);
        await logGoogleAction({ businessId, action: "create_location", direction: "tags_to_google", status: "success", responseData: { name: created.name, title: created.title } });
        return Response.json({ ok: true, location: created });
    } catch (error) {
        console.error("GOOGLE BUSINESS LOCATION CREATE ERROR", error.message);
        if (businessId) await logGoogleAction({ businessId, action: "create_location", direction: "tags_to_google", status: "error", error }).catch(() => {});
        return googleBusinessError(error);
    }
}
