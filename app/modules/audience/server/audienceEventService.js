import { createHash } from "node:crypto";
import { db } from "@/app/lib/tags-db";
import { getChannelContextFromHost, getRequestHost } from "@/app/lib/channelContext";

const EVENT_TYPES = new Set(["page_view", "action_click", "internal_search", "result_impression", "result_click"]);
const PRIVATE_PREFIXES = ["/api", "/dashboard", "/login", "/mi-cuenta", "/auth"];
const contextCache = new Map();
const CONTEXT_CACHE_MS = 5 * 60 * 1000;

function clean(value, max = 255) {
  const text = String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

function normalizeHost(value) {
  return String(value || "").split(",")[0].trim().toLowerCase().split(":")[0].replace(/^www\./, "");
}

function hashIdentifier(value) {
  const normalized = clean(value, 200);
  if (!normalized) return null;
  const salt = process.env.AUDIENCE_HASH_SECRET || process.env.DB_DATABASE_NAME || "tags-audience";
  return createHash("sha256").update(`${salt}:${normalized}`).digest("hex");
}

function deviceType(userAgent) {
  const value = String(userAgent || "").toLowerCase();
  if (/ipad|tablet|kindle/.test(value)) return "tablet";
  if (/mobile|android|iphone|ipod/.test(value)) return "mobile";
  return value ? "desktop" : "unknown";
}

function publicPath(value) {
  const path = clean(value, 1000) || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

async function resolveContext({ host, path }) {
  const isMuchi = host.startsWith("muchi.") || path === "/muchi" || path.startsWith("/muchi/");
  const channelHost = isMuchi ? host.replace(/^muchi\./, "") : host;
  const channel = await getChannelContextFromHost(channelHost);
  const context = {
    siteId: channel?.siteId || null,
    businessId: null,
    pageId: null,
    listingId: null,
    surface: isMuchi ? "muchi" : channel?.isTags ? "public_page" : "directory_home",
  };

  if (isMuchi) return context;

  const pageMatch = path.match(/^\/p\/([^/?#]+)/);
  if (pageMatch) {
    const slug = decodeURIComponent(pageMatch[1]);
    const [rows] = await db.query(
      `SELECT p.id page_id,p.business_id,p.page_type,l.id listing_id,sl.site_id
         FROM tags_qr_pages p
         LEFT JOIN tags_directory_listings l ON l.qr_page_id=p.id
         LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
        WHERE p.slug=? AND p.status='published'
        ORDER BY (sl.site_id=?) DESC,sl.id ASC LIMIT 1`,
      [slug, context.siteId || 0]
    );
    if (rows[0]) return {
      ...context,
      siteId: rows[0].site_id || context.siteId,
      businessId: rows[0].business_id,
      pageId: rows[0].page_id,
      listingId: rows[0].listing_id || null,
      surface: rows[0].page_type || "qr_page",
    };
  }

  const providerMatch = path.match(/^\/directorio\/prestador\/([^/?#]+)/);
  if (providerMatch) {
    const slug = decodeURIComponent(providerMatch[1]);
    const [rows] = await db.query(
      `SELECT l.id listing_id,l.business_id,l.qr_page_id page_id,sl.site_id
         FROM tags_directory_site_listings sl
         INNER JOIN tags_directory_listings l ON l.id=sl.listing_id
        WHERE sl.slug=? AND (?=0 OR sl.site_id=?) AND sl.publication_status='published'
        ORDER BY (sl.site_id=?) DESC,sl.id ASC LIMIT 1`,
      [slug, context.siteId || 0, context.siteId || 0, context.siteId || 0]
    );
    if (rows[0]) return {
      ...context,
      siteId: rows[0].site_id || context.siteId,
      businessId: rows[0].business_id,
      pageId: rows[0].page_id || null,
      listingId: rows[0].listing_id,
      surface: "directory_listing",
    };
  }

  if (context.siteId && path !== "/" && !path.startsWith("/directorio")) {
    const slug = decodeURIComponent(path.split("/").filter(Boolean)[0] || "");
    if (slug) {
      const [rows] = await db.query(
        `SELECT l.id listing_id,l.business_id,l.qr_page_id page_id
           FROM tags_directory_site_listings sl
           INNER JOIN tags_directory_listings l ON l.id=sl.listing_id
          WHERE sl.site_id=? AND sl.slug=? AND sl.publication_status='published'
          LIMIT 1`,
        [context.siteId, slug]
      );
      if (rows[0]) return {
        ...context,
        businessId: rows[0].business_id,
        pageId: rows[0].page_id || null,
        listingId: rows[0].listing_id,
        surface: "directory_listing",
      };
    }
  }

  if (!context.siteId && host && host !== "tags.com.ar" && host !== "localhost") {
    const [rows] = await db.query(
      `SELECT business_id FROM tags_domains
        WHERE is_active=1 AND (LOWER(domain)=? OR LOWER(domain)=?)
        ORDER BY id DESC LIMIT 1`,
      [host, `www.${host}`]
    );
    if (rows[0]?.business_id) return { ...context, businessId: rows[0].business_id, surface: "business_domain" };
  }

  if (context.siteId && (path === "/" || path.startsWith("/directorio"))) context.surface = "directory_home";
  return context;
}

async function resolveCachedContext({ host, path }) {
  const key = `${host}:${path}`;
  const cached = contextCache.get(key);
  if (cached && Date.now() - cached.createdAt < CONTEXT_CACHE_MS) return cached.value;
  const value = await resolveContext({ host, path });
  if (contextCache.size > 1000) contextCache.clear();
  contextCache.set(key, { createdAt: Date.now(), value });
  return value;
}

async function resolveListingContext(listingId, siteId) {
  const [rows] = await db.query(
    `SELECT l.id listing_id,l.business_id,l.qr_page_id page_id,sl.site_id
       FROM tags_directory_listings l
       LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND (?=0 OR sl.site_id=?)
      WHERE l.id=? ORDER BY (sl.site_id=?) DESC,sl.id ASC LIMIT 1`,
    [siteId || 0, siteId || 0, listingId, siteId || 0]
  );
  return rows[0] || null;
}

export async function recordAudienceEvent(request, body) {
  const eventType = clean(body?.eventType, 40);
  if (!EVENT_TYPES.has(eventType)) return { recorded: false, reason: "invalid_event" };
  const path = publicPath(body?.path);
  if (PRIVATE_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`))) return { recorded: false, reason: "private_path" };
  const host = normalizeHost(getRequestHost(request) || body?.host);
  if (!host) return { recorded: false, reason: "missing_host" };
  const userAgent = request.headers.get("user-agent") || "";
  if (/bot|crawler|spider|slurp|headless|lighthouse/i.test(userAgent)) return { recorded: false, reason: "automated_agent" };
  let context = await resolveCachedContext({ host, path });
  const requestedListingId = Number(body?.listingId || 0);
  if (["result_impression", "result_click"].includes(eventType) && requestedListingId > 0) {
    const listing = await resolveListingContext(requestedListingId, context.siteId);
    if (!listing) return { recorded: false, reason: "invalid_listing" };
    context = {
      ...context,
      siteId: listing.site_id || context.siteId,
      businessId: listing.business_id,
      pageId: listing.page_id || null,
      listingId: listing.listing_id,
      surface: "directory_results",
    };
  }
  const searchQuery = clean(body?.searchQuery, 500);
  const metadata = body?.metadata && typeof body.metadata === "object" ? JSON.stringify(body.metadata).slice(0, 10000) : null;
  await db.query(
    `INSERT INTO tags_audience_events
      (site_id,business_id,page_id,listing_id,event_type,surface,public_host,path,visitor_hash,session_hash,event_key,event_label,target_url,search_query,referrer,utm_source,utm_medium,utm_campaign,device_type,metadata_json,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
    [
      context.siteId, context.businessId, context.pageId, context.listingId, eventType, context.surface,
      host, path, hashIdentifier(body?.visitorId), hashIdentifier(body?.sessionId), clean(body?.eventKey, 120),
      clean(body?.eventLabel, 255), clean(body?.targetUrl, 2000), searchQuery, clean(body?.referrer, 1000),
      clean(body?.utmSource, 190), clean(body?.utmMedium, 190), clean(body?.utmCampaign, 190),
      deviceType(userAgent), metadata,
    ]
  );
  return { recorded: true };
}
