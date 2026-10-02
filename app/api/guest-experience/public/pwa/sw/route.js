export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicHost(request) {
  return String(request.headers.get("x-tags-public-host") || request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0].trim().toLowerCase().replace(/^www\./, "").replace(/:\d+$/, "");
}

export async function GET(request) {
  const slug = String(new URL(request.url).searchParams.get("slug") || "").replace(/[^a-zA-Z0-9_-]/g, "-");
  const host = publicHost(request);
  const external = host && host !== "tags.com.ar" && host !== "localhost" && !host.startsWith("127.");
  const basePath = external ? "/mi-estadia" : `/p/${slug}/mi-estadia`;
  const source = `
const TAGS_GUEST_BASE_PATH = ${JSON.stringify(basePath)};
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => event.respondWith(fetch(event.request)));
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(data.title || "Mi Estadía", {
    body: data.body || "Tenés una novedad en tu estadía.",
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    tag: data.tag || "tags-guest-experience",
    data: { url: data.url || "" }
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const section = String(event.notification.data?.url || "").replace(/^\\/+|\\/+$/g, "");
  const target = new URL(TAGS_GUEST_BASE_PATH + (section ? "/" + section : ""), self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
    const existing = clients.find(client => client.url === target);
    if (existing) return existing.focus();
    return self.clients.openWindow(target);
  }));
});
`;
  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/"
    }
  });
}
