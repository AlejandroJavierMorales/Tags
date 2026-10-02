import { db } from "@/app/lib/tags-db";
import { getGoogleBusinessAdminAccess, googleBusinessError } from "@/app/modules/google-business-profile/lib/googleBusinessAccess";
import { buildGoogleLocationPayload } from "@/app/modules/google-business-profile/server/buildGoogleLocationPayload";
import { accessTokenForBusiness, getGoogleLocation, logGoogleAction, updateGoogleLocation } from "@/app/modules/google-business-profile/server/googleBusinessApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MASK_FIELDS = ["title", "phoneNumbers", "websiteUri", "profile", "categories", "storefrontAddress", "latlng", "regularHours", "specialHours"];

export async function GET(request) {
    try {
        const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const { connection, accessToken } = await accessTokenForBusiness(businessId);
        if (!connection.google_location_name) return Response.json({ ok: false, error: "Selecciona primero un perfil de Google" }, { status: 400 });
        const [preview, current] = await Promise.all([
            buildGoogleLocationPayload(businessId, { requireCategory: false }),
            getGoogleLocation(accessToken, connection.google_location_name)
        ]);
        return Response.json({ ok: true, preview, current, fields: MASK_FIELDS.filter(field => preview[field] != null) });
    } catch (error) { return googleBusinessError(error); }
}

export async function POST(request) {
    let businessId = 0;
    try {
        const body = await request.json().catch(() => null);
        businessId = Number(body?.businessId || 0);
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const { connection, accessToken } = await accessTokenForBusiness(businessId);
        if (!connection.google_location_name) return Response.json({ ok: false, error: "Selecciona primero un perfil de Google" }, { status: 400 });
        const location = await buildGoogleLocationPayload(businessId, { requireCategory: false });
        const requestedFields = Array.isArray(body?.fields) ? body.fields : [];
        const selectedFields = MASK_FIELDS.filter(field => requestedFields.includes(field) && location[field] != null);
        if (!selectedFields.length) return Response.json({ ok: false, error: "Selecciona al menos un dato para sincronizar" }, { status: 400 });
        const selectedLocation = Object.fromEntries(selectedFields.map(field => [field, location[field]]));
        const mask = selectedFields.join(",");
        await updateGoogleLocation(accessToken, connection.google_location_name, selectedLocation, mask, true);
        const updated = await updateGoogleLocation(accessToken, connection.google_location_name, selectedLocation, mask, false);
        await db.query("UPDATE tags_google_business_connections SET last_sync_at=NOW(),last_error=NULL,updated_at=NOW() WHERE business_id=?", [businessId]);
        await logGoogleAction({ businessId, action: "sync_profile", direction: "tags_to_google", status: "success", requestData: { fields: mask.split(",") }, responseData: { name: updated.name } });
        return Response.json({ ok: true, location: updated });
    } catch (error) {
        if (businessId) {
            await db.query("UPDATE tags_google_business_connections SET last_error=?,updated_at=NOW() WHERE business_id=?", [String(error.message).slice(0, 1000), businessId]).catch(() => {});
            await logGoogleAction({ businessId, action: "sync_profile", direction: "tags_to_google", status: "error", error }).catch(() => {});
        }
        return googleBusinessError(error);
    }
}
