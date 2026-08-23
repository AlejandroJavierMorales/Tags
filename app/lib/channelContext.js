import { db } from "@/app/lib/tags-db";

function normalizeHost(value) {
  return String(value || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "");
}

function parseBrandConfig(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function tagsContext(host) {
  return {
    code: "tags",
    siteId: null,
    host,
    name: "Tags",
    isTags: true,
    brandConfig: {
      displayName: "Tags",
      logoUrl: "/logo_tags_transparente.webp",
      slogan: "Plataforma de Gestión y Reporting de Códigos QR",
      primaryColor: "#0fb957",
    },
  };
}

export function getRequestHost(request) {
  return normalizeHost(
    request?.headers?.get("x-tags-public-host") ||
      request?.headers?.get("x-forwarded-host") ||
      request?.headers?.get("host") ||
      (request?.url ? new URL(request.url).host : "")
  );
}

export function getHeadersHost(requestHeaders) {
  return normalizeHost(
    requestHeaders?.get("x-tags-public-host") ||
      requestHeaders?.get("x-forwarded-host") ||
      requestHeaders?.get("host")
  );
}

export function getRequestProtocol(request) {
  const forwarded = String(request?.headers?.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (forwarded === "http" || forwarded === "https") return forwarded;
  try {
    const protocol = new URL(request?.url || "").protocol.replace(":", "");
    if (protocol === "http" || protocol === "https") return protocol;
  } catch {}
  return process.env.NODE_ENV === "development" ? "http" : "https";
}

export function getRequestBaseUrl(request) {
  const protocol = getRequestProtocol(request);
  const host = getRequestHost(request);
  if (host === "localhost" || host.startsWith("127.")) {
    const localHost = String(request?.headers?.get("host") || "localhost:3000").split(",")[0].trim();
    return `${protocol}://${localHost}`;
  }
  if (!host) {
    return String(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL_PROD || "").replace(/\/$/, "");
  }
  return `${protocol}://${host}`;
}

export async function getChannelContextFromHost(rawHost) {
  const host = normalizeHost(rawHost);

  if (!host || host === "localhost" || host.startsWith("127.") || host === "tags.com.ar") {
    return tagsContext(host);
  }

  const [rows] = await db.execute(
    `SELECT id,code,name,primary_host,brand_config
       FROM tags_directory_sites
      WHERE is_active=1`
  );

  // La administración puede haber guardado el host con protocolo, www o slash.
  // Se normalizan ambos lados para que el contexto no dependa del formato almacenado.
  const site = rows.find((item) => normalizeHost(item.primary_host) === host);

  if (!site) {
    return tagsContext(host);
  }

  const brandConfig = parseBrandConfig(site.brand_config);

  return {
    code: site.code,
    siteId: site.id,
    host,
    primaryHost: normalizeHost(site.primary_host),
    name: site.name,
    isTags: site.code === "tags",
    brandConfig,
  };
}

export async function canBusinessAccessChannel({ businessId, channel }) {
  if (!businessId || !channel) return false;
  if (channel.isTags) return true;

  const [rows] = await db.execute(
    `SELECT 1
       FROM tags_business_addons ba
      WHERE ba.business_id=?
        AND ba.addon_code='directory'
        AND ba.status IN ('active','inactive')
        AND (ba.expires_at IS NULL OR ba.expires_at>=NOW())
        AND EXISTS (
          SELECT 1
            FROM tags_directory_listings l
            INNER JOIN tags_directory_site_listings sl
                    ON sl.listing_id=l.id
                   AND sl.site_id=?
           WHERE l.business_id=?
        )
      LIMIT 1`,
    [businessId, channel.siteId, businessId]
  );

  return Boolean(rows.length);
}
