import "dotenv/config";
import mysql from "mysql2/promise";

const siteCode = process.argv.find(value => value.startsWith("--site="))?.slice(7) || "calamuchitar";
const contains = process.argv.find(value => value.startsWith("--contains="))?.slice(11).trim().toLocaleLowerCase("es-AR") || "";
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE_NAME,
  charset: "utf8mb4",
});

try {
  const [rows] = await connection.execute(
    `SELECT n.id,n.parent_id,n.name,n.slug,n.node_type,n.depth,
            COUNT(DISTINCT lc.search_location_id) direct_locations,
            GROUP_CONCAT(DISTINCT l.name ORDER BY l.name SEPARATOR ' | ') location_names
       FROM tags_directory_sites s
       INNER JOIN tags_directory_taxonomy_nodes n ON (n.site_id=s.id OR n.site_id IS NULL)
       LEFT JOIN tags_ai_search_location_categories lc
         ON lc.site_id=s.id AND lc.taxonomy_node_id=n.id AND lc.assignment_status<>'rejected'
       LEFT JOIN tags_ai_search_locations l ON l.id=lc.search_location_id AND l.visibility='public'
      WHERE s.code=? AND s.is_active=1 AND n.is_active=1
      GROUP BY n.id,n.parent_id,n.name,n.slug,n.node_type,n.depth
      ORDER BY n.depth,n.parent_id,n.sort_order,n.name`,
    [siteCode]
  );
  const filtered = contains
    ? rows.filter(row => [row.name, row.slug, row.location_names].some(value => String(value || "").toLocaleLowerCase("es-AR").includes(contains)))
    : rows;
  process.stdout.write(`${JSON.stringify({ mode: "read-only", siteCode, contains: contains || null, taxonomy: filtered }, null, 2)}\n`);
} finally {
  await connection.end();
}
