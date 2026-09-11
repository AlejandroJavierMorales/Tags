import { db } from "@/app/lib/tags-db";
import { getGoogleBusinessAdminAccess, googleBusinessError } from "@/app/modules/google-business-profile/lib/googleBusinessAccess";
import { accessTokenForBusiness, listGoogleLocations, logGoogleAction, publicConnection } from "@/app/modules/google-business-profile/server/googleBusinessApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    try {
        const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const [rows] = await db.query("SELECT * FROM tags_google_business_connections WHERE business_id=? LIMIT 1", [businessId]);
        return Response.json({ ok: true, configured: Boolean(process.env.GOOGLE_BUSINESS_CLIENT_ID && process.env.GOOGLE_BUSINESS_CLIENT_SECRET && process.env.GOOGLE_BUSINESS_REDIRECT_URI && process.env.GOOGLE_BUSINESS_TOKEN_ENCRYPTION_KEY && process.env.GOOGLE_BUSINESS_OAUTH_STATE_SECRET), connection: publicConnection(rows[0]) });
    } catch (error) {
        console.error("GOOGLE BUSINESS CONNECTION GET ERROR", error.message);
        return googleBusinessError(error);
    }
}

export async function PATCH(request) {
    try {
        const body = await request.json().catch(() => null);
        const businessId = Number(body?.businessId || 0);
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const { connection, accessToken } = await accessTokenForBusiness(businessId);
        if (body.action === "select_account") {
            const accounts = connection.accounts_json ? JSON.parse(connection.accounts_json) : [];
            const account = accounts.find(item => item.name === body.accountName);
            if (!account) return Response.json({ ok: false, error: "Cuenta de Google invalida" }, { status: 400 });
            const locations = await listGoogleLocations(accessToken, account.name);
            await db.query("UPDATE tags_google_business_connections SET google_account_name=?,google_account_label=?,locations_json=?,google_location_name=NULL,google_location_label=NULL,google_place_id=NULL,google_maps_url=NULL,last_error=NULL,updated_at=NOW() WHERE business_id=?", [account.name, account.accountName || account.name, JSON.stringify(locations), businessId]);
            await logGoogleAction({ businessId, action: "list_locations", status: "success", responseData: { count: locations.length } });
        } else if (body.action === "select_location") {
            const locations = connection.locations_json ? JSON.parse(connection.locations_json) : [];
            const location = locations.find(item => item.name === body.locationName);
            if (!location) return Response.json({ ok: false, error: "Perfil de Google invalido" }, { status: 400 });
            await db.query("UPDATE tags_google_business_connections SET google_location_name=?,google_location_label=?,google_place_id=?,google_maps_url=?,connection_status='connected',last_sync_at=NOW(),last_error=NULL,updated_at=NOW() WHERE business_id=?", [location.name, location.title || location.name, location.metadata?.placeId || null, location.metadata?.mapsUri || null, businessId]);
            await logGoogleAction({ businessId, action: "select_location", status: "success", responseData: { locationName: location.name, title: location.title } });
        } else {
            return Response.json({ ok: false, error: "Accion invalida" }, { status: 400 });
        }
        const [rows] = await db.query("SELECT * FROM tags_google_business_connections WHERE business_id=? LIMIT 1", [businessId]);
        return Response.json({ ok: true, connection: publicConnection(rows[0]) });
    } catch (error) {
        console.error("GOOGLE BUSINESS CONNECTION PATCH ERROR", error.message);
        return googleBusinessError(error);
    }
}

export async function DELETE(request) {
    try {
        const body = await request.json().catch(() => null);
        const businessId = Number(body?.businessId || 0);
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        await db.query("DELETE FROM tags_google_business_connections WHERE business_id=?", [businessId]);
        await logGoogleAction({ businessId, action: "disconnect", direction: "tags_to_google", status: "success" });
        return Response.json({ ok: true });
    } catch (error) {
        console.error("GOOGLE BUSINESS CONNECTION DELETE ERROR", error.message);
        return googleBusinessError(error);
    }
}
