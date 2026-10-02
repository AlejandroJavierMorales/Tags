import { db } from "@/app/lib/tags-db";
import { knowledgeQueryTerms, rankKnowledgeRows, recommendationFromRanked, recommendationFromStoredRow } from "./knowledgeRanking";
import { inferDestinationSearchPolicy } from "./destinationSearchPolicy";

function parseJson(value) {
  if (!value) return {};
  if (typeof value === "object" && !Buffer.isBuffer(value)) return value;
  try { return JSON.parse(Buffer.isBuffer(value) ? value.toString("utf8") : String(value)); } catch { return {}; }
}


export async function getBusinessKnowledgeContext({ siteCode, businessId }) {
  if (!businessId || !/^[a-z0-9_-]{2,60}$/i.test(String(siteCode || ""))) return "";
  const [rows] = await db.execute(
    `SELECT d.entity_type,d.title,d.summary,d.searchable_text,d.attributes_json,d.commercial_json,d.availability_json
       FROM tags_ai_knowledge_documents d
       INNER JOIN tags_directory_sites ds ON ds.id=d.site_id AND ds.code=? AND ds.is_active=1
      WHERE d.business_id=? AND d.visibility='public'
      ORDER BY FIELD(d.entity_type,'business','business_knowledge','service','excursion','product','menu_item'),d.quality_score DESC,d.id
      LIMIT 120`,
    [siteCode, businessId]
  );
  if (!rows.length) return "";
  return rows.map(row => {
    const commercial = parseJson(row.commercial_json);
    return [
      `[${row.entity_type}] ${row.title}`,
      row.summary && String(row.summary).trim(),
      row.entity_type === "business_knowledge" && row.searchable_text && String(row.searchable_text).slice(0, 2500),
      commercial.price != null && `Precio publicado: ${commercial.currency || "ARS"} ${commercial.price}`,
      commercial.stockStatus && `Stock: ${commercial.stockStatus}`,
    ].filter(Boolean).join("\n");
  }).join("\n\n").slice(0, 16000);
}

export async function getKnowledgeCandidatesByKeys({ siteCode, entityKeys = [], userLocation = null }) {
  const keys = [...new Set(entityKeys.map(item => String(item || "").trim().slice(0, 255)).filter(Boolean))].slice(0, 8);
  if (!keys.length || !/^[a-z0-9_-]{2,60}$/i.test(String(siteCode || ""))) return [];
  const placeholders = keys.map(() => "?").join(",");
  const [rows] = await db.execute(
    `SELECT d.*,
            COALESCE(NULLIF(b.display_name,''),NULLIF(b.name,''),bl.display_name,d.title) business_name,
            (SELECT GROUP_CONCAT(DISTINCT n.name ORDER BY n.depth,n.name SEPARATOR ', ') FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id AND n.is_active=1 WHERE lt.listing_id=d.listing_id) listing_categories,
            (SELECT GROUP_CONCAT(DISTINCT n.name ORDER BY n.depth,n.name SEPARATOR ', ') FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id AND n.is_active=1 WHERE lt.listing_id=d.listing_id AND lt.is_primary=1) listing_primary_categories,
            CASE WHEN COALESCE(sl.is_free,1)=0 THEN 'subscriber' ELSE 'free' END relationship,
            COALESCE(sl.is_featured,0) is_featured,
            c.evidence_kind claim_evidence_kind,c.evidence_excerpt claim_evidence_excerpt
       FROM tags_ai_knowledge_documents d
       INNER JOIN tags_directory_sites ds ON ds.id=d.site_id AND ds.code=? AND ds.is_active=1
       LEFT JOIN tags_directory_listings bl ON bl.id=d.listing_id
       LEFT JOIN tags_directory_site_listings sl ON sl.site_id=d.site_id AND sl.listing_id=d.listing_id AND sl.publication_status='published'
       LEFT JOIN tags_businesses b ON b.id=d.business_id
       LEFT JOIN tags_ai_knowledge_claims c ON c.document_id=d.id AND c.status IN ('detected','confirmed')
      WHERE d.visibility='public' AND d.canonical_key IN (${placeholders})`,
    [siteCode, ...keys]
  );
  const byKey = new Map();
  for (const row of rows) if (!byKey.has(row.canonical_key)) byKey.set(row.canonical_key, recommendationFromStoredRow(row, userLocation));
  return keys.map(key => byKey.get(key)).filter(Boolean);
}

export async function searchKnowledgeIndex({ siteCode, query, searchIntent = "", mode = "unselected", userLocation = null, preferredLocality = "", excludedLocalities = [], limit = 6 }) {
  if (!/^[a-z0-9_-]{2,60}$/i.test(String(siteCode || ""))) return { available: false, candidates: [] };
  const terms = knowledgeQueryTerms(query);
  if (!terms.length) return { available: true, candidates: [] };
  const searchPolicy = inferDestinationSearchPolicy({ query, searchIntent, mode });
  const retrievalTerms = [...new Set(searchPolicy.retrievalTerms.flatMap(knowledgeQueryTerms))].slice(0, 24);
  const booleanQuery = retrievalTerms.map(term => `${term}*`).join(" ");
  try {
    const [rows] = await db.execute(
      `SELECT d.*,
              COALESCE(NULLIF(b.display_name,''),NULLIF(b.name,''),bl.display_name,d.title) business_name,
              (SELECT GROUP_CONCAT(DISTINCT n.name ORDER BY n.depth,n.name SEPARATOR ', ') FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id AND n.is_active=1 WHERE lt.listing_id=d.listing_id) listing_categories,
              (SELECT GROUP_CONCAT(DISTINCT n.name ORDER BY n.depth,n.name SEPARATOR ', ') FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id AND n.is_active=1 WHERE lt.listing_id=d.listing_id AND lt.is_primary=1) listing_primary_categories,
              COALESCE(sl.is_free,1) is_free,COALESCE(sl.is_featured,0) is_featured,
              CASE WHEN COALESCE(sl.is_free,1)=0 THEN 'subscriber' ELSE 'free' END relationship,
              c.evidence_kind claim_evidence_kind,c.evidence_excerpt claim_evidence_excerpt,c.confidence claim_confidence,
              MATCH(d.title,d.summary,d.searchable_text) AGAINST (? IN BOOLEAN MODE) lexical_score
         FROM tags_ai_knowledge_documents d
         INNER JOIN tags_directory_sites ds ON ds.id=d.site_id AND ds.code=? AND ds.is_active=1
         LEFT JOIN tags_directory_listings bl ON bl.id=d.listing_id
         LEFT JOIN tags_directory_site_listings sl ON sl.site_id=d.site_id AND sl.listing_id=d.listing_id AND sl.publication_status='published'
         LEFT JOIN tags_businesses b ON b.id=d.business_id
         LEFT JOIN tags_ai_knowledge_claims c ON c.document_id=d.id AND c.status IN ('detected','confirmed')
        WHERE d.visibility='public'
          AND MATCH(d.title,d.summary,d.searchable_text) AGAINST (? IN BOOLEAN MODE)
        ORDER BY MATCH(d.title,d.summary,d.searchable_text) AGAINST (? IN BOOLEAN MODE) DESC,d.quality_score DESC
        LIMIT 120`,
      [booleanQuery, siteCode, booleanQuery, booleanQuery]
    );
    const ranked = rankKnowledgeRows(rows, { query, searchIntent, userLocation, preferredLocality, excludedLocalities, searchPolicy });
    const unique = [];
    const seen = new Set();
    for (const item of ranked) {
      const key = Number(item.row.listing_id) || item.row.canonical_key;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(recommendationFromRanked(item));
      if (unique.length >= Math.max(1, Math.min(10, Number(limit) || 6))) break;
    }
    return { available: true, candidates: unique, terms, searchPolicy };
  } catch (error) {
    if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code)) return { available: false, candidates: [], error: error.code };
    throw error;
  }
}

export function buildKnowledgeIndexContext(candidates) {
  if (!candidates.length) return "No encontré una opción que publique exactamente lo solicitado.";
  return candidates.map((item, index) => [
    `${index + 1}. ${item.name}`,
    `ID autorizado para recomendación: ${item.entityKey}`,
    item.requestLabels?.length && `Responde a: ${item.requestLabels.join(", ")}`,
    !item.requestLabels?.length && item.requestLabel && `Responde a: ${item.requestLabel}`,
    item.matchedTitle && `Coincidencia concreta: ${item.matchedTitle}`,
    `Nivel de coincidencia: ${item.evidenceLevel === "structured" ? "producto o servicio publicado" : item.evidenceLevel === "category_inference" ? "alternativa por rubro; corresponde sugerir consulta previa" : "mención explícita del prestador"}`,
    item.evidenceExcerpt && `Dato concreto: ${String(item.evidenceExcerpt).slice(0, 500)}`,
    item.categories && `Categoría: ${item.categories}`,
    item.locality && `Localidad: ${item.locality}`,
    Number.isFinite(item.distanceKm) && `Distancia aproximada: ${item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)} m` : `${item.distanceKm.toFixed(1)} km`}`,
    item.commercial?.price != null && `Precio publicado: ${item.commercial.currency || "ARS"} ${item.commercial.price}`,
    item.commercial?.stockStatus && `Stock: ${item.commercial.stockStatus}`,
    [item.href && "Ver", item.whatsapp && "WhatsApp", item.phone && "Llamar", Number.isFinite(item.latitude) && Number.isFinite(item.longitude) && "Cómo llegar"].filter(Boolean).length > 0
      && `Acciones disponibles en la tarjeta: ${[item.href && "Ver", item.whatsapp && "WhatsApp", item.phone && "Llamar", Number.isFinite(item.latitude) && Number.isFinite(item.longitude) && "Cómo llegar"].filter(Boolean).join(", ")}`,
  ].filter(Boolean).join("\n")).join("\n\n").slice(0, 12000);
}

export function compareCandidateSets(legacyCandidates, indexCandidates) {
  const legacy = legacyCandidates.map(item => Number(item.id)).filter(Boolean);
  const indexed = indexCandidates.map(item => Number(item.id)).filter(Boolean);
  return {
    legacy,
    indexed,
    shared: indexed.filter(id => legacy.includes(id)),
    onlyLegacy: legacy.filter(id => !indexed.includes(id)),
    onlyIndex: indexed.filter(id => !legacy.includes(id)),
  };
}
