import "dotenv/config";
import mysql from "mysql2/promise";

const TABLES = [
  "tags_businesses",
  "tags_business_addons",
  "tags_directory_sites",
  "tags_directory_listings",
  "tags_directory_site_listings",
  "tags_directory_taxonomy_nodes",
  "tags_directory_listing_taxonomy",
  "tags_geo_places",
  "tags_directory_listing_places",
  "tags_directory_media",
  "tags_qr_pages",
  "tags_qr_page_sections",
  "tags_qr_page_blocks",
  "tags_qr_page_products",
  "tags_stores",
  "tags_store_categories",
  "tags_store_products",
  "tags_store_product_images",
  "tags_turnos_apps",
  "tags_turnos_services",
  "tags_turnos_service_categories",
  "tags_turnos_locations",
  "tags_ai_chatbot_knowledge",
  "tags_ai_knowledge_documents",
  "tags_ai_knowledge_claims",
  "tags_ai_business_profile_entries",
  "tags_ai_concept_aliases",
  "tags_ai_search_locations",
  "tags_ai_search_location_categories",
  "tags_ai_search_location_places",
  "tags_ai_search_items",
  "tags_ai_search_item_categories",
  "tags_ai_taxonomy_aliases",
  "tags_ai_tourism_sources",
  "tags_ai_tourism_contents",
  "tags_ai_tourism_content_categories",
  "tags_ai_tourism_imports",
  "tags_ai_search_evaluations",
];

function connectionConfig() {
  const required = ["DB_HOST", "DB_USER", "DB_DATABASE_NAME"];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) throw new Error(`Faltan variables: ${missing.join(", ")}`);
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
  const connection = await mysql.createConnection(connectionConfig());
  try {
    const [[server]] = await connection.query("SELECT DATABASE() database_name, VERSION() version");
    const [columns] = await connection.query(
      `SELECT TABLE_NAME table_name,COLUMN_NAME column_name,COLUMN_TYPE column_type,
              IS_NULLABLE is_nullable,COLUMN_KEY column_key,EXTRA extra
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?)
        ORDER BY TABLE_NAME,ORDINAL_POSITION`,
      [TABLES]
    );
    const grouped = Object.fromEntries(TABLES.map(table => [table, []]));
    for (const column of columns) grouped[column.table_name].push({
      name: column.column_name,
      type: column.column_type,
      nullable: column.is_nullable === "YES",
      key: column.column_key || null,
      extra: column.extra || null,
    });
    process.stdout.write(`${JSON.stringify({
      generatedAt: new Date().toISOString(),
      server,
      tables: grouped,
      missingTables: TABLES.filter(table => grouped[table].length === 0),
    }, null, 2)}\n`);
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  process.stderr.write(`SCHEMA_AUDIT_ERROR: ${error.message}\n`);
  process.exitCode = 1;
});
