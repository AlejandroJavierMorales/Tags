import "dotenv/config";
import mysql from "mysql2/promise";

const SOURCE = "calamuchitar";
const missingOnly = process.argv.includes("--missing-only");
function cfg(prefix) {
  const v = key => process.env[`${prefix}_${key}`];
  return { host:v("DB_HOST"), port:Number(v("DB_PORT")||3306), user:v("DB_USER"), password:v("DB_PASSWORD")||"", database:v("DB_NAME"), charset:"utf8mb4" };
}
const clean = value => String(value ?? "").trim();
const parse = value => { try { return typeof value === "string" ? JSON.parse(value) : (value || {}); } catch { return {}; } };
const key = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]+/g, "_").replace(/_+$/g, "");
const imageOwnerKey = value => {
  const filename = clean(value).split(/[\\/]/).pop().split("?")[0];
  return key(filename).replace(/(?:[_-]\d+)+$/, "");
};

async function run() {
  if (process.env.DIRECTORY_MIGRATION_CONFIRM !== process.env.DIRECTORY_TARGET_DB_NAME) {
    throw new Error("Para reparar, DIRECTORY_MIGRATION_CONFIRM debe coincidir con DIRECTORY_TARGET_DB_NAME");
  }
  const source = await mysql.createConnection(cfg("DIRECTORY_SOURCE"));
  const target = await mysql.createConnection(cfg("DIRECTORY_TARGET"));
  try {
    const [publishers] = await source.query("SELECT id,company_name FROM publishers_ac ORDER BY id");
    const [subscriptions] = await source.query("SELECT id,publisher FROM subscriptions ORDER BY id");
    const [images] = await source.query("SELECT id,subscription_id,image_name FROM images WHERE image_name IS NOT NULL AND TRIM(image_name)<>'' ORDER BY id");
    const [maps] = await target.execute(
      `SELECT source_id,target_id FROM tags_legacy_entity_map
       WHERE source_system=? AND source_table='publishers_ac' AND target_table='tags_directory_listings'`, [SOURCE]
    );
    const listingByPublisher = new Map(maps.map(row => [Number(row.source_id), Number(row.target_id)]));
    const subscriptionsByPublisher = new Map();
    for (const row of subscriptions) {
      const list = subscriptionsByPublisher.get(Number(row.publisher)) || [];
      list.push(Number(row.id));
      subscriptionsByPublisher.set(Number(row.publisher), list);
    }
    const ownerKeys = publishers.flatMap(publisher => {
      const values = [publisher.company_name, publisher.name_site, publisher.web].map(imageOwnerKey).filter(Boolean);
      return [...new Set(values)].map(ownerKey => ({ publisherId:Number(publisher.id), ownerKey, length:ownerKey.length }));
    }).sort((a,b) => b.length-a.length);
    const imagesByPublisher = new Map();
    for (const row of images) {
      const filename = imageOwnerKey(row.image_name);
      const owner = ownerKeys.find(candidate => filename === candidate.ownerKey || filename.startsWith(`${candidate.ownerKey}_`) || candidate.ownerKey.startsWith(`${filename}_`));
      if (!owner) continue;
      const list = imagesByPublisher.get(owner.publisherId) || [];
      list.push({ url:clean(row.image_name), sourceImageId:Number(row.id), subscriptionId:Number(row.subscription_id) });
      imagesByPublisher.set(owner.publisherId, list);
    }
    await target.beginTransaction();
    if (!missingOnly) {
      await target.query(`CREATE TABLE IF NOT EXISTS tags_directory_gallery_repair_backup_20260812 AS
        SELECT m.*, CURRENT_TIMESTAMP AS backup_at FROM tags_directory_media m WHERE 1=0`);
      await target.query(`INSERT INTO tags_directory_gallery_repair_backup_20260812
        SELECT m.*, CURRENT_TIMESTAMP FROM tags_directory_media m
        WHERE JSON_UNQUOTE(JSON_EXTRACT(m.source_payload,'$.migration'))=?
           OR JSON_EXTRACT(m.source_payload,'$.subscriptionId') IS NOT NULL`, [SOURCE]);
      const mappedListingIds = [...new Set([...listingByPublisher.values()])];
      if (mappedListingIds.length) {
        const placeholders = mappedListingIds.map(() => "?").join(",");
        await target.execute(`DELETE FROM tags_directory_media WHERE media_type='gallery' AND listing_id IN (${placeholders})`, mappedListingIds);
      }
    }
    const result = [];
    for (const publisher of publishers) {
      const listingId = listingByPublisher.get(Number(publisher.id));
      if (!listingId) continue;
      const [listingRows] = await target.execute("SELECT business_id,qr_page_id FROM tags_directory_listings WHERE id=? LIMIT 1", [listingId]);
      const listing = listingRows[0];
      if (!listing?.business_id || !listing.qr_page_id) continue;
      const [blocks] = await target.execute(`SELECT b.id,b.content_json FROM tags_qr_page_blocks b
        INNER JOIN tags_qr_page_sections s ON s.id=b.section_id
        WHERE s.page_id=? AND b.type='gallery'`, [listing.qr_page_id]);
      if (missingOnly) {
        const [[mediaCount]] = await target.execute(
          "SELECT COUNT(*) total FROM tags_directory_media WHERE listing_id=? AND media_type='gallery' AND is_active=1",
          [listingId]
        );
        const hasConfiguredImages = blocks.some(block => {
          const content = parse(block.content_json);
          return Array.isArray(content.images) && content.images.some(image => clean(image?.url));
        });
        if (Number(mediaCount?.total || 0) > 0 || hasConfiguredImages) {
          result.push({ publisherId:Number(publisher.id), companyName:publisher.company_name, listingId, businessId:Number(listing.business_id), pageId:Number(listing.qr_page_id), images:0, skipped:"gallery_not_empty" });
          continue;
        }
      }
      const sourceSubscriptionIds = subscriptionsByPublisher.get(Number(publisher.id)) || [];
      const gallery = (imagesByPublisher.get(Number(publisher.id)) || []).slice(0,8);
      if (missingOnly && !gallery.length) {
        result.push({ publisherId:Number(publisher.id), companyName:publisher.company_name, listingId, businessId:Number(listing.business_id), pageId:Number(listing.qr_page_id), subscriptionIds:sourceSubscriptionIds, images:0, skipped:"no_legacy_images_matched" });
        continue;
      }
      for (const block of blocks) {
        const content = parse(block.content_json);
        content.images = gallery.map(item => ({ url:item.url, alt:"" }));
        content.maxImages = 8;
        await target.execute("UPDATE tags_qr_page_blocks SET content_json=? WHERE id=?", [JSON.stringify(content),block.id]);
      }
      if (!gallery.length) {
        result.push({ publisherId:Number(publisher.id), companyName:publisher.company_name, listingId, businessId:Number(listing.business_id), pageId:Number(listing.qr_page_id), subscriptionIds:sourceSubscriptionIds, images:0 });
        continue;
      }
      for (let index=0; index<gallery.length; index++) {
        const item = gallery[index];
        await target.execute(`INSERT INTO tags_directory_media
          (listing_id,media_type,url,sort_order,is_active,source_payload)
          VALUES (?,'gallery',?,?,1,?)`, [listingId,item.url,index,JSON.stringify({ migration:SOURCE, sourcePublisherId:Number(publisher.id), subscriptionId:item.subscriptionId, sourceImageId:item.sourceImageId })]);
      }
      result.push({ publisherId:Number(publisher.id), companyName:publisher.company_name, listingId, businessId:Number(listing.business_id), pageId:Number(listing.qr_page_id), subscriptionIds:sourceSubscriptionIds, images:gallery.length });
    }
    await target.commit();
    const repaired = result.filter(item => Number(item.images || 0) > 0).length;
    console.log(JSON.stringify({ mode:missingOnly ? "missing-only" : "full-repair", backupTable:missingOnly ? null : "tags_directory_gallery_repair_backup_20260812", repaired, result },null,2));
  } catch (error) { await target.rollback(); throw error; }
  finally { await Promise.allSettled([source.end(),target.end()]); }
}
run().catch(error => { console.error(`ERROR: ${error.message}`); process.exitCode=1; });
