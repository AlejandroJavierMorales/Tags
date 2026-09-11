export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = String(searchParams.get("slug") || "").trim();
  const size = searchParams.get("size") === "512" ? 512 : 192;
  if (!slug) return Response.json({ error: "Icono no encontrado" }, { status: 404 });

  const [rows] = await db.query(
    `SELECT settings_json
       FROM tags_guest_apps
      WHERE BINARY slug=BINARY ? AND status='published'
      LIMIT 1`,
    [slug]
  );
  const settings = parseGuestJson(rows[0]?.settings_json);
  const sourceUrl = size === 512 ? settings.pwaIcon512Url : settings.pwaIcon192Url;
  if (!sourceUrl) return Response.json({ error: "Icono no configurado" }, { status: 404 });

  try {
    const source = await fetch(sourceUrl, { cache: "no-store" });
    if (!source.ok) throw new Error(`Storage respondió ${source.status}`);
    return new Response(source.body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400"
      }
    });
  } catch (error) {
    console.error("GUEST PWA ICON READ ERROR", { slug, size, error: error.message });
    return Response.json({ error: "No se pudo cargar el icono" }, { status: 502 });
  }
}
