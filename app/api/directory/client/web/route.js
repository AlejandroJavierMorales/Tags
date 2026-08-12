export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";
import { normalizeArgentinaWhatsapp, normalizeWebsite, normalizeSocialUser } from "@/app/modules/qr-page/lib/normalizeContactFields";

function text(value, max = 10000) {
  return String(value || "").trim().slice(0, max) || null;
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const businessId = Number(body?.businessId || 0);
  const pageId = Number(body?.pageId || 0);
  if (!body || !businessId || !pageId) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });

  const title = text(body.title, 190);
  if (!title) return Response.json({ error: "El nombre público es obligatorio" }, { status: 400 });
  const description = text(body.description, 50000);
  const email = text(body.email, 190);
  const phone = text(body.phone, 80);
  const whatsapp = normalizeArgentinaWhatsapp(body.whatsapp);
  const website = normalizeWebsite(body.website_url);
  const instagram = normalizeSocialUser("instagram", body.instagram_url);
  const facebook = normalizeSocialUser("facebook", body.facebook_url);
  const address = text(body.address, 500);
  const logoUrl = text(body.logo_url, 2000);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [pages] = await connection.query("SELECT id FROM tags_qr_pages WHERE id=? AND business_id=? AND page_type='directory' LIMIT 1 FOR UPDATE", [pageId, businessId]);
    if (!pages.length) {
      await connection.rollback();
      return Response.json({ error: "Web Directory no encontrada" }, { status: 404 });
    }
    const [listings] = await connection.query("SELECT id FROM tags_directory_listings WHERE business_id=? AND qr_page_id=? LIMIT 1 FOR UPDATE", [businessId, pageId]);
    if (!listings.length) {
      await connection.rollback();
      return Response.json({ error: "La Web no está vinculada con su ficha" }, { status: 409 });
    }
    await connection.query(
      `UPDATE tags_qr_pages SET title=?,description=?,logo_url=?,email=?,phone=?,whatsapp=?,address=?,website_url=?,instagram_url=?,facebook_url=?,seo_title=COALESCE(NULLIF(seo_title,''),?),seo_description=?,updated_at=NOW() WHERE id=? AND business_id=?`,
      [title, description, logoUrl, email, phone, whatsapp, address, website, instagram, facebook, title, description, pageId, businessId]
    );
    await connection.query(
      `UPDATE tags_directory_listings SET display_name=?,short_description=?,description=?,email=?,phone=?,whatsapp=?,website_url=?,address=?,social_config=?,updated_at=NOW() WHERE id=? AND business_id=?`,
      [title, description?.slice(0, 500) || null, description, email, phone, whatsapp, website, address, JSON.stringify({ instagram: instagram || null, facebook: facebook || null }), listings[0].id, businessId]
    );
    await connection.commit();
    return Response.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    console.error("DIRECTORY CLIENT WEB UPDATE ERROR:", error);
    return Response.json({ error: error.message || "No se pudo guardar la Web" }, { status: 500 });
  } finally {
    connection.release();
  }
}
