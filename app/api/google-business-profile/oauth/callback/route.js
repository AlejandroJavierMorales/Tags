import { db } from "@/app/lib/tags-db";
import { encryptGoogleSecret, exchangeGoogleCode, getGoogleUserEmail, listGoogleAccounts, logGoogleAction, readOAuthState } from "@/app/modules/google-business-profile/server/googleBusinessApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dashboard(request, businessId, status, returnOrigin = "") {
    const target = new URL(`/dashboard/businesses/${businessId}/google-business-profile`, returnOrigin || request.url);
    target.searchParams.set("google", status);
    return Response.redirect(target);
}

export async function GET(request) {
    const url = new URL(request.url);
    let businessId = 0;
    let returnOrigin = "";
    try {
        const state = readOAuthState(url.searchParams.get("state"));
        businessId = Number(state.businessId);
        returnOrigin = state.returnOrigin || "";
        const [businessRows] = await db.query("SELECT id FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
        if (!businessRows[0]) return dashboard(request, businessId, "unauthorized", returnOrigin);
        if (url.searchParams.get("error")) return dashboard(request, businessId, "cancelled", returnOrigin);
        const code = url.searchParams.get("code");
        if (!code) return dashboard(request, businessId, "missing_code", returnOrigin);
        const tokens = await exchangeGoogleCode(code);
        const [email, accounts] = await Promise.all([
            getGoogleUserEmail(tokens.access_token).catch(() => null),
            listGoogleAccounts(tokens.access_token)
        ]);
        const expiresAt = new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000);
        const [existing] = await db.query("SELECT encrypted_refresh_token FROM tags_google_business_connections WHERE business_id=? LIMIT 1", [businessId]);
        const refreshToken = tokens.refresh_token ? encryptGoogleSecret(tokens.refresh_token) : existing[0]?.encrypted_refresh_token || null;
        await db.query(
            `INSERT INTO tags_google_business_connections
                (business_id,google_user_email,connection_status,encrypted_access_token,encrypted_refresh_token,token_expires_at,granted_scope,accounts_json,last_error)
             VALUES (?,?,'connected',?,?,?,?,?,NULL)
             ON DUPLICATE KEY UPDATE google_user_email=VALUES(google_user_email),connection_status='connected',encrypted_access_token=VALUES(encrypted_access_token),encrypted_refresh_token=VALUES(encrypted_refresh_token),token_expires_at=VALUES(token_expires_at),granted_scope=VALUES(granted_scope),accounts_json=VALUES(accounts_json),last_error=NULL,updated_at=NOW()`,
            [businessId, email, encryptGoogleSecret(tokens.access_token), refreshToken, expiresAt, tokens.scope || null, JSON.stringify(accounts)]
        );
        await logGoogleAction({ businessId, action: "oauth_connect", direction: "google_to_tags", status: "success", responseData: { email, accountCount: accounts.length } });
        return dashboard(request, businessId, "connected", returnOrigin);
    } catch (error) {
        console.error("GOOGLE BUSINESS OAUTH CALLBACK ERROR", error.message);
        if (businessId) {
            await db.query("UPDATE tags_google_business_connections SET connection_status='error',last_error=? WHERE business_id=?", [String(error.message).slice(0, 1000), businessId]).catch(() => {});
            await logGoogleAction({ businessId, action: "oauth_connect", status: "error", error }).catch(() => {});
        }
        return dashboard(request, businessId || 0, "error", returnOrigin);
    }
}
