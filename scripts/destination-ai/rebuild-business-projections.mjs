import "dotenv/config";
import mysql from "mysql2/promise";

const option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) || "";
const apply = process.argv.includes("--apply");
const siteCode = option("site") || "calamuchitar";
const requestedBusinessId = Number(option("business") || 0);

function config() {
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE_NAME,
    charset: "utf8mb4",
  };
}

async function main() {
  const connection = await mysql.createConnection(config());
  try {
    const [rows] = await connection.query(`SELECT DISTINCT l.business_id
      FROM tags_directory_listings l
      INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
      INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id AND ds.code=? AND ds.is_active=1
      WHERE l.status='published' AND l.business_id IS NOT NULL
        ${requestedBusinessId ? "AND l.business_id=?" : ""}
      ORDER BY l.business_id`, requestedBusinessId ? [siteCode, requestedBusinessId] : [siteCode]);
    const businessIds = rows.map(row => Number(row.business_id)).filter(Boolean);
    if (!apply) {
      process.stdout.write(`${JSON.stringify({ mode: "dry-run", siteCode, businesses: businessIds.length, businessIds }, null, 2)}\n`);
      return;
    }
    const [{ refreshDestinationBusinessProjection }, { db }] = await Promise.all([
      import("../../app/modules/destination-ai/server/refreshDestinationBusinessProjection.js"),
      import("../../app/lib/tags-db.js"),
    ]);
    const results = [];
    for (const businessId of businessIds) {
      const result = await refreshDestinationBusinessProjection(businessId);
      results.push({ businessId, ...result });
    }
    await db.end();
    process.stdout.write(`${JSON.stringify({ mode: "applied", siteCode, businesses: results.length, results }, null, 2)}\n`);
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  process.stderr.write(`BUSINESS_PROJECTION_REBUILD_ERROR: ${error.code || error.message}\n`);
  process.exitCode = 1;
});
