import crypto from "node:crypto";
import { db } from "../../../lib/tags-db.js";
import { extractPublishedCapacity } from "./destinationCapacity.js";
import { collectBusinessPublicKnowledge } from "./collectBusinessPublicKnowledge.js";

const OPTIONAL_SCHEMA_ERRORS = new Set(["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"]);

function clean(value, max = 50000) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalized(value) {
  return clean(value, 190).toLocaleLowerCase("es-AR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function coordinates(latitude, longitude, directoryConfig) {
  const lat = numberOrNull(latitude), lon = numberOrNull(longitude);
  if (lat == null || lon == null || lat < -90 || lat > 90 || lon < -180 || lon > 180 || (!lat && !lon)) return [null, null];
  const bounds = parseJson(directoryConfig).geographicBounds;
  if (bounds && [bounds.south, bounds.north, bounds.west, bounds.east].every(value => Number.isFinite(Number(value)))) {
    if (lat < Number(bounds.south) || lat > Number(bounds.north) || lon < Number(bounds.west) || lon > Number(bounds.east)) return [null, null];
  }
  return [lat, lon];
}

async function loadItems(connection, businessId) {
  const [qrProducts] = await connection.query(`
    SELECT l.id listing_id,p.id source_id,'qr_product' source_type,'product' item_type,p.title name,p.description,
           p.category category_text,p.price,NULL sale_price,p.currency,'unknown' stock_status,p.button_url public_url,
           p.image_url,NULL seo_title,p.seo_description,p.updated_at source_updated_at
      FROM tags_qr_page_products p
      INNER JOIN tags_qr_pages page ON page.id=p.page_id AND page.status='published'
      INNER JOIN tags_directory_listings l ON l.business_id=page.business_id AND l.business_id=?
     WHERE l.status='published' AND p.is_visible=1`, [businessId]);
  const [storeProducts] = await connection.query(`
    SELECT l.id listing_id,p.id source_id,'store_product' source_type,IF(st.app_type='resto','dish','product') item_type,
           p.title name,p.description,c.name category_text,p.price,p.sale_price,p.currency,
           IF(p.stock_enabled=0,'unknown',IF(p.stock_qty>0,'available','unavailable')) stock_status,NULL public_url,
           (SELECT i.image_url FROM tags_store_product_images i WHERE i.product_id=p.id ORDER BY i.is_primary DESC,i.sort_order,i.id LIMIT 1) image_url,
           p.seo_title,p.seo_description,p.updated_at source_updated_at
      FROM tags_store_products p
      INNER JOIN tags_stores st ON st.id=p.store_id AND st.business_id=? AND st.status='published'
      LEFT JOIN tags_store_categories c ON c.id=p.category_id AND c.is_visible=1
      INNER JOIN tags_directory_listings l ON l.business_id=st.business_id AND l.status='published'
     WHERE p.is_visible=1 AND p.status='published'`, [businessId]);
  const [services] = await connection.query(`
    SELECT l.id listing_id,s.id source_id,'turnos_service' source_type,
           IF(a.business_profile_code='activities','experience','service') item_type,s.name,s.description,c.name category_text,
           s.price,NULL sale_price,s.currency,'unknown' stock_status,CONCAT('/turnos/',a.slug) public_url,s.image_url,
           NULL seo_title,NULL seo_description,s.updated_at source_updated_at
      FROM tags_turnos_services s
      INNER JOIN tags_turnos_apps a ON a.id=s.turnos_id AND a.business_id=? AND a.status='published'
      LEFT JOIN tags_turnos_service_categories c ON c.id=s.category_id AND c.is_visible=1
      INNER JOIN tags_directory_listings l ON l.business_id=a.business_id AND l.status='published'
     WHERE s.is_active=1 AND s.is_visible=1`, [businessId]);
  return [...qrProducts, ...storeProducts, ...services];
}

export async function refreshDestinationBusinessProjection(businessId) {
  const id = Number(businessId || 0);
  if (!id) return { available: true, locations: 0, items: 0 };
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE tags_ai_search_locations SET visibility='stale',indexed_at=NOW() WHERE business_id=?", [id]);
    await connection.query("UPDATE tags_ai_search_items SET visibility='stale',indexed_at=NOW() WHERE business_id=?", [id]);

    const [locations] = await connection.query(`
      SELECT ds.id site_id,ds.primary_host,ds.directory_config,l.id listing_id,l.business_id,l.qr_page_id,
             sl.slug,sl.is_free,sl.is_featured,COALESCE(NULLIF(b.display_name,''),NULLIF(b.name,''),l.display_name) name,
             (qp.id IS NOT NULL) has_published_web,
             EXISTS(
               SELECT 1 FROM tags_subscriptions subscription
               WHERE subscription.business_id=l.business_id
                 AND subscription.id=(SELECT MAX(latest.id) FROM tags_subscriptions latest WHERE latest.business_id=l.business_id)
                 AND subscription.status IN ('active','trial','past_due')
                 AND (subscription.auto_disable_on_expire=0 OR subscription.expires_at IS NULL
                   OR DATE_ADD(subscription.expires_at,INTERVAL COALESCE(subscription.grace_days,0) DAY)>=NOW()
                   OR subscription.admin_override_until>=NOW())
             ) has_active_subscription,
             COALESCE(NULLIF(l.short_description,''),NULLIF(l.description,''),b.description) summary,
             l.short_description,l.description,b.description business_description,sl.seo_title,sl.seo_description,sl.seo_keywords,
             qp.title page_title,qp.description page_description,qp.seo_title page_seo_title,qp.seo_description page_seo_description,
             gp.id locality_id,gp.name locality_name,COALESCE(l.address,b.address) address,
             COALESCE(l.latitude,b.latitude) latitude,COALESCE(l.longitude,b.longitude) longitude,
             COALESCE(l.phone,b.phone) phone,COALESCE(l.whatsapp,b.whatsapp) whatsapp,COALESCE(l.website_url,b.website_url) website_url,
             COALESCE((SELECT m.url FROM tags_directory_media m WHERE m.listing_id=l.id AND m.is_active=1 ORDER BY FIELD(m.media_type,'cover','gallery','logo'),m.sort_order,m.id LIMIT 1),b.cover_url,b.logo_url) image_url,
             GREATEST(l.updated_at,sl.updated_at,COALESCE(b.updated_at,l.updated_at),COALESCE(qp.updated_at,l.updated_at)) source_updated_at
        FROM tags_directory_listings l
        INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
        INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id AND ds.is_active=1
        LEFT JOIN tags_businesses b ON b.id=l.business_id
        LEFT JOIN tags_qr_pages qp ON qp.id=l.qr_page_id AND qp.status='published'
        LEFT JOIN tags_directory_listing_places lp ON lp.listing_id=l.id AND lp.relation_type='location' AND lp.is_primary=1
        LEFT JOIN tags_geo_places gp ON gp.id=lp.place_id AND gp.is_active=1
       WHERE l.business_id=? AND l.status='published'`, [id]);
    const sourceItems = locations.length ? await loadItems(connection, id) : [];
    let itemCount = 0;

    for (const row of locations) {
      const publicKnowledge = await collectBusinessPublicKnowledge(connection, { businessId: id, siteId: row.site_id });
      const offerText = clean([
        row.short_description,row.description,row.business_description,row.seo_title,row.seo_description,row.seo_keywords,
        row.page_title,row.page_description,row.page_seo_title,row.page_seo_description,
        publicKnowledge.text,
      ].filter(Boolean).join(" | ")) || null;
      const [latitude, longitude] = coordinates(row.latitude, row.longitude, row.directory_config);
      const projection = { name:clean(row.name,255),summary:clean(row.summary,10000)||null,offerText,knowledgeSources:publicKnowledge.sourceTypes,latitude,longitude,imageUrl:clean(row.image_url,2000)||null };
      const publicUrl = row.primary_host && row.slug ? `https://${clean(row.primary_host,255).replace(/^https?:\/\//i,"").replace(/\/$/,"")}/${row.slug}` : null;
      const qualityScore = [projection.summary,row.locality_name,projection.imageUrl,row.phone||row.whatsapp,latitude!=null&&longitude!=null].filter(Boolean).length*20;
      const [upsert] = await connection.query(`INSERT INTO tags_ai_search_locations
        (site_id,listing_id,business_id,canonical_key,name,summary,offer_text,locality_id,locality_name,address,latitude,longitude,public_url,phone,whatsapp,website_url,primary_image_url,relationship,is_featured,visibility,quality_score,source_updated_at,source_hash,indexed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'public',?,?,?,NOW())
        ON DUPLICATE KEY UPDATE business_id=VALUES(business_id),canonical_key=VALUES(canonical_key),name=VALUES(name),summary=VALUES(summary),offer_text=VALUES(offer_text),locality_id=VALUES(locality_id),locality_name=VALUES(locality_name),address=VALUES(address),latitude=VALUES(latitude),longitude=VALUES(longitude),public_url=VALUES(public_url),phone=VALUES(phone),whatsapp=VALUES(whatsapp),website_url=VALUES(website_url),primary_image_url=VALUES(primary_image_url),relationship=VALUES(relationship),is_featured=VALUES(is_featured),visibility='public',quality_score=VALUES(quality_score),source_updated_at=VALUES(source_updated_at),source_hash=VALUES(source_hash),indexed_at=NOW(),id=LAST_INSERT_ID(id)`,
        [row.site_id,row.listing_id,id,`business_location:${row.listing_id}`,projection.name,projection.summary,offerText,row.locality_id,clean(row.locality_name,190)||null,clean(row.address,500)||null,latitude,longitude,publicUrl,clean(row.phone,80)||null,clean(row.whatsapp,80)||null,clean(row.website_url,2000)||null,projection.imageUrl,(Number(row.has_active_subscription)||Number(row.has_published_web)||!Number(row.is_free))?"subscriber":"free",Number(row.is_featured)?1:0,qualityScore,row.source_updated_at,hash(projection)]);
      const locationId = Number(upsert.insertId);

      await connection.query("DELETE FROM tags_ai_search_location_categories WHERE site_id=? AND search_location_id=? AND source_type='directory'", [row.site_id, locationId]);
      const [categories] = await connection.query(`SELECT lt.taxonomy_node_id,lt.is_primary,NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1) is_leaf FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id AND n.is_active=1 WHERE lt.listing_id=? AND (n.site_id=? OR n.site_id IS NULL)`, [row.listing_id,row.site_id]);
      for (const category of categories) await connection.query("INSERT INTO tags_ai_search_location_categories (site_id,search_location_id,listing_id,taxonomy_node_id,assignment_status,is_primary,source_type) VALUES (?,?,?,?,?,?, 'directory')", [row.site_id,locationId,row.listing_id,category.taxonomy_node_id,Number(category.is_leaf)?"confirmed":"rejected",Number(category.is_primary)?1:0]);

      await connection.query("DELETE FROM tags_ai_search_location_places WHERE site_id=? AND search_location_id=?", [row.site_id, locationId]);
      const [places] = await connection.query(`SELECT lp.place_id,lp.relation_type,lp.is_primary,gp.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places gp ON gp.id=lp.place_id AND gp.is_active=1 WHERE lp.listing_id=?`, [row.listing_id]);
      for (const place of places) await connection.query("INSERT INTO tags_ai_search_location_places (site_id,search_location_id,listing_id,place_id,relation_type,place_name,normalized_name,is_primary) VALUES (?,?,?,?,?,?,?,?)", [row.site_id,locationId,row.listing_id,place.place_id,place.relation_type,clean(place.name,190),normalized(place.name),Number(place.is_primary)?1:0]);

      for (const item of sourceItems.filter(source => Number(source.listing_id) === Number(row.listing_id))) {
        const searchableText = clean([item.name,item.description,item.category_text,item.seo_title,item.seo_description].filter(Boolean).join(" | "));
        const capacity=extractPublishedCapacity([item.name,item.description,item.category_text]);
        const attributes=capacity?{capacity}:null;
        const itemProjection={name:clean(item.name,255),description:clean(item.description)||null,categoryText:clean(item.category_text,500)||null,searchableText,attributes};
        await connection.query(`INSERT INTO tags_ai_search_items
          (site_id,search_location_id,listing_id,business_id,item_type,source_type,source_id,canonical_key,name,description,category_text,searchable_text,price,sale_price,currency,stock_status,public_url,primary_image_url,attributes_json,visibility,verification_status,source_updated_at,source_hash,indexed_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'public','structured',?,?,NOW())
          ON DUPLICATE KEY UPDATE search_location_id=VALUES(search_location_id),listing_id=VALUES(listing_id),business_id=VALUES(business_id),item_type=VALUES(item_type),name=VALUES(name),description=VALUES(description),category_text=VALUES(category_text),searchable_text=VALUES(searchable_text),price=VALUES(price),sale_price=VALUES(sale_price),currency=VALUES(currency),stock_status=VALUES(stock_status),public_url=VALUES(public_url),primary_image_url=VALUES(primary_image_url),attributes_json=VALUES(attributes_json),visibility='public',verification_status='structured',source_updated_at=VALUES(source_updated_at),source_hash=VALUES(source_hash),indexed_at=NOW()`,
          [row.site_id,locationId,row.listing_id,id,item.item_type,item.source_type,String(item.source_id),`${item.source_type}:${item.source_id}`,itemProjection.name,itemProjection.description,itemProjection.categoryText,searchableText,numberOrNull(item.price),numberOrNull(item.sale_price),clean(item.currency,10)||"ARS",item.stock_status||"unknown",clean(item.public_url,2000)||null,clean(item.image_url,2000)||null,attributes?JSON.stringify(attributes):null,item.source_updated_at,hash(itemProjection)]);
        itemCount += 1;
      }
    }
    await connection.commit();
    return { available: true, locations: locations.length, items: itemCount };
  } catch (error) {
    await connection.rollback();
    if (OPTIONAL_SCHEMA_ERRORS.has(error?.code)) return { available: false, locations: 0, items: 0 };
    throw error;
  } finally { connection.release(); }
}

export async function removeDestinationBusinessProjection({ businessId = 0, listingIds = [], connection = db } = {}) {
  const id = Number(businessId || 0);
  const ids = [...new Set(listingIds.map(Number).filter(Boolean))];
  if (!id && !ids.length) return;
  try {
    if (ids.length) await connection.query(`DELETE FROM tags_ai_search_locations WHERE listing_id IN (${ids.map(() => "?").join(",")})`, ids);
    else await connection.query("DELETE FROM tags_ai_search_locations WHERE business_id=?", [id]);
  } catch (error) {
    if (!OPTIONAL_SCHEMA_ERRORS.has(error?.code)) throw error;
  }
}
