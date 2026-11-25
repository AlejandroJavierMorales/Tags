export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";
import { normalizeArgentinaWhatsapp } from "@/app/modules/qr-page/lib/normalizeContactFields";
import { refreshDestinationBusinessProjection } from "@/app/modules/destination-ai/server/refreshDestinationBusinessProjection";

const text = (value, max = 1000) => String(value || "").trim().slice(0, max);
function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  return `+${digits.startsWith("54") ? digits : `54${digits}`}`;
}

async function context(businessId) {
  const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
  if (!access.ok) return { error: Response.json({ error: access.error }, { status: access.status }) };
  const [[plan]] = await db.query("SELECT p.is_free FROM tags_businesses b LEFT JOIN tags_plans p ON p.id=b.plan_id WHERE b.id=? LIMIT 1", [businessId]);
  if (access.session?.role !== "admin" && Number(plan?.is_free) !== 1) return { error: Response.json({ error: "Esta pantalla corresponde al Plan Basic" }, { status: 403 }) };
  return { access };
}

async function responseData(businessId) {
  const [profileResult, placesResult, taxonomyResult] = await Promise.all([
    db.query(`SELECT b.display_name,b.name,b.email,b.phone,b.whatsapp,b.description,b.address,b.latitude,b.longitude,b.logo_url,
      l.id listing_id,sl.slug,sl.site_id,s.primary_host,s.name site_name,
      COALESCE((SELECT bp.place_id FROM tags_business_places bp WHERE bp.business_id=b.id AND bp.relation_type='location' ORDER BY bp.is_primary DESC LIMIT 1),
      (SELECT lp.place_id FROM tags_directory_listing_places lp WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1)) place_id
      FROM tags_businesses b LEFT JOIN tags_directory_listings l ON l.business_id=b.id LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id LEFT JOIN tags_directory_sites s ON s.id=sl.site_id WHERE b.id=? ORDER BY sl.id LIMIT 1`, [businessId]),
    db.query("SELECT id,name FROM tags_geo_places WHERE place_type='locality' AND is_active=1 ORDER BY name"),
    db.query(`SELECT id,parent_id,name,depth,site_id,
      NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=tags_directory_taxonomy_nodes.id AND child.is_active=1) is_leaf
      FROM tags_directory_taxonomy_nodes WHERE is_active=1 ORDER BY depth,name`)
  ]);
  const profile = profileResult[0][0];
  const places = placesResult[0];
  if (!profile) return null;
  const taxonomy = taxonomyResult[0].filter(item => item.site_id == null || Number(item.site_id) === Number(profile.site_id));
  const [assignedResult] = await db.query("SELECT taxonomy_node_id FROM tags_directory_listing_taxonomy WHERE listing_id=? ORDER BY is_primary DESC,sort_order LIMIT 3", [profile.listing_id]);
  return {
    ok: true,
    profile: { email: profile.email || "", phone: profile.phone || "", whatsapp: profile.whatsapp || "", description: profile.description || "", address: profile.address || "", latitude: profile.latitude ?? "", longitude: profile.longitude ?? "", logoUrl: profile.logo_url || "", placeId: profile.place_id ? String(profile.place_id) : "", taxonomyIds: assignedResult.map(item => String(item.taxonomy_node_id)) },
    places,
    taxonomy,
    directoryName: profile.site_name || "Directorio",
    publicUrl: profile.primary_host ? `https://${profile.primary_host}/directorio?q=${encodeURIComponent(profile.display_name || profile.name || "")}#resultados` : null
  };
}

export async function GET(request) {
  const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
  if (!businessId) return Response.json({ error: "Cliente inválido" }, { status: 400 });
  const access = await context(businessId);
  if (access.error) return access.error;
  const result = await responseData(businessId);
  return result ? Response.json(result) : Response.json({ error: "Ficha no encontrada" }, { status: 404 });
}

export async function PATCH(request) {
  const body = await request.json().catch(() => null);
  const businessId = Number(body?.businessId || 0);
  if (!body || !businessId) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  const access = await context(businessId);
  if (access.error) return access.error;

  const email = text(body.email, 190).toLowerCase();
  const phone = normalizePhone(body.phone);
  const whatsapp = normalizeArgentinaWhatsapp(body.whatsapp);
  const description = text(body.description, 1000);
  const address = text(body.address, 500) || null;
  const logoUrl = text(body.logoUrl, 2000) || null;
  const placeId = Number(body.placeId || 0);
  const taxonomyIds = [...new Set((Array.isArray(body.taxonomyIds) ? body.taxonomyIds : []).map(Number).filter(Number.isInteger))].slice(0, 3);
  const latitude = body.latitude === "" || body.latitude == null ? null : Number(body.latitude);
  const longitude = body.longitude === "" || body.longitude == null ? null : Number(body.longitude);
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Ingresá un email válido" }, { status: 400 });
  if (body.phone && (!phone || phone.replace(/\D/g, "").length < 8)) return Response.json({ error: "Ingresá un teléfono válido con código de área" }, { status: 400 });
  if (body.whatsapp && !whatsapp) return Response.json({ error: "Ingresá un WhatsApp argentino válido con código de área" }, { status: 400 });
  if (!description) return Response.json({ error: "La descripción es obligatoria" }, { status: 400 });
  if (!placeId) return Response.json({ error: "Seleccioná una localidad" }, { status: 400 });
  if (!taxonomyIds.length) return Response.json({ error: "Seleccioná al menos un rubro" }, { status: 400 });
  if ((latitude === null) !== (longitude === null) || (latitude !== null && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180))) return Response.json({ error: "Las coordenadas deben ser válidas y cargarse juntas" }, { status: 400 });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [placeResult, duplicateResult, listingsResult] = await Promise.all([
      connection.query("SELECT id FROM tags_geo_places WHERE id=? AND place_type='locality' AND is_active=1 LIMIT 1", [placeId]),
      connection.query("SELECT id FROM tags_businesses WHERE LOWER(email)=? AND id<>? LIMIT 1", [email, businessId]),
      connection.query("SELECT l.id,(SELECT sl.site_id FROM tags_directory_site_listings sl WHERE sl.listing_id=l.id ORDER BY sl.id LIMIT 1) site_id FROM tags_directory_listings l WHERE l.business_id=? LIMIT 1 FOR UPDATE", [businessId])
    ]);
    const place = placeResult[0][0];
    const duplicate = duplicateResult[0][0];
    const listings = listingsResult[0];
    if (!place) { await connection.rollback(); return Response.json({ error: "La localidad no es válida" }, { status: 400 }); }
    if (duplicate) { await connection.rollback(); return Response.json({ error: "Ese email ya pertenece a otro cliente" }, { status: 409 }); }
    const listing = listings[0];
    if (!listing) { await connection.rollback(); return Response.json({ error: "La ficha del Directorio no existe" }, { status: 404 }); }

    const placeholders = taxonomyIds.map(() => "?").join(",");
    const [taxonomyRows] = await connection.query(
      `SELECT n.id FROM tags_directory_taxonomy_nodes n
       WHERE n.id IN (${placeholders}) AND n.is_active=1
         AND (n.site_id IS NULL OR n.site_id=?)
         AND NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1)`,
      [...taxonomyIds, listing.site_id]
    );
    if (taxonomyRows.length !== taxonomyIds.length) { await connection.rollback(); return Response.json({ error: "Seleccioná hasta tres rubros finales válidos" }, { status: 400 }); }

    await connection.query("UPDATE tags_businesses SET email=?,phone=?,whatsapp=?,description=?,address=?,latitude=?,longitude=?,logo_url=?,updated_at=NOW() WHERE id=?", [email, phone, whatsapp || null, description, address, latitude, longitude, logoUrl, businessId]);
    await connection.query("UPDATE tags_directory_listings SET email=?,phone=?,whatsapp=?,short_description=?,description=?,address=?,latitude=?,longitude=?,updated_at=NOW() WHERE id=?", [email, phone, whatsapp || null, description.slice(0, 500), description, address, latitude, longitude, listing.id]);
    await connection.query("DELETE FROM tags_directory_listing_taxonomy WHERE listing_id=?", [listing.id]);
    for (let index = 0; index < taxonomyIds.length; index += 1) {
      await connection.query("INSERT INTO tags_directory_listing_taxonomy (listing_id,taxonomy_node_id,is_primary,sort_order) VALUES (?,?,?,?)", [listing.id, taxonomyIds[index], index === 0 ? 1 : 0, index]);
    }
    await connection.query("DELETE FROM tags_business_places WHERE business_id=? AND relation_type='location'", [businessId]);
    await connection.query("INSERT INTO tags_business_places (business_id,place_id,relation_type,is_primary) VALUES (?,?,'location',1)", [businessId, placeId]);
    await connection.query("DELETE FROM tags_directory_listing_places WHERE listing_id=? AND relation_type='location'", [listing.id]);
    await connection.query("INSERT INTO tags_directory_listing_places (listing_id,place_id,relation_type,is_primary) VALUES (?,?,'location',1)", [listing.id, placeId]);
    const [updatedLogo] = await connection.query("UPDATE tags_directory_media SET url=?,is_active=1 WHERE listing_id=? AND media_type='logo'", [logoUrl, listing.id]);
    if (!updatedLogo.affectedRows) await connection.query("INSERT INTO tags_directory_media (listing_id,media_type,url,alt_text,sort_order,source_payload,is_active) SELECT ?,'logo',?,display_name,0,?,1 FROM tags_directory_listings WHERE id=?", [listing.id, logoUrl, JSON.stringify({ source: "basic_profile" }), listing.id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("BASIC DIRECTORY PROFILE UPDATE ERROR", error);
    return Response.json({ error: "No se pudo actualizar la ficha" }, { status: 500 });
  } finally { connection.release(); }

  await refreshDestinationBusinessProjection(businessId).catch(error => console.error("BASIC DIRECTORY PROFILE PROJECTION ERROR", error));
  return Response.json(await responseData(businessId));
}
