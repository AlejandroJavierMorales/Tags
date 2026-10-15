import "dotenv/config";
import mysql from "mysql2/promise";

const args = new Map(process.argv.slice(2).map(value => {
  const [key, ...rest] = value.replace(/^--/, "").split("=");
  return [key, rest.join("=")];
}));
const siteCode = String(args.get("site") || "calamuchitar").trim();
const query = String(args.get("query") || "pago facil").trim();
const locality = String(args.get("locality") || "Los Reartes").trim();
const normalized = value => String(value || "").toLocaleLowerCase("es-AR").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const stopWords = new Set(["a","al","con","de","del","donde","el","en","hay","la","las","lo","los","por","que","un","una","y"]);
const terms = normalized(query).split(" ").filter(term => term.length > 1 && !stopWords.has(term)).slice(0, 8);
const phrase = normalized(query);
const snippet = value => {
  const source = String(value || "").replace(/\s+/g, " ").trim();
  const lowered = normalized(source);
  const positions = terms.map(term => lowered.indexOf(term)).filter(position => position >= 0);
  const start = positions.length ? Math.max(0, Math.min(...positions) - 120) : 0;
  return `${start ? "…" : ""}${source.slice(start, start + 700)}`;
};

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE_NAME,
    charset: "utf8mb4",
  });
  const [[site]] = await db.execute("SELECT id,code,name FROM tags_directory_sites WHERE code=? LIMIT 1", [siteCode]);
  if (!site) throw new Error(`No existe el sitio ${siteCode}`);
  const likeTerms = terms.map(term => `%${term}%`);
  const standardChecks = terms.map(() => `AND (
    LOWER(CONCAT_WS(' ',l.display_name,l.short_description,l.description,sl.seo_keywords,b.name,b.description)) LIKE ?
    OR EXISTS (SELECT 1 FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id WHERE lt.listing_id=l.id AND LOWER(CONCAT_WS(' ',n.name,n.description)) LIKE ?)
  )`).join(" ");
  const [standardRows] = await db.execute(`SELECT l.id listing_id,l.business_id,COALESCE(NULLIF(b.display_name,''),b.name,l.display_name) name,
      l.short_description,l.description,b.description business_description,sl.seo_keywords,
      (SELECT GROUP_CONCAT(p.name SEPARATOR ' | ') FROM tags_directory_listing_places lp INNER JOIN tags_geo_places p ON p.id=lp.place_id WHERE lp.listing_id=l.id) places
    FROM tags_directory_listings l
    INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.site_id=? AND sl.publication_status='published'
    LEFT JOIN tags_businesses b ON b.id=l.business_id
    WHERE l.status='published' ${standardChecks}
    ORDER BY name`, [site.id, ...likeTerms.flatMap(term => [term, term])]);

  const projectionChecks = terms.map(() => "AND LOWER(CONCAT_WS(' ',ai.name,ai.summary,ai.offer_text)) LIKE ?").join(" ");
  const [projectionRows] = await db.execute(`SELECT ai.id search_location_id,ai.listing_id,ai.business_id,ai.name,ai.locality_name,ai.visibility,ai.offer_text
    FROM tags_ai_search_locations ai
    WHERE ai.site_id=? ${projectionChecks}
    ORDER BY ai.visibility='public' DESC,ai.name`, [site.id, ...likeTerms]);

  const liveChecks = terms.map(() => "AND LOWER(CONCAT_WS(' ',p.title,p.description,s.title,CAST(bl.content_json AS CHAR))) LIKE ?").join(" ");
  const [liveRows] = await db.execute(`SELECT p.business_id,p.id page_id,p.status page_status,s.id section_id,s.title section_title,s.is_visible section_visible,
      bl.id block_id,bl.type block_type,bl.is_visible block_visible,bl.content_json
    FROM tags_qr_pages p
    INNER JOIN tags_qr_page_sections s ON s.page_id=p.id
    INNER JOIN tags_qr_page_blocks bl ON bl.section_id=s.id
    WHERE p.business_id IS NOT NULL ${liveChecks}
    ORDER BY p.business_id,p.id,s.sort_order,bl.sort_order`, likeTerms);

  const analyticsLike = `%${normalized(query).split(" ").filter(Boolean).slice(0,2).join("%")}%`;
  const [analyticsRows] = await db.execute(`SELECT q.id,q.question_text,q.intent_type,q.task_types_json,q.taxonomy_ids_json,q.subjects_json,q.locality,
      q.result_count,q.recommended_count,q.answer_status,q.engine_version,q.created_at,
      GROUP_CONCAT(CONCAT(r.entity_key,' => ',r.candidate_name) ORDER BY r.position SEPARATOR ' | ') recommendations
    FROM tags_ai_destination_queries q
    LEFT JOIN tags_ai_destination_query_recommendations r ON r.query_id=q.id
    WHERE q.site_id=? AND LOWER(q.normalized_question) LIKE ?
    GROUP BY q.id ORDER BY q.id DESC LIMIT 5`, [site.id, analyticsLike]);

  const exactProjection = projectionRows.filter(row => normalized(row.offer_text).includes(phrase));
  const exactLive = liveRows.filter(row => normalized(row.content_json).includes(phrase));
  console.log(JSON.stringify({
    mode: "read-only", site, query, normalizedQuery: phrase, locality, terms,
    standardSearch: standardRows.map(row => ({ ...row, short_description: snippet(row.short_description), description: snippet(row.description), business_description: snippet(row.business_description) })),
    muchiProjection: projectionRows.map(row => ({ ...row, offer_text: snippet(row.offer_text), exactPhrase: normalized(row.offer_text).includes(phrase) })),
    publishedBlocks: liveRows.map(row => ({ ...row, content_json: snippet(row.content_json), exactPhrase: normalized(row.content_json).includes(phrase) })),
    exactPhraseSummary: {
      projectionBusinesses: exactProjection.map(row => ({ businessId: row.business_id, name: row.name, locality: row.locality_name })),
      liveBusinesses: [...new Map(exactLive.map(row => [row.business_id, { businessId: row.business_id, pageId: row.page_id }])).values()],
    },
    recentAnalytics: analyticsRows,
  }, null, 2));
  await db.end();
}

main().catch(error => {
  console.error(JSON.stringify({ ok:false,error:error.message,code:error.code || null }, null, 2));
  process.exitCode = 1;
});
