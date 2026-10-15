import "dotenv/config";
import mysql from "mysql2/promise";

const option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) || "";
const siteCode = option("site") || "calamuchitar";
const accessSql = `(sl.is_free=1 OR EXISTS (
  SELECT 1 FROM tags_subscriptions subscription
  WHERE subscription.business_id=l.business_id
    AND subscription.id=(SELECT MAX(latest.id) FROM tags_subscriptions latest WHERE latest.business_id=l.business_id)
    AND subscription.status IN ('active','trial','past_due')
    AND (subscription.auto_disable_on_expire=0 OR subscription.expires_at IS NULL
      OR DATE_ADD(subscription.expires_at,INTERVAL COALESCE(subscription.grace_days,0) DAY)>=NOW()
      OR subscription.admin_override_until>=NOW())
))`;

async function main() {
  const db = await mysql.createConnection({ host:process.env.DB_HOST,port:Number(process.env.DB_PORT || 3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD || "",database:process.env.DB_DATABASE_NAME,charset:"utf8mb4" });
  try {
    const [[site]] = await db.query("SELECT id,code,name FROM tags_directory_sites WHERE code=? AND is_active=1 LIMIT 1", [siteCode]);
    if (!site) throw new Error("Directorio no encontrado");
    const [[summary], [publicationModes], [excludedPublished], [withoutTaxonomy], [taxonomy], [duplicateSlugs]] = await Promise.all([
      db.query(`SELECT COUNT(*) total,
        SUM(sl.publication_status='published') published,
        SUM(sl.publication_status='published' AND sl.is_free=1) published_free,
        SUM(sl.publication_status='published' AND sl.is_free=0) published_paid,
        SUM(sl.publication_status='published' AND ${accessSql}) publicly_eligible,
        SUM(sl.publication_status='published' AND NOT ${accessSql}) excluded_by_access
        FROM tags_directory_site_listings sl INNER JOIN tags_directory_listings l ON l.id=sl.listing_id WHERE sl.site_id=?`, [site.id]),
      db.query(`SELECT sl.publication_status,sl.is_free,COUNT(*) total FROM tags_directory_site_listings sl WHERE sl.site_id=? GROUP BY sl.publication_status,sl.is_free ORDER BY sl.publication_status,sl.is_free`, [site.id]),
      db.query(`SELECT l.id listing_id,l.business_id,COALESCE(NULLIF(b.display_name,''),b.name,l.display_name) name,sl.slug,sl.is_free,
        (SELECT CONCAT(s.status,' | ',COALESCE(DATE_FORMAT(s.expires_at,'%Y-%m-%d'),'sin vencimiento')) FROM tags_subscriptions s WHERE s.business_id=l.business_id ORDER BY s.id DESC LIMIT 1) latest_subscription
        FROM tags_directory_site_listings sl INNER JOIN tags_directory_listings l ON l.id=sl.listing_id LEFT JOIN tags_businesses b ON b.id=l.business_id
        WHERE sl.site_id=? AND sl.publication_status='published' AND NOT ${accessSql} ORDER BY name LIMIT 300`, [site.id]),
      db.query(`SELECT l.id listing_id,l.business_id,COALESCE(NULLIF(b.display_name,''),b.name,l.display_name) name,sl.is_free
        FROM tags_directory_site_listings sl INNER JOIN tags_directory_listings l ON l.id=sl.listing_id LEFT JOIN tags_businesses b ON b.id=l.business_id
        WHERE sl.site_id=? AND sl.publication_status='published' AND ${accessSql}
          AND NOT EXISTS(SELECT 1 FROM tags_directory_listing_taxonomy lt WHERE lt.listing_id=l.id)
        ORDER BY name`, [site.id]),
      db.query(`SELECT root.slug root_slug,root.name root_name,node.id,node.parent_id,node.slug,node.name,node.depth,node.is_active,
        COUNT(DISTINCT lt.listing_id) assigned,
        COUNT(DISTINCT CASE WHEN sl.publication_status='published' AND ${accessSql} THEN l.id END) publicly_visible
        FROM tags_directory_taxonomy_nodes node
        LEFT JOIN tags_directory_taxonomy_closure ancestry ON ancestry.descendant_id=node.id
        LEFT JOIN tags_directory_taxonomy_nodes root ON root.id=ancestry.ancestor_id AND root.parent_id IS NULL
        LEFT JOIN tags_directory_taxonomy_closure descendants ON descendants.ancestor_id=node.id
        LEFT JOIN tags_directory_listing_taxonomy lt ON lt.taxonomy_node_id=descendants.descendant_id
        LEFT JOIN tags_directory_listings l ON l.id=lt.listing_id
        LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.site_id=?
        WHERE node.is_active=1 AND (root.id IS NOT NULL OR node.parent_id IS NULL)
        GROUP BY root.slug,root.name,node.id,node.parent_id,node.slug,node.name,node.depth,node.is_active
        HAVING assigned>0 OR node.depth<=1
        ORDER BY root_name,node.depth,node.sort_order,node.name`, [site.id]),
      db.query(`SELECT slug,COUNT(*) total,GROUP_CONCAT(CONCAT(id,':',name,':parent=',COALESCE(parent_id,'root')) ORDER BY id SEPARATOR ' | ') nodes
        FROM tags_directory_taxonomy_nodes WHERE is_active=1 GROUP BY slug HAVING COUNT(*)>1 ORDER BY slug`),
    ]);
    console.log(JSON.stringify({ mode:"read-only",site,summary,publicationModes,excludedPublished,withoutTaxonomy,taxonomy,duplicateSlugs }, null, 2));
  } finally { await db.end(); }
}

main().catch(error => { console.error(JSON.stringify({ ok:false,error:error.message,code:error.code || null }, null, 2));process.exitCode=1; });
