import { db } from "@/app/lib/tags-db";
import { getGoogleBusinessAdminAccess, googleBusinessError } from "@/app/modules/google-business-profile/lib/googleBusinessAccess";
import { accessTokenForBusiness, completeGoogleVerification, getGoogleVerificationState, logGoogleAction, startGoogleVerification } from "@/app/modules/google-business-profile/server/googleBusinessApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    try {
        const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const { connection, accessToken } = await accessTokenForBusiness(businessId);
        if (!connection.google_location_name) return Response.json({ ok: false, error: "Selecciona primero un perfil de Google" }, { status: 400 });
        const result = await getGoogleVerificationState(accessToken, connection.google_location_name);
        const verified = Boolean(result.voice?.hasVoiceOfMerchant);
        await db.query("UPDATE tags_google_business_connections SET verification_status=?,updated_at=NOW() WHERE business_id=?", [verified ? "verified" : (result.options.length ? "verification_required" : "pending"), businessId]);
        await logGoogleAction({ businessId, action: "verification_status", status: "success", responseData: { verified, optionCount: result.options.length } });
        return Response.json({ ok: true, verified, ...result });
    } catch (error) {
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
        if (!connection.google_location_name) return Response.json({ ok: false, error: "Selecciona primero un perfil de Google" }, { status: 400 });
        const method = String(body?.method || "").toUpperCase();
        if (!["AUTO", "EMAIL", "SMS", "PHONE_CALL", "ADDRESS", "VETTED_PARTNER"].includes(method)) return Response.json({ ok: false, error: "Metodo de verificacion invalido" }, { status: 400 });
        const requestData = { method };
        if (method === "EMAIL") requestData.emailAddress = String(body.emailAddress || "").trim();
        if (method === "SMS" || method === "PHONE_CALL") requestData.phoneNumber = String(body.phoneNumber || "").trim();
        if (method === "ADDRESS") requestData.mailerContact = String(body.mailerContact || "").trim();
        const result = await startGoogleVerification(accessToken, connection.google_location_name, requestData);
        const verification = result.verification || {};
        await db.query("INSERT INTO tags_google_business_verifications (business_id,google_location_name,verification_name,method,status,external_action_required,started_at,options_json) VALUES (?,?,?,?,?,?,NOW(),?)", [businessId, connection.google_location_name, verification.name || null, method, verification.state || "PENDING", ["ADDRESS"].includes(method) ? 1 : 0, JSON.stringify(body.option || null)]);
        await db.query("UPDATE tags_google_business_connections SET verification_status=?,updated_at=NOW() WHERE business_id=?", [verification.state === "COMPLETED" ? "verified" : "verification_pending", businessId]);
        await logGoogleAction({ businessId, action: "start_verification", direction: "tags_to_google", status: "success", responseData: { method, state: verification.state } });
        return Response.json({ ok: true, verification });
    } catch (error) {
        if (businessId) await logGoogleAction({ businessId, action: "start_verification", direction: "tags_to_google", status: "error", error }).catch(() => {});
        return googleBusinessError(error);
    }
}

export async function PATCH(request) {
    let businessId = 0;
    try {
        const body = await request.json().catch(() => null);
        businessId = Number(body?.businessId || 0);
        const pin = String(body?.pin || "").trim();
        if (!pin) return Response.json({ ok: false, error: "Ingresa el codigo recibido" }, { status: 400 });
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const { accessToken } = await accessTokenForBusiness(businessId);
        const [rows] = await db.query("SELECT * FROM tags_google_business_verifications WHERE business_id=? AND status IN ('PENDING','pending') AND verification_name IS NOT NULL ORDER BY id DESC LIMIT 1", [businessId]);
        if (!rows[0]) return Response.json({ ok: false, error: "No hay una verificacion pendiente" }, { status: 409 });
        const result = await completeGoogleVerification(accessToken, rows[0].verification_name, pin);
        const verification = result.verification || {};
        await db.query("UPDATE tags_google_business_verifications SET status=?,completed_at=IF(?='COMPLETED',NOW(),completed_at),updated_at=NOW() WHERE id=?", [verification.state || "PENDING", verification.state || "", rows[0].id]);
        await db.query("UPDATE tags_google_business_connections SET verification_status=?,updated_at=NOW() WHERE business_id=?", [verification.state === "COMPLETED" ? "verified" : "verification_pending", businessId]);
        await logGoogleAction({ businessId, action: "complete_verification", direction: "tags_to_google", status: "success", responseData: { state: verification.state } });
        return Response.json({ ok: true, verification });
    } catch (error) {
        if (businessId) await logGoogleAction({ businessId, action: "complete_verification", direction: "tags_to_google", status: "error", error }).catch(() => {});
        return googleBusinessError(error);
    }
}
