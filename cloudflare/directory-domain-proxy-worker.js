const TAGS_ORIGIN = "https://tags.com.ar";
const DIRECTORY_CHANNEL_HOSTS = new Set(["calamuchita.ar"]);
const ORIGIN_CANONICAL_WWW_HOSTS = new Set(["cabanasecosdelvalle.com.ar"]);

function cleanHost(hostname) {
  return String(hostname || "").toLowerCase().replace(/^www\./, "");
}

function proxyHeaders(request, publicHost) {
  const headers = new Headers(request.headers);
  const cf = request.cf || {};
  headers.set("Host", new URL(TAGS_ORIGIN).hostname);
  headers.set("X-Forwarded-Host", publicHost);
  headers.set("X-Tags-Public-Host", publicHost);
  headers.set("X-Forwarded-Proto", "https");
  const cloudflareIp = request.headers.get("CF-Connecting-IP");
  if (cloudflareIp) headers.set("CF-Connecting-IP", cloudflareIp);
  if (cf.country) headers.set("X-Tags-Geo-Country", String(cf.country));
  if (cf.region) headers.set("X-Tags-Geo-Region", String(cf.region));
  if (cf.city) headers.set("X-Tags-Geo-City", String(cf.city));
  headers.set("X-Tags-Directory-Proxy", "cloudflare");
  return headers;
}


function proxyRequest(request, targetUrl, headers) {
  return new Request(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
}

function rewriteLocation(headers, publicHost) {
  const location = headers.get("Location");
  if (location?.startsWith(TAGS_ORIGIN)) {
    headers.set("Location", location.replace(TAGS_ORIGIN, `https://${publicHost}`));
  }
}

async function resolvePublicFavicon(publicHost) {
  // El canal CalamuchitAr no depende de tags_domains: su branding vive en el
  // Directorio. Se devuelve el logo contextual como favicon directamente.
  if (publicHost === "calamuchita.ar") {
    return fetch(`${TAGS_ORIGIN}/branding/favicons/calamuchitar.ico`, {
      method: "GET",
      cf: { cacheEverything: true, cacheTtl: 86400 },
    });
  }

  const resolverResponse = await fetch(`${TAGS_ORIGIN}/api/public/domain-resolver`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host: publicHost, path: "/" }),
  });
  const resolver = await resolverResponse.json().catch(() => null);
  const faviconUrl = resolver?.success && resolver?.domain?.favicon_url
    ? resolver.domain.favicon_url
    : `${TAGS_ORIGIN}/icon.ico`;
  return fetch(faviconUrl, { method: "GET", redirect: "follow" });
}

async function publicResponse(response, publicHost, pathname) {
  const contentType = response.headers.get("content-type") || "";
  const headers = new Headers(response.headers);
  rewriteLocation(headers, publicHost);

  if (
    pathname === "/login" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/logout") ||
    pathname.startsWith("/suscripcion/")
  ) {
    headers.set("Cache-Control", "private, no-store, max-age=0");
  }

  if (!contentType.includes("text/html")) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  let html = await response.text();
  html = html
    .replace(/(["'=])\/_next\//g, "$1/__tags__/_next/")
    .replace(/(["'=])\/images\//g, "$1/__tags__/images/")
    .replace(/(["'=])\/assets\//g, "$1/__tags__/assets/")
    .replace(/(["'=])\/favicon\.ico/g, "$1/__tags__/favicon.ico")
    .replace(/(["'=])\/icon\.ico/g, "$1/__tags__/icon.ico")
    .replace(/url\(\/_next\/static\/media\//g, "url(/__tags__/_next/static/media/");

  headers.delete("content-length");
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    const cleanPublicHost = cleanHost(url.hostname);
    if (
      url.hostname.toLowerCase().startsWith("www.") &&
      !ORIGIN_CANONICAL_WWW_HOSTS.has(cleanPublicHost)
    ) {
      url.hostname = cleanPublicHost;
      return Response.redirect(url.toString(), 301);
    }

    const publicHost = cleanPublicHost;
    const isDirectoryChannel = DIRECTORY_CHANNEL_HOSTS.has(publicHost);

    // El navegador solicita el favicon en el dominio público, antes de que
    // exista cualquier HTML reescrito por el proxy.
    if (url.pathname === "/favicon.ico" || url.pathname === "/icon.ico") {
      return resolvePublicFavicon(publicHost);
    }

    // URL canónica del Directorio: la plataforma vive en / y las fichas en /[slug].
    if (isDirectoryChannel && (url.pathname === "/directorio" || url.pathname === "/directorio/")) {
      url.pathname = "/";
      return Response.redirect(url.toString(), 301);
    }

    // Recursos reescritos por el proxy. Conserva el funcionamiento existente.
    if (url.pathname.startsWith("/__tags__/") || url.pathname.startsWith("/_next/static/media/")) {
      if (url.pathname === "/__tags__/icon.ico" || url.pathname === "/__tags__/favicon.ico") {
        return resolvePublicFavicon(publicHost);
      }

      const realPath = url.pathname.startsWith("/__tags__/")
        ? url.pathname.replace("/__tags__", "")
        : url.pathname;
      return fetch(proxyRequest(
        request,
        `${TAGS_ORIGIN}${realPath}${url.search}`,
        proxyHeaders(request, publicHost)
      ));
    }

    // Todas las APIs deben conservar el canal, incluidos login y webhooks.
    if (url.pathname.startsWith("/api/")) {
      const response = await fetch(proxyRequest(
        request,
        `${TAGS_ORIGIN}${url.pathname}${url.search}`,
        proxyHeaders(request, publicHost)
      ));
      return publicResponse(response, publicHost, url.pathname);
    }

    // Un Directorio completo conserva su ruta pública. No pasa por el resolver /p/[slug].
    if (isDirectoryChannel) {
      const internalPath = url.pathname === "/" ? "/directorio" : url.pathname;
      const response = await fetch(proxyRequest(
        request,
        `${TAGS_ORIGIN}${internalPath}${url.search}`,
        proxyHeaders(request, publicHost)
      ));
      return publicResponse(response, publicHost, url.pathname);
    }

    // Dominios y subdominios de páginas individuales: comportamiento existente.
    const resolverResponse = await fetch(`${TAGS_ORIGIN}/api/public/domain-resolver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: publicHost, path: url.pathname }),
    });
    const resolver = await resolverResponse.json().catch(() => null);

    if (!resolver?.success) return fetch(request);

    // resolver.target ya contiene el suffix; no debe concatenarse por segunda vez.
    const targetUrl = resolver.origin + resolver.target + url.search;
    const response = await fetch(proxyRequest(
      request,
      targetUrl,
      proxyHeaders(request, publicHost)
    ));
    return publicResponse(response, publicHost, url.pathname);
  },
};
