export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";
import { normalizeArgentinaWhatsapp, normalizeWebsite, normalizeSocialUser } from "@/app/modules/qr-page/lib/normalizeContactFields";

const clean = (value, max = 50000) => String(value || "").trim().slice(0, max) || null;

async function accessFor(businessId) {
  return requireQRPageAccess(businessId, { skipQRPageValidation: true });
}

async function profilePayload(businessId) {
  const [businessRows, places, selected] = await Promise.all([
    db.query("SELECT id,name,COALESCE(NULLIF(display_name,''),name) AS display_name,email,phone,description,logo_url,cover_url,whatsapp,address,postal_code,latitude,longitude,website_url,instagram_url,facebook_url,tiktok_url,youtube_url,linkedin_url,google_reviews_url,maps_url FROM tags_businesses WHERE id=? LIMIT 1", [businessId]),
    db.query("SELECT id,parent_id,place_type,name,slug,country_code,latitude,longitude FROM tags_geo_places WHERE is_active=1 ORDER BY name"),
    db.query("SELECT bp.place_id,bp.relation_type,bp.is_primary FROM tags_business_places bp WHERE bp.business_id=? ORDER BY bp.is_primary DESC,bp.place_id", [businessId])
  ]);
  return { business: businessRows[0][0] || null, places: places[0], selectedPlaces: selected[0] };
}

export async function GET(request) {
  const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
  if (!businessId) return Response.json({ error: "businessId requerido" }, { status: 400 });
  const access = await accessFor(businessId);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
  return Response.json({ ok: true, ...(await profilePayload(businessId)) });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const businessId = Number(body?.businessId || 0);
  if (!body || !businessId) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  const access = await accessFor(businessId);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });

  const displayName = clean(body.displayName, 255);
  const email = clean(body.email, 255)?.toLowerCase();
  if (!displayName || !email || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Nombre y email válido son obligatorios" }, { status: 400 });
  const primaryPlaceId = Number(body.primaryPlaceId || 0) || null;
  const latitude = body.latitude === "" || body.latitude == null ? null : Number(body.latitude);
  const longitude = body.longitude === "" || body.longitude == null ? null : Number(body.longitude);
  if ((latitude != null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) || (longitude != null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) return Response.json({ error: "Coordenadas inválidas" }, { status: 400 });

  const values = {
    description: clean(body.description), logo: clean(body.logoUrl, 2000), cover: clean(body.coverUrl, 2000), phone: clean(body.phone, 50),
    whatsapp: normalizeArgentinaWhatsapp(body.whatsapp), address: clean(body.address, 1000), postalCode: clean(body.postalCode, 32),
    website: normalizeWebsite(body.websiteUrl), instagram: normalizeSocialUser("instagram", body.instagramUrl), facebook: normalizeSocialUser("facebook", body.facebookUrl)
  };
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (primaryPlaceId) {
      const [placeRows] = await connection.query("SELECT id,place_type FROM tags_geo_places WHERE id=? AND is_active=1 LIMIT 1", [primaryPlaceId]);
      if (!placeRows.length || placeRows[0].place_type !== "locality") {
        await connection.rollback();
        return Response.json({ error: "Seleccioná una localidad válida" }, { status: 400 });
      }
    }
    await connection.query(
      `UPDATE tags_businesses SET display_name=?,email=?,phone=?,description=?,logo_url=?,cover_url=?,whatsapp=?,address=?,postal_code=?,latitude=?,longitude=?,website_url=?,instagram_url=?,facebook_url=?,updated_at=NOW() WHERE id=?`,
      [displayName,email,values.phone,values.description,values.logo,values.cover,values.whatsapp,values.address,values.postalCode,latitude,longitude,values.website,values.instagram,values.facebook,businessId]
    );
    await connection.query(
      `UPDATE tags_stores
       SET logo_url=?,cover_url=?,email=?,whatsapp=?,address=?,updated_at=NOW()
       WHERE business_id=?`,
      [values.logo,values.cover,email,values.whatsapp,values.address,businessId]
    );
    await connection.query(
      `UPDATE tags_client_review_forms
       SET logo_url=?,updated_at=NOW()
       WHERE business_id=?`,
      [values.logo,businessId]
    );
    await connection.query(
      `UPDATE tags_qr_pages
       SET logo_url=?,email=?,phone=?,whatsapp=?,address=?,website_url=?,instagram_url=?,facebook_url=?,updated_at=NOW()
       WHERE business_id=? AND page_type='client_reviews'`,
      [values.logo,email,values.phone,values.whatsapp,values.address,values.website,values.instagram,values.facebook,businessId]
    );
    await connection.query("DELETE FROM tags_business_places WHERE business_id=? AND relation_type='location'", [businessId]);
    if (primaryPlaceId) await connection.query("INSERT INTO tags_business_places (business_id,place_id,relation_type,is_primary) VALUES (?,?,'location',1)", [businessId,primaryPlaceId]);

    const [listingRows] = await connection.query("SELECT id,qr_page_id FROM tags_directory_listings WHERE business_id=? LIMIT 1", [businessId]);
    if (listingRows.length) {
      const listing = listingRows[0];
      await connection.query(
        `UPDATE tags_directory_listings SET display_name=?,short_description=?,description=?,email=?,phone=?,whatsapp=?,website_url=?,address=?,latitude=?,longitude=?,social_config=?,updated_at=NOW() WHERE id=?`,
        [displayName,values.description?.slice(0,500)||null,values.description,email,values.phone,values.whatsapp,values.website,values.address,latitude,longitude,JSON.stringify({instagram:values.instagram||null,facebook:values.facebook||null}),listing.id]
      );
      await connection.query("DELETE FROM tags_directory_listing_places WHERE listing_id=? AND relation_type='location'", [listing.id]);
      if (primaryPlaceId) await connection.query("INSERT INTO tags_directory_listing_places (listing_id,place_id,relation_type,is_primary) VALUES (?,?,'location',1)", [listing.id,primaryPlaceId]);
      if (listing.qr_page_id) await connection.query(
        `UPDATE tags_qr_pages SET title=?,description=?,logo_url=?,cover_image_url=?,email=?,phone=?,whatsapp=?,address=?,website_url=?,instagram_url=?,facebook_url=?,seo_title=COALESCE(NULLIF(seo_title,''),?),seo_description=?,updated_at=NOW() WHERE id=? AND business_id=? AND page_type='directory'`,
        [displayName,values.description,values.logo,values.cover,email,values.phone,values.whatsapp,values.address,values.website,values.instagram,values.facebook,displayName,values.description,listing.qr_page_id,businessId]
      );
    }
    await connection.commit();
    return Response.json({ ok: true, ...(await profilePayload(businessId)) });
  } catch (error) {
    await connection.rollback();
    console.error("BUSINESS PROFILE UPDATE ERROR:", error);
    return Response.json({ error: error.message || "No se pudo guardar el perfil" }, { status: 500 });
  } finally { connection.release(); }
}
