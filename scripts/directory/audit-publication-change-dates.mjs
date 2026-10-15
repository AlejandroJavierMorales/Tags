import "dotenv/config";
import mysql from "mysql2/promise";

const siteCode = process.argv.find(value => value.startsWith("--site="))?.slice(7) || "calamuchitar";

const accessSql = `(sl.is_free=1 OR EXISTS (
  SELECT 1
  FROM tags_subscriptions subscription
  WHERE subscription.business_id=listing.business_id
    AND subscription.id=(SELECT MAX(latest.id) FROM tags_subscriptions latest WHERE latest.business_id=listing.business_id)
    AND subscription.status IN ('active','trial','past_due')
    AND (
      subscription.auto_disable_on_expire=0
      OR subscription.expires_at IS NULL
      OR DATE_ADD(subscription.expires_at,INTERVAL COALESCE(subscription.grace_days,0) DAY)>=NOW()
      OR subscription.admin_override_until>=NOW()
    )
)`;

const db = await mysql.createConnection({
  host:process.env.DB_HOST,
  port:Number(process.env.DB_PORT || 3306),
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD || "",
  database:process.env.DB_DATABASE_NAME,
  charset:"utf8mb4",
});

try {
  const [timeline] = await db.query(`
    SELECT DATE_FORMAT(sl.updated_at,'%Y-%m-%d %H:%i') changed_at,COUNT(*) listings
    FROM tags_directory_site_listings sl
    INNER JOIN tags_directory_sites site ON site.id=sl.site_id
    INNER JOIN tags_directory_listings listing ON listing.id=sl.listing_id
    WHERE site.code=?
      AND sl.publication_status='published'
      AND NOT ${accessSql}
    GROUP BY DATE_FORMAT(sl.updated_at,'%Y-%m-%d %H:%i')
    ORDER BY changed_at DESC`, [siteCode]);

  const [recent] = await db.query(`
    SELECT sl.id site_listing_id,listing.id listing_id,listing.business_id,
      COALESCE(NULLIF(b.display_name,''),b.name,listing.display_name) name,
      sl.is_free,sl.publication_status,sl.updated_at
    FROM tags_directory_site_listings sl
    INNER JOIN tags_directory_sites site ON site.id=sl.site_id
    INNER JOIN tags_directory_listings listing ON listing.id=sl.listing_id
    LEFT JOIN tags_businesses b ON b.id=listing.business_id
    WHERE site.code=?
      AND sl.publication_status='published'
      AND NOT ${accessSql}
    ORDER BY sl.updated_at DESC,sl.id DESC
    LIMIT 30`, [siteCode]);

  console.log(JSON.stringify({ mode:"read-only",siteCode,timeline,recent }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok:false,error:error.message,code:error.code || null }, null, 2));
  process.exitCode=1;
} finally {
  await db.end();
}
