import { db } from "@/app/lib/tags-db";
import { getRequestBaseUrl } from "@/app/lib/channelContext";
import { encryptGoogleSecret } from "@/app/modules/google-business-profile/server/googleBusinessApi";
import { exchangeSearchConsoleCode, googleIdentity, listSearchConsoleSites, readSearchConsoleState } from "@/app/modules/audience/server/searchConsoleApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dashboard(request, status) {
  let publicBase = getRequestBaseUrl(request);
  try {
    publicBase = new URL(process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI).origin;
  } catch {}
  const target = new URL("/dashboard/pwa-installations", publicBase);
  target.searchParams.set("searchConsole", status);
  return Response.redirect(target);
}

export async function GET(request) {
  const url = new URL(request.url);
  try {
    readSearchConsoleState(url.searchParams.get("state"));
    if (url.searchParams.get("error")) return dashboard(request, "cancelled");
    const code = url.searchParams.get("code");
    if (!code) return dashboard(request, "missing_code");
    const tokens = await exchangeSearchConsoleCode(code);
    const [identity, sites, existingRows] = await Promise.all([
      googleIdentity(tokens.access_token).catch(() => ({})),
      listSearchConsoleSites(tokens.access_token),
      db.query("SELECT encrypted_refresh_token,selected_site_url FROM tags_search_console_connections WHERE connection_key='platform' LIMIT 1").then(result => result[0]),
    ]);
    const existing = existingRows[0];
    const refreshToken = tokens.refresh_token ? encryptGoogleSecret(tokens.refresh_token) : existing?.encrypted_refresh_token || null;
    const expiresAt = new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000);
    const selected = sites.some(item => item.siteUrl === existing?.selected_site_url) ? existing.selected_site_url : sites[0]?.siteUrl || null;
    await db.query(`INSERT INTO tags_search_console_connections (connection_key,google_user_email,encrypted_access_token,encrypted_refresh_token,token_expires_at,granted_scope,sites_json,selected_site_url,connection_status,last_error) VALUES ('platform',?,?,?,?,?,?,?,'connected',NULL) ON DUPLICATE KEY UPDATE google_user_email=VALUES(google_user_email),encrypted_access_token=VALUES(encrypted_access_token),encrypted_refresh_token=VALUES(encrypted_refresh_token),token_expires_at=VALUES(token_expires_at),granted_scope=VALUES(granted_scope),sites_json=VALUES(sites_json),selected_site_url=VALUES(selected_site_url),connection_status='connected',last_error=NULL`, [identity.email || null,encryptGoogleSecret(tokens.access_token),refreshToken,expiresAt,tokens.scope || null,JSON.stringify(sites),selected]);
    return dashboard(request, "connected");
  } catch (error) {
    console.error("SEARCH CONSOLE CALLBACK ERROR", error);
    await db.query("UPDATE tags_search_console_connections SET connection_status='error',last_error=? WHERE connection_key='platform'", [String(error.message).slice(0,1500)]).catch(() => {});
    return dashboard(request, "error");
  }
}
