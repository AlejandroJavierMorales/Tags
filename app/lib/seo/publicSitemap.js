import { headers } from "next/headers";
import { db } from "@/app/lib/tags-db";
import { getHeadersHost } from "@/app/lib/channelContext";
import { getDirectorySiteByCode, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getDirectoryLocalitySitemapPaths } from "@/app/modules/directory/lib/getDirectoryLocalityPageData";
import { tagsSiteConfig } from "@/app/config/configSite";

const TAGS_HOSTS = new Set(["tags.com.ar", "www.tags.com.ar"]);

const DIRECTORY_PATHS = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/alojamientos", priority: 0.85, changeFrequency: "daily" },
  { path: "/donde-comer", priority: 0.85, changeFrequency: "daily" },
  { path: "/actividades-turisticas", priority: 0.85, changeFrequency: "daily" },
  { path: "/regalos-artesanias-regionales", priority: 0.8, changeFrequency: "daily" },
  { path: "/beneficios", priority: 0.8, changeFrequency: "daily" },
];

function normalizeHost(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(",")[0]
    .split(":")[0]
    .replace(/^www\./, "");
}

function baseUrlForHost(host) {
  const normalized = normalizeHost(host);
  if (!normalized) {
    return String(tagsSiteConfig.site.url || "http://localhost:3000").replace(/\/$/, "");
  }
  if (normalized === "localhost" || normalized.startsWith("127.")) {
    return "http://localhost:3000";
  }
  return `https://${normalized}`;
}

function route(baseUrl, path, lastModified, priority, changeFrequency) {
  return {
    url: `${baseUrl}${path || ""}`,
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    priority,
    changeFrequency,
  };
}

export async function getPublicSitemapContext() {
  const requestHeaders = await headers();
  const host = normalizeHost(getHeadersHost(requestHeaders));
  const isTags = !host || TAGS_HOSTS.has(host) || host === "localhost" || host.startsWith("127.");
  if (isTags) return { host: host || "tags.com.ar", baseUrl: baseUrlForHost(host || "tags.com.ar"), isTags: true, site: null };

  const siteCode = await getDirectorySiteCodeByHost(host);
  const site = await getDirectorySiteByCode(siteCode);
  if (!site || normalizeHost(site.primary_host) !== host) {
    return {
      host: "tags.com.ar",
      baseUrl: baseUrlForHost("tags.com.ar"),
      isTags: true,
      site: null,
    };
  }
  return { host, baseUrl: baseUrlForHost(host), isTags: false, site };
}

export async function getPublicSitemapEntries(context) {
  context = context || await getPublicSitemapContext();
  const now = new Date();

  if (context.isTags) {
    const staticRoutes = [
      { path: "", priority: 1, changeFrequency: "weekly" },
      { path: "/qr-inteligente", priority: 0.95, changeFrequency: "weekly" },
      { path: "/qr-page", priority: 0.95, changeFrequency: "weekly" },
      { path: "/tags-id", priority: 0.95, changeFrequency: "weekly" },
      { path: "/tags-reviews", priority: 0.95, changeFrequency: "weekly" },
      { path: "/e-events", priority: 0.95, changeFrequency: "weekly" },
      { path: "/store-products", priority: 0.9, changeFrequency: "weekly" },
      { path: "/demo", priority: 0.85, changeFrequency: "weekly" },
      { path: "/contact", priority: 0.8, changeFrequency: "monthly" },
    ];

    const [pages] = await db.query(`
      SELECT DISTINCT slug, updated_at
      FROM tags_qr_pages
      WHERE status='published'
        AND robots_index=1
        AND (page_type IS NULL OR page_type <> 'directory')
        AND slug IS NOT NULL
        AND slug <> ''
        AND (page_type IS NULL OR page_type NOT IN ('store_product','payment','checkout','order','reservation'))
      ORDER BY updated_at DESC
    `);

    return [
      ...staticRoutes.map((item) => route(context.baseUrl, item.path, now, item.priority, item.changeFrequency)),
      ...pages.map((page) => route(context.baseUrl, `/p/${page.slug}`, page.updated_at, 0.75, "weekly")),
    ];
  }

  const staticRoutes = DIRECTORY_PATHS.map((item) => route(context.baseUrl, item.path, now, item.priority, item.changeFrequency));
  const localityPaths = await getDirectoryLocalitySitemapPaths(context.site.code);
  const [listings] = await db.query(`
    SELECT sl.slug, sl.updated_at, l.updated_at AS listing_updated_at
    FROM tags_directory_site_listings sl
    INNER JOIN tags_directory_listings l ON l.id=sl.listing_id
    INNER JOIN tags_qr_pages p ON p.id=l.qr_page_id AND p.business_id=l.business_id
    WHERE sl.site_id=?
      AND sl.publication_status='published'
      AND l.status='published'
      AND p.status='published'
      AND sl.slug IS NOT NULL
      AND sl.slug <> ''
    ORDER BY sl.updated_at DESC
  `, [context.site.id]);

  return [
    ...staticRoutes,
    ...localityPaths.map((path) => route(context.baseUrl, path, now, 0.75, "daily")),
    ...listings.map((listing) => route(context.baseUrl, `/${listing.slug}`, listing.updated_at || listing.listing_updated_at, 0.8, "weekly")),
  ];
}

export function sitemapEntriesToXml(entries) {
  const escapeXml = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((entry) => `  <url><loc>${escapeXml(entry.url)}</loc><lastmod>${new Date(entry.lastModified).toISOString()}</lastmod><changefreq>${entry.changeFrequency}</changefreq><priority>${entry.priority}</priority></url>`).join("\n")}\n</urlset>`;
}

export function getSitemapUrl(context) {
  return `${context.baseUrl}/sitemap.xml`;
}

export async function getDirectoryChannelMetadata({ path, title, description, forceNoindex = false }) {
  const context = await getPublicSitemapContext();
  const indexable = !forceNoindex && !context.isTags;
  return {
    metadataBase: new URL(context.baseUrl),
    title,
    description,
    alternates: { canonical: new URL(path, `${context.baseUrl}/`).toString() },
    robots: {
      index: indexable,
      follow: indexable,
      googleBot: {
        index: indexable,
        follow: indexable,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}
