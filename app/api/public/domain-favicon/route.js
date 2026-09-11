import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const host = String(new URL(request.url).searchParams.get("host") || "")
    .toLowerCase().split(":")[0].replace(/^www\./, "").trim();
  if (!host) return Response.json({ success: false, error: "Dominio requerido" }, { status: 400 });
  try {
    const [rows] = await db.query(
      `SELECT favicon_url,logo_url,site_name
         FROM tags_domains
        WHERE is_active=1 AND (LOWER(domain)=? OR LOWER(domain)=?)
        ORDER BY id DESC LIMIT 1`,
      [host, `www.${host}`]
    );
    return Response.json({ success: true, favicon_url: rows[0]?.favicon_url || rows[0]?.logo_url || null, logo_url: rows[0]?.logo_url || null, site_name: rows[0]?.site_name || null });
  } catch (error) {
    console.error("PUBLIC DOMAIN FAVICON ERROR", { code: error?.code, message: error?.message });
    return Response.json({ success: false, error: "No se pudo consultar el branding" }, { status: 500 });
  }
}
