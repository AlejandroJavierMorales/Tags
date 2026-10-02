import "dotenv/config";
import crypto from "node:crypto";
import mysql from "mysql2/promise";

const args = new Set(process.argv.slice(2));
const option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) || "";
const APPLY = args.has("--apply");
const SITE_CODE = option("site") || "calamuchitar";
const SAMPLE_SIZE = Math.max(1, Math.min(20, Number(option("samples") || 5)));

function config() {
  const required = ["DB_HOST", "DB_USER", "DB_DATABASE_NAME"];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) throw new Error(`Faltan variables: ${missing.join(", ")}`);
  return { host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD || "", database: process.env.DB_DATABASE_NAME, charset: "utf8mb4" };
}

const clean = (value, max = 20000) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
const numberOrNull = value => Number.isFinite(Number(value)) ? Number(value) : null;
const parseJson=value=>{if(!value)return{};if(typeof value==="object"&&!Buffer.isBuffer(value))return value;try{return JSON.parse(Buffer.isBuffer(value)?value.toString("utf8"):String(value));}catch{return{};}};
const publishedCapacity=value=>{const text=String(value||"").toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," "),words={un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20},valuePattern="(\\d{1,3}|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|veinte)",found=[];for(const pattern of [new RegExp(`\\b(?:para|hasta|capacidad(?:\\s+para)?)\\s*${valuePattern}\\s*(?:persona|personas|pasajero|pasajeros|huesped|huespedes)?\\b`,"gu"),new RegExp(`\\b${valuePattern}\\s+(?:persona|personas|pasajero|pasajeros|huesped|huespedes|plazas)\\b`,"gu")])for(const match of text.matchAll(pattern)){const number=Number(match[1])||words[match[1]]||0;if(number>0&&number<=200)found.push(number);}return found.length?Math.max(...found):null;};
function scopedCoordinates(latitude,longitude,directoryConfig){const lat=numberOrNull(latitude),lon=numberOrNull(longitude);if(lat==null||lon==null||lat< -90||lat>90||lon< -180||lon>180||(!lat&&!lon))return{latitude:null,longitude:null};const bounds=parseJson(directoryConfig).geographicBounds;if(bounds&&Number.isFinite(Number(bounds.south))&&Number.isFinite(Number(bounds.north))&&Number.isFinite(Number(bounds.west))&&Number.isFinite(Number(bounds.east))&&(lat<Number(bounds.south)||lat>Number(bounds.north)||lon<Number(bounds.west)||lon>Number(bounds.east)))return{latitude:null,longitude:null};return{latitude:lat,longitude:lon};}
const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const normalized=value=>clean(value,190).toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const href = (host, slug) => host && slug ? `https://${clean(host, 255).replace(/^https?:\/\//, "").replace(/\/$/, "")}/${slug}` : null;

async function load(connection) {
  const [locations] = await connection.query(`
    SELECT ds.id site_id,ds.primary_host,ds.directory_config,l.id listing_id,l.business_id,sl.slug,sl.is_free,sl.is_featured,
           COALESCE(NULLIF(b.display_name,''),NULLIF(b.name,''),l.display_name) name,
           COALESCE(NULLIF(l.short_description,''),NULLIF(l.description,''),b.description) summary,
           CONCAT_WS(' | ',l.short_description,l.description,b.description,sl.seo_title,sl.seo_description,sl.seo_keywords,
             qp.title,qp.description,qp.seo_title,qp.seo_description,
             (SELECT LEFT(GROUP_CONCAT(CAST(bl.content_json AS CHAR) ORDER BY sec.sort_order,bl.sort_order SEPARATOR ' | '),12000) FROM tags_qr_page_blocks bl INNER JOIN tags_qr_page_sections sec ON sec.id=bl.section_id AND sec.is_visible=1 WHERE sec.page_id=l.qr_page_id AND bl.is_visible=1),
             (SELECT GROUP_CONCAT(CONCAT_WS(': ',k.title,k.topics,k.content) ORDER BY k.id SEPARATOR ' | ') FROM tags_ai_chatbot_knowledge k WHERE k.business_id=l.business_id AND k.is_active=1),
             (SELECT GROUP_CONCAT(CONCAT_WS(': ',e.display_value,e.description) ORDER BY e.id SEPARATOR ' | ') FROM tags_ai_business_profile_entries e WHERE e.site_id=ds.id AND e.business_id=l.business_id AND e.status='active')) offer_text,
           gp.id locality_id,gp.name locality_name,COALESCE(l.address,b.address) address,
           COALESCE(l.latitude,b.latitude) latitude,COALESCE(l.longitude,b.longitude) longitude,
           COALESCE(l.phone,b.phone) phone,COALESCE(l.whatsapp,b.whatsapp) whatsapp,COALESCE(l.website_url,b.website_url) website_url,
           COALESCE((SELECT m.url FROM tags_directory_media m WHERE m.listing_id=l.id AND m.is_active=1 ORDER BY FIELD(m.media_type,'cover','gallery','logo'),m.sort_order,m.id LIMIT 1),b.cover_url,b.logo_url) image_url,
           GREATEST(l.updated_at,sl.updated_at,COALESCE(b.updated_at,l.updated_at)) source_updated_at
      FROM tags_directory_listings l
      INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
      INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id AND ds.code=? AND ds.is_active=1
      LEFT JOIN tags_businesses b ON b.id=l.business_id
      LEFT JOIN tags_qr_pages qp ON qp.id=l.qr_page_id AND qp.status='published'
      LEFT JOIN tags_directory_listing_places lp ON lp.listing_id=l.id AND lp.relation_type='location' AND lp.is_primary=1
      LEFT JOIN tags_geo_places gp ON gp.id=lp.place_id AND gp.is_active=1
     WHERE l.status='published'`, [SITE_CODE]);

  const [categories] = await connection.query(`
    SELECT ds.id site_id,l.id listing_id,lt.taxonomy_node_id,lt.is_primary,
           NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1) is_leaf
      FROM tags_directory_listings l
      INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
      INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id AND ds.code=? AND ds.is_active=1
      INNER JOIN tags_directory_listing_taxonomy lt ON lt.listing_id=l.id
      INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id AND (n.site_id=ds.id OR n.site_id IS NULL) AND n.is_active=1
     WHERE l.status='published'`, [SITE_CODE]);
  const [places] = await connection.query(`SELECT ds.id site_id,l.id listing_id,lp.place_id,lp.relation_type,lp.is_primary,gp.name place_name
      FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
      INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id AND ds.code=? AND ds.is_active=1
      INNER JOIN tags_directory_listing_places lp ON lp.listing_id=l.id
      INNER JOIN tags_geo_places gp ON gp.id=lp.place_id AND gp.is_active=1 WHERE l.status='published'`,[SITE_CODE]);

  const base = `INNER JOIN tags_directory_listings l ON l.business_id=owner_business_id
    INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
    INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id AND ds.code=? AND ds.is_active=1
    WHERE l.status='published'`;

  const [qrProducts] = await connection.query(`
    SELECT ds.id site_id,l.id listing_id,l.business_id,p.id source_id,'qr_product' source_type,'product' item_type,
           p.title name,p.description,p.category category_text,p.price,NULL sale_price,p.currency,
           'unknown' stock_status,p.button_url public_url,p.image_url,p.seo_title,p.seo_description,p.updated_at source_updated_at
      FROM tags_qr_page_products p
      INNER JOIN tags_qr_pages page ON page.id=p.page_id AND page.status='published'
      INNER JOIN tags_directory_listings l ON l.qr_page_id=page.id
      INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
      INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id AND ds.code=? AND ds.is_active=1
     WHERE l.status='published' AND p.is_visible=1`, [SITE_CODE]);

  const [storeProducts] = await connection.query(`
    SELECT ds.id site_id,l.id listing_id,l.business_id,p.id source_id,'store_product' source_type,
           IF(st.app_type='resto','dish','product') item_type,p.title name,p.description,c.name category_text,
           p.price,p.sale_price,p.currency,IF(p.stock_enabled=0,'unknown',IF(p.stock_qty>0,'available','unavailable')) stock_status,
           NULL public_url,(SELECT i.image_url FROM tags_store_product_images i WHERE i.product_id=p.id ORDER BY i.is_primary DESC,i.sort_order,i.id LIMIT 1) image_url,
           p.seo_title,p.seo_description,p.updated_at source_updated_at
      FROM tags_store_products p
      INNER JOIN tags_stores st ON st.id=p.store_id AND st.status='published'
      LEFT JOIN tags_store_categories c ON c.id=p.category_id AND c.is_visible=1
      INNER JOIN tags_directory_listings l ON l.business_id=st.business_id
      INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
      INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id AND ds.code=? AND ds.is_active=1
     WHERE l.status='published' AND p.is_visible=1 AND p.status='published'`, [SITE_CODE]);

  const [services] = await connection.query(`
    SELECT ds.id site_id,l.id listing_id,l.business_id,s.id source_id,'turnos_service' source_type,
           IF(a.business_profile_code='activities','experience','service') item_type,s.name,s.description,c.name category_text,
           s.price,NULL sale_price,s.currency,'unknown' stock_status,
           CONCAT('/turnos/',a.slug) public_url,s.image_url,NULL seo_title,NULL seo_description,s.updated_at source_updated_at
      FROM tags_turnos_services s
      INNER JOIN tags_turnos_apps a ON a.id=s.turnos_id AND a.status='published'
      LEFT JOIN tags_turnos_service_categories c ON c.id=s.category_id AND c.is_visible=1
      INNER JOIN tags_directory_listings l ON l.business_id=a.business_id
      INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
      INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id AND ds.code=? AND ds.is_active=1
     WHERE l.status='published' AND s.is_active=1 AND s.is_visible=1`, [SITE_CODE]);

  const normalizedLocations = locations.map(row => {
    const coordinates=scopedCoordinates(row.latitude,row.longitude,row.directory_config);
    const item = {
      siteId:Number(row.site_id),listingId:Number(row.listing_id),businessId:numberOrNull(row.business_id),canonicalKey:`business_location:${row.listing_id}`,
      name:clean(row.name,255),summary:clean(row.summary,10000)||null,offerText:clean(row.offer_text)||null,localityId:numberOrNull(row.locality_id),localityName:clean(row.locality_name,190)||null,
      address:clean(row.address,500)||null,latitude:coordinates.latitude,longitude:coordinates.longitude,publicUrl:href(row.primary_host,row.slug),phone:clean(row.phone,80)||null,
      whatsapp:clean(row.whatsapp,80)||null,websiteUrl:clean(row.website_url,2000)||null,imageUrl:clean(row.image_url,2000)||null,relationship:Number(row.is_free)?"free":"subscriber",
      featured:Boolean(Number(row.is_featured)),qualityScore:[row.summary,row.locality_name,row.image_url,row.phone||row.whatsapp,coordinates.latitude!=null&&coordinates.longitude!=null].filter(Boolean).length*20,sourceUpdatedAt:row.source_updated_at
    };
    return {...item,sourceHash:hash(item)};
  });
  const normalizedItems = [...qrProducts,...storeProducts,...services].map(row => {
    const capacity=publishedCapacity([row.name,row.description,row.category_text].filter(Boolean).join(" "));
    const item={siteId:Number(row.site_id),listingId:Number(row.listing_id),businessId:numberOrNull(row.business_id),itemType:row.item_type,sourceType:row.source_type,sourceId:String(row.source_id),canonicalKey:`${row.source_type}:${row.source_id}`,
      name:clean(row.name,255),description:clean(row.description)||null,categoryText:clean(row.category_text,500)||null,searchableText:[row.name,row.description,row.category_text,row.seo_title,row.seo_description].map(value=>clean(value)).filter(Boolean).join(" | "),
      price:numberOrNull(row.price),salePrice:numberOrNull(row.sale_price),currency:clean(row.currency,10)||"ARS",stockStatus:row.stock_status||"unknown",publicUrl:clean(row.public_url,2000)||null,imageUrl:clean(row.image_url,2000)||null,attributes:capacity?{capacity}:null,sourceUpdatedAt:row.source_updated_at};
    return {...item,sourceHash:hash(item)};
  });
  return { locations: normalizedLocations, categories, places, items: normalizedItems };
}

async function ensureSchema(connection) {
  const [rows] = await connection.query("SHOW TABLES LIKE 'tags_ai_search_locations'");
  if (!rows.length) throw new Error("Falta ejecutar 2026-09-27-tags-destination-ai-engine-v2.sql");
}

async function applyData(connection, data) {
  const locationIds = new Map();
  await connection.beginTransaction();
  try {
    for (const item of data.locations) {
      const [result] = await connection.execute(`INSERT INTO tags_ai_search_locations
        (site_id,listing_id,business_id,canonical_key,name,summary,offer_text,locality_id,locality_name,address,latitude,longitude,public_url,phone,whatsapp,website_url,primary_image_url,relationship,is_featured,visibility,quality_score,source_updated_at,source_hash,indexed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'public',?,?,?,NOW())
        ON DUPLICATE KEY UPDATE business_id=VALUES(business_id),canonical_key=VALUES(canonical_key),name=VALUES(name),summary=VALUES(summary),offer_text=VALUES(offer_text),locality_id=VALUES(locality_id),locality_name=VALUES(locality_name),address=VALUES(address),latitude=VALUES(latitude),longitude=VALUES(longitude),public_url=VALUES(public_url),phone=VALUES(phone),whatsapp=VALUES(whatsapp),website_url=VALUES(website_url),primary_image_url=VALUES(primary_image_url),relationship=VALUES(relationship),is_featured=VALUES(is_featured),visibility='public',quality_score=VALUES(quality_score),source_updated_at=VALUES(source_updated_at),source_hash=VALUES(source_hash),indexed_at=NOW(),id=LAST_INSERT_ID(id)`,
        [item.siteId,item.listingId,item.businessId,item.canonicalKey,item.name,item.summary,item.offerText,item.localityId,item.localityName,item.address,item.latitude,item.longitude,item.publicUrl,item.phone,item.whatsapp,item.websiteUrl,item.imageUrl,item.relationship,item.featured?1:0,item.qualityScore,item.sourceUpdatedAt,item.sourceHash]);
      locationIds.set(item.listingId,Number(result.insertId));
    }
    const projectionSiteId=data.locations[0]?.siteId;
    if(projectionSiteId){await connection.execute("DELETE FROM tags_ai_search_location_categories WHERE site_id=? AND assignment_status='declared'",[projectionSiteId]);await connection.execute("DELETE FROM tags_ai_search_location_places WHERE site_id=?",[projectionSiteId]);}
    for (const category of data.categories) {
      const locationId=locationIds.get(Number(category.listing_id)); if(!locationId) continue;
      await connection.execute(`INSERT INTO tags_ai_search_location_categories (site_id,search_location_id,listing_id,taxonomy_node_id,assignment_status,is_primary,source_type)
        VALUES (?,?,?,?,?,?,'directory') ON DUPLICATE KEY UPDATE listing_id=VALUES(listing_id),is_primary=VALUES(is_primary),assignment_status=IF(VALUES(assignment_status)='rejected','rejected',IF(assignment_status='rejected','rejected','confirmed'))`,
        [Number(category.site_id),locationId,Number(category.listing_id),Number(category.taxonomy_node_id),Number(category.is_leaf)?'confirmed':'rejected',Number(category.is_primary)?1:0]);
    }
    for(const place of data.places){const locationId=locationIds.get(Number(place.listing_id));if(!locationId)continue;await connection.execute(`INSERT INTO tags_ai_search_location_places (site_id,search_location_id,listing_id,place_id,relation_type,place_name,normalized_name,is_primary) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE listing_id=VALUES(listing_id),place_name=VALUES(place_name),normalized_name=VALUES(normalized_name),is_primary=VALUES(is_primary)`,[Number(place.site_id),locationId,Number(place.listing_id),Number(place.place_id),place.relation_type,clean(place.place_name,190),normalized(place.place_name),Number(place.is_primary)?1:0]);}
    for (const item of data.items) {
      const locationId=locationIds.get(item.listingId); if(!locationId) continue;
      await connection.execute(`INSERT INTO tags_ai_search_items
        (site_id,search_location_id,listing_id,business_id,item_type,source_type,source_id,canonical_key,name,description,category_text,searchable_text,price,sale_price,currency,stock_status,public_url,primary_image_url,attributes_json,visibility,verification_status,source_updated_at,source_hash,indexed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'public','structured',?,?,NOW())
        ON DUPLICATE KEY UPDATE search_location_id=VALUES(search_location_id),listing_id=VALUES(listing_id),business_id=VALUES(business_id),item_type=VALUES(item_type),name=VALUES(name),description=VALUES(description),category_text=VALUES(category_text),searchable_text=VALUES(searchable_text),price=VALUES(price),sale_price=VALUES(sale_price),currency=VALUES(currency),stock_status=VALUES(stock_status),public_url=VALUES(public_url),primary_image_url=VALUES(primary_image_url),attributes_json=VALUES(attributes_json),visibility='public',source_updated_at=VALUES(source_updated_at),source_hash=VALUES(source_hash),indexed_at=NOW()`,
        [item.siteId,locationId,item.listingId,item.businessId,item.itemType,item.sourceType,item.sourceId,item.canonicalKey,item.name,item.description,item.categoryText,item.searchableText,item.price,item.salePrice,item.currency,item.stockStatus,item.publicUrl,item.imageUrl,item.attributes?JSON.stringify(item.attributes):null,item.sourceUpdatedAt,item.sourceHash]);
    }
    const siteId=data.locations[0]?.siteId;
    if(siteId){
      const locationKeys=data.locations.map(item=>item.canonicalKey); if(locationKeys.length) await connection.execute(`UPDATE tags_ai_search_locations SET visibility='stale' WHERE site_id=? AND canonical_key NOT IN (${locationKeys.map(()=>'?').join(',')})`,[siteId,...locationKeys]);else await connection.execute("UPDATE tags_ai_search_locations SET visibility='stale' WHERE site_id=?",[siteId]);
      const itemKeys=data.items.map(item=>item.canonicalKey); if(itemKeys.length) await connection.execute(`UPDATE tags_ai_search_items SET visibility='stale' WHERE site_id=? AND canonical_key NOT IN (${itemKeys.map(()=>'?').join(',')})`,[siteId,...itemKeys]);else await connection.execute("UPDATE tags_ai_search_items SET visibility='stale' WHERE site_id=?",[siteId]);
    }
    await connection.commit();
  } catch(error){ await connection.rollback(); throw error; }
}

async function main(){
  if(!/^[a-z0-9_-]{2,80}$/i.test(SITE_CODE)) throw new Error("site inválido");
  const settings=config();
  if(APPLY && process.env.DESTINATION_AI_BACKFILL_CONFIRM!==settings.database) throw new Error("Para escribir, DESTINATION_AI_BACKFILL_CONFIRM debe coincidir exactamente con DB_DATABASE_NAME");
  const connection=await mysql.createConnection(settings);
  try{
    const [[server]]=await connection.query("SELECT DATABASE() database_name,VERSION() version");
    const data=await load(connection);
    const report={mode:APPLY?"apply":"dry-run",generatedAt:new Date().toISOString(),siteCode:SITE_CODE,database:server.database_name,mysqlVersion:server.version,totals:{locations:data.locations.length,categoryAssignments:data.categories.length,placeAssignments:data.places.length,items:data.items.length,byItemType:data.items.reduce((out,item)=>({...out,[item.itemType]:(out[item.itemType]||0)+1}),{})},warnings:{locationsWithoutCategory:data.locations.filter(location=>!data.categories.some(category=>Number(category.listing_id)===location.listingId)).length,locationsWithoutCoordinates:data.locations.filter(location=>location.latitude==null||location.longitude==null).length},samples:{locations:data.locations.slice(0,SAMPLE_SIZE).map(({canonicalKey,name,localityName})=>({canonicalKey,name,localityName})),items:data.items.slice(0,SAMPLE_SIZE).map(({canonicalKey,itemType,name})=>({canonicalKey,itemType,name}))}};
    if(APPLY){await ensureSchema(connection);await applyData(connection,data);report.applied={locations:data.locations.length,items:data.items.length};}
    process.stdout.write(`${JSON.stringify(report,null,2)}\n`);
  } finally {await connection.end();}
}
main().catch(error=>{process.stderr.write(`BACKFILL_V2_ERROR: ${error.message}\n`);process.exitCode=1;});
