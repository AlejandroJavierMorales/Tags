import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/app/lib/tags-db";
import { decryptGoogleSecret, encryptGoogleSecret } from "@/app/modules/google-business-profile/server/googleBusinessApi";

const SCOPE = "openid email https://www.googleapis.com/auth/webmasters.readonly";
const API = "https://www.googleapis.com/webmasters/v3";

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) { const error = new Error(`Falta configurar ${name}`); error.status = 503; throw error; }
  return value;
}

function stateSecret() { return required("GOOGLE_BUSINESS_OAUTH_STATE_SECRET"); }

function createState() {
  const payload = Buffer.from(JSON.stringify({ purpose: "search_console", exp: Date.now() + 10 * 60 * 1000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  const signature = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readSearchConsoleState(value) {
  const [payload, signature] = String(value || "").split(".");
  if (!payload || !signature) throw new Error("Estado OAuth inválido");
  const expected = createHmac("sha256", stateSecret()).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error("Firma OAuth inválida");
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (parsed.purpose !== "search_console" || Number(parsed.exp) < Date.now()) throw new Error("La autorización venció");
  return parsed;
}

export function searchConsoleConfigured() {
  return Boolean(process.env.GOOGLE_BUSINESS_CLIENT_ID && process.env.GOOGLE_BUSINESS_CLIENT_SECRET && process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI && process.env.GOOGLE_BUSINESS_TOKEN_ENCRYPTION_KEY && process.env.GOOGLE_BUSINESS_OAUTH_STATE_SECRET);
}

export function searchConsoleAuthorizationUrl() {
  const query = new URLSearchParams({
    client_id: required("GOOGLE_BUSINESS_CLIENT_ID"),
    redirect_uri: required("GOOGLE_SEARCH_CONSOLE_REDIRECT_URI"),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: SCOPE,
    state: createState(),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
}

async function googleJson(url, options = {}) {
  const response = await fetch(url, { ...options, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(payload?.error?.message || payload?.error_description || "Google rechazó la solicitud"); error.status = response.status; throw error; }
  return payload;
}

export async function exchangeSearchConsoleCode(code) {
  return googleJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: required("GOOGLE_BUSINESS_CLIENT_ID"), client_secret: required("GOOGLE_BUSINESS_CLIENT_SECRET"), redirect_uri: required("GOOGLE_SEARCH_CONSOLE_REDIRECT_URI"), grant_type: "authorization_code" }),
  });
}

export async function googleIdentity(accessToken) {
  return googleJson("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
}

export async function listSearchConsoleSites(accessToken) {
  const payload = await googleJson(`${API}/sites`, { headers: { Authorization: `Bearer ${accessToken}` } });
  return payload.siteEntry || [];
}

async function refresh(connection) {
  const refreshToken = decryptGoogleSecret(connection.encrypted_refresh_token);
  if (!refreshToken) { const error = new Error("Search Console debe autorizarse nuevamente"); error.status = 401; throw error; }
  const tokens = await googleJson("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ refresh_token: refreshToken, client_id: required("GOOGLE_BUSINESS_CLIENT_ID"), client_secret: required("GOOGLE_BUSINESS_CLIENT_SECRET"), grant_type: "refresh_token" }) });
  const expiresAt = new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000);
  await db.query("UPDATE tags_search_console_connections SET encrypted_access_token=?,token_expires_at=?,connection_status='connected',last_error=NULL WHERE id=?", [encryptGoogleSecret(tokens.access_token), expiresAt, connection.id]);
  return tokens.access_token;
}

export async function searchConsoleAccess() {
  const [rows] = await db.query("SELECT * FROM tags_search_console_connections WHERE connection_key='platform' LIMIT 1");
  const connection = rows[0];
  if (!connection || connection.connection_status !== "connected") { const error = new Error("Search Console todavía no está conectado"); error.status = 409; throw error; }
  const expires = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  const accessToken = !expires || expires <= Date.now() + 60000 ? await refresh(connection) : decryptGoogleSecret(connection.encrypted_access_token);
  return { connection, accessToken };
}

export async function searchConsoleQuery(accessToken, siteUrl, body) {
  return googleJson(`${API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

function normalizedHost(value) {
  try { return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return String(value || "").toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, ""); }
}

function propertyScore(siteUrl, target) {
  const property = String(siteUrl || "");
  if (property.startsWith("sc-domain:")) {
    const domain = normalizedHost(property.slice(10));
    if (target.host === domain) return 10000 + (target.kind === "custom_domain" ? 1000 : 0);
    if (target.host.endsWith(`.${domain}`)) return 9000 + (target.kind === "custom_domain" ? 1000 : 0);
    return -1;
  }
  const prefix = property.endsWith("/") ? property : `${property}/`;
  return target.url.startsWith(prefix) || target.url === property ? 5000 + prefix.length + (target.kind === "custom_domain" ? 1000 : 0) : -1;
}

export async function searchConsoleScopesForBusiness(connection, businessId) {
  let sites = [];
  try { sites = JSON.parse(connection?.sites_json || "[]"); } catch {}
  if (!businessId) return connection?.selected_site_url ? [{ siteUrl: connection.selected_site_url, pageFilter: null, label: connection.selected_site_url }] : [];

  const [domains, listings] = await Promise.all([
    db.query("SELECT domain FROM tags_domains WHERE business_id=? AND is_active=1 ORDER BY id DESC", [businessId]).then(result => result[0]),
    db.query("SELECT sl.slug,ds.primary_host,ds.name site_name FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id WHERE l.business_id=? AND sl.publication_status='published' ORDER BY sl.id", [businessId]).then(result => result[0]),
  ]);
  const targets = [];
  for (const item of domains) {
    const host = normalizedHost(item.domain);
    if (host) targets.push({ kind: "custom_domain", host, url: `https://${host}/`, label: host });
  }
  for (const item of listings) {
    const host = normalizedHost(item.primary_host);
    if (host) targets.push({ kind: "directory_listing", host, url: `https://${host}/${item.slug}`, label: `${item.site_name} · ${item.slug}` });
  }
  const scopes = [];
  for (const target of targets) {
    const matches = sites.map(site => ({ site, score: propertyScore(site.siteUrl, target) })).filter(item => item.score >= 0).sort((a, b) => b.score - a.score);
    const match = matches[0]?.site;
    if (!match) continue;
    const key = `${match.siteUrl}|${target.url}`;
    if (!scopes.some(item => item.key === key)) scopes.push({ key, siteUrl: match.siteUrl, pageFilter: target.url, label: target.label });
  }
  return scopes.map(({ key, ...scope }) => scope);
}

export async function searchConsoleSummaryForBusiness({ connection, accessToken, businessId, days }) {
  const scopes = await searchConsoleScopesForBusiness(connection, businessId);
  if (!scopes.length) return null;
  const startDate = new Date(Date.now() - Number(days || 30) * 86400000).toISOString().slice(0, 10);
  const endDate = new Date().toISOString().slice(0, 10);
  const results = await Promise.all(scopes.map(async scope => {
    const body = { startDate, endDate, dataState: "all", rowLimit: 1 };
    if (scope.pageFilter) body.dimensionFilterGroups = [{ groupType: "and", filters: [{ dimension: "page", operator: "contains", expression: scope.pageFilter }] }];
    const payload = await searchConsoleQuery(accessToken, scope.siteUrl, body);
    return payload.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  }));
  const totals = results.reduce((total, row) => {
    const impressions = Number(row.impressions || 0);
    total.clicks += Number(row.clicks || 0);
    total.impressions += impressions;
    total.positionWeight += Number(row.position || 0) * impressions;
    return total;
  }, { clicks: 0, impressions: 0, positionWeight: 0 });
  return {
    propertiesUsed: scopes,
    clicks: totals.clicks,
    impressions: totals.impressions,
    ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
    position: totals.impressions ? totals.positionWeight / totals.impressions : 0,
  };
}

export function publicSearchConsoleConnection(connection) {
  if (!connection) return null;
  let sites = [];
  try { sites = JSON.parse(connection.sites_json || "[]"); } catch {}
  return { email: connection.google_user_email, status: connection.connection_status, sites, selectedSiteUrl: connection.selected_site_url, lastError: connection.last_error, updatedAt: connection.updated_at };
}
