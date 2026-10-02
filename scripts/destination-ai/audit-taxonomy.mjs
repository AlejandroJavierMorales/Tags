import "dotenv/config";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE_NAME,
});

try {
  const [rows] = await connection.query(`
    SELECT n.id,n.parent_id,n.depth,n.name,n.slug,COUNT(DISTINCT lt.listing_id) listings
      FROM tags_directory_taxonomy_nodes n
      LEFT JOIN tags_directory_listing_taxonomy lt ON lt.taxonomy_node_id=n.id
     WHERE n.is_active=1
     GROUP BY n.id,n.parent_id,n.depth,n.name,n.slug
     ORDER BY n.depth,n.parent_id,n.sort_order,n.name
  `);
  const [listings] = await connection.query(`
    SELECT l.id,COALESCE(NULLIF(b.display_name,''),NULLIF(b.name,''),l.display_name) name,
           COALESCE(NULLIF(l.short_description,''),NULLIF(l.description,''),NULLIF(b.description,'')) summary,
           GROUP_CONCAT(DISTINCT n.name ORDER BY n.depth,n.name SEPARATOR ', ') categories,
           GROUP_CONCAT(DISTINCT CASE WHEN lt.is_primary=1 THEN n.name END ORDER BY n.depth,n.name SEPARATOR ', ') primary_categories
      FROM tags_directory_listings l
      LEFT JOIN tags_businesses b ON b.id=l.business_id
      LEFT JOIN tags_directory_listing_taxonomy lt ON lt.listing_id=l.id
      LEFT JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id AND n.is_active=1
     WHERE l.status='published'
     GROUP BY l.id,name
     ORDER BY name
  `);
  const [[listingTaxonomySchema]] = await connection.query("SHOW CREATE TABLE tags_directory_listing_taxonomy");
  process.stdout.write(`${JSON.stringify({ taxonomy: rows, listings, listingTaxonomySchema }, null, 2)}\n`);
} finally {
  await connection.end();
}
