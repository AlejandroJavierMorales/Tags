self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("push", event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "Tags", {
    body: data.body || "Tenés una nueva notificación.",
    icon: data.icon || "/logo_tags_transparente.webp",
    badge: data.badge || "/logo_tags_transparente.webp",
    tag: data.tag || "tags-notification",
    data: { url: data.url || "/dashboard" }
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => new URL(client.url).origin === new URL(target).origin);
    if (!existing) return self.clients.openWindow(target);
    return existing.navigate(target).then(client => client.focus());
  }));
});
