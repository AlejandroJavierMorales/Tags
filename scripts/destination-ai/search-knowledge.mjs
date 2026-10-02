import "dotenv/config";
import mysql from "mysql2/promise";

const option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) || "";
const SITE_CODE = option("site") || "calamuchitar";
const QUERY = option("query");

function normalize(value) {
  return String(value || "").toLocaleLowerCase("es-AR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function stem(value) {
  const term = normalize(value);
  return term.length > 4 ? term.replace(/(?:es|s)$/, "") : term;
}

function terms(value) {
  const stop = new Set(["de", "el", "en", "la", "las", "los", "me", "no", "si", "para", "por", "que", "quiero", "una", "un", "busco", "comprar", "necesito", "decime", "dime", "otra", "otras", "otro", "otros", "localidad", "localidades", "lugar", "lugares", "opcion", "opciones", "alternativa", "alternativas"]);
  return [...new Set(normalize(value).split(" ").filter(term => term.length >= 2 && !stop.has(term)).map(stem))].slice(0, 10);
}

function score(row, searchTerms) {
  const value = normalize(`${row.title} ${row.summary || ""} ${row.searchable_text || ""}`);
  const documentTerms = value.split(" ").map(stem);
  const termSet = new Set(documentTerms);
  const matches = searchTerms.filter(term => termSet.has(term)).length;
  const phrase = searchTerms.length > 1 && documentTerms.some((term, index) => searchTerms.every((queryTerm, offset) => documentTerms[index + offset] === queryTerm));
  const commerceCue = /\b(venta|vendemos|vende|comercializa|producto|productos|catalogo|stock|distribuidor|distribuidores)\b/.test(value);
  const structured = ["product", "service", "menu_item", "excursion"].includes(row.entity_type);
  return matches * 7 + (matches === searchTerms.length ? 18 : 0) + (phrase ? 6 : 0)
    + (phrase && commerceCue ? 24 : commerceCue ? 15 : 0) + (structured ? 20 : 0)
    + Math.min(5, Math.max(0, Number(row.lexical_score || 0)) / 2);
}

function excerpt(row, searchTerms, maxLength = 420) {
  const source = String(row.searchable_text || row.summary || "").replace(/\s+/g, " ").trim();
  const normalizedSource = normalize(source);
  const positions = searchTerms.map(term => normalizedSource.search(new RegExp(`\\b${term}(?:es|s)?\\b`))).filter(position => position >= 0);
  if (!positions.length) return source.slice(0, maxLength);
  const start = Math.max(0, Math.min(...positions) - 120);
  const end = Math.min(source.length, start + maxLength);
  return `${start > 0 ? "…" : ""}${source.slice(start, end).trim()}${end < source.length ? "…" : ""}`;
}

async function main() {
  if (!QUERY) throw new Error("Falta --query=texto");
  const required = ["DB_HOST", "DB_USER", "DB_DATABASE_NAME"];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) throw new Error(`Faltan variables: ${missing.join(", ")}`);
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "", database: process.env.DB_DATABASE_NAME, charset: "utf8mb4",
  });
  try {
    const searchTerms = terms(QUERY);
    const booleanQuery = searchTerms.map(term => `${term}*`).join(" ");
    const [rows] = await connection.execute(
      `SELECT d.id,d.canonical_key,d.entity_type,d.title,d.business_id,d.listing_id,d.summary,d.searchable_text,
              COALESCE(NULLIF(b.display_name,''),NULLIF(b.name,''),l.display_name,d.title) business_name,
              c.evidence_kind,c.evidence_excerpt,
              MATCH(d.title,d.summary,d.searchable_text) AGAINST (? IN BOOLEAN MODE) lexical_score
         FROM tags_ai_knowledge_documents d
         INNER JOIN tags_directory_sites ds ON ds.id=d.site_id AND ds.code=? AND ds.is_active=1
         LEFT JOIN tags_directory_listings l ON l.id=d.listing_id
         LEFT JOIN tags_businesses b ON b.id=d.business_id
         LEFT JOIN tags_ai_knowledge_claims c ON c.document_id=d.id AND c.status IN ('detected','confirmed')
        WHERE d.visibility='public'
          AND MATCH(d.title,d.summary,d.searchable_text) AGAINST (? IN BOOLEAN MODE)
        ORDER BY lexical_score DESC,d.quality_score DESC
        LIMIT 20`,
      [booleanQuery, SITE_CODE, booleanQuery]
    );
    const required = searchTerms.length <= 3 ? searchTerms.length : Math.max(2, Math.ceil(searchTerms.length * 0.6));
    const ranked = rows.map(row => ({ ...row, ranking_score: score(row, searchTerms), matched_excerpt: row.evidence_excerpt || excerpt(row, searchTerms) }))
      .filter(row => searchTerms.filter(term => new Set(normalize(`${row.title} ${row.summary || ""} ${row.searchable_text || ""}`).split(" ").map(stem)).has(term)).length >= required)
      .sort((a, b) => b.ranking_score - a.ranking_score || Number(b.lexical_score) - Number(a.lexical_score))
      .map(({ searchable_text, ...row }) => row);
    process.stdout.write(`${JSON.stringify({ mode: "read-only", siteCode: SITE_CODE, query: QUERY, normalizedTerms: searchTerms, booleanQuery, results: ranked }, null, 2)}\n`);
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  process.stderr.write(`INDEX_SEARCH_ERROR: ${error.message}\n`);
  process.exitCode = 1;
});
