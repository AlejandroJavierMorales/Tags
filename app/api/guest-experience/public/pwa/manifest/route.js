export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";

function publicHost(request) {
  return String(
    request.headers.get("x-tags-public-host")
      || request.headers.get("x-forwarded-host")
      || request.headers.get("host")
      || ""
  ).split(",")[0].trim().toLowerCase().replace(/^www\./, "");
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = String(searchParams.get("slug") || "").trim();
  if (!slug) return Response.json({ error: "Mi Estadía no encontrada" }, { status: 404 });

  const [rows] = await db.query(
    `SELECT business_id,name,settings_json
       FROM tags_guest_apps
      WHERE BINARY slug=BINARY ? AND status='published'
      LIMIT 1`,
    [slug]
  );
  const app = rows[0];
  if (!app) return Response.json({ error: "Mi Estadía no encontrada" }, { status: 404 });

  const settings = parseGuestJson(app.settings_json);
  if (!settings.pwaIcon192Url || !settings.pwaIcon512Url) {
    return Response.json({ error: "Icono de instalación no configurado" }, { status: 404 });
  }

  const host = publicHost(request);
  const external = host && host !== "tags.com.ar" && host !== "localhost" && !host.startsWith("127.");
  const basePath = external ? "/mi-estadia" : `/p/${slug}/mi-estadia`;
  const iconEndpoint = "/api/guest-experience/public/pwa/icon";

  const manifest = {
    name: `Mi Estadía | ${app.name || "Tu alojamiento"}`,
    short_name: "Mi Estadía",
    description: `Información y servicios para tu estadía en ${app.name || "tu alojamiento"}.`,
    lang: "es-AR",
    start_url: basePath,
    scope: basePath,
    id: basePath,
    display: "standalone",
    background_color: "#f4f7f5",
    theme_color: "#173a2d",
    icons: [
      { src: `${iconEndpoint}?slug=${encodeURIComponent(slug)}&size=192`, sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: `${iconEndpoint}?slug=${encodeURIComponent(slug)}&size=512`, sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ]
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
