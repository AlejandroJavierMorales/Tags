import { db } from "@/app/lib/tags-db";
import { normalizeDestinationTerm } from "./destinationTaxonomyCore.js";
import { rankDestinationCandidates } from "./destinationRankingCore.js";
import { extractRequestedCapacity } from "./destinationCapacity.js";
import { stemDestinationSearchTerm } from "./destinationLexicalCore.js";
import { shouldIncludeCategoryProviders } from "./destinationRetrievalPolicy.js";

const STOP_WORDS = new Set(["a", "al", "algo", "con", "de", "del", "donde", "el", "en", "es", "la", "las", "lo", "los", "me", "mi", "para", "por", "que", "quiero", "un", "una", "y", "ahora", "tambien", "ademas", "buscar", "busco", "comprar", "compro", "conseguir", "decime", "dime", "necesito", "podria", "puedo", "recomenda", "recomendame", "tener", "tengo"]);

function terms(value) {
  return [...new Set(normalizeDestinationTerm(value).split(" ").filter(term => (term.length > 1 || /^\d+$/u.test(term)) && !STOP_WORDS.has(term)).map(stemDestinationSearchTerm).filter(Boolean))].slice(0, 10);
}

function searchParts(value) {
  const all=terms(value);const long=all.filter(term=>term.length>=4);const short=all.filter(term=>term.length<4);return{all,long,short,shortPatterns:short.map(term=>`(^|[^[:alnum:]])${term}([^[:alnum:]]|$)`),boolean:long.map(term=>`+${term}*`).join(" ")};
}

function validCoordinate(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function distanceKm(from, latitude, longitude) {
  if (!from || !validCoordinate(latitude, longitude)) return null;
  const radians = value => value * Math.PI / 180;
  const lat = Number(latitude);
  const lon = Number(longitude);
  const dLat = radians(lat - Number(from.latitude));
  const dLon = radians(lon - Number(from.longitude));
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(Number(from.latitude))) * Math.cos(radians(lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function locationCandidate(row, task, userLocation, evidence = {}) {
  const distance = distanceKm(userLocation, row.latitude, row.longitude);
  return {
    id: Number(row.listing_id || row.id),
    businessId: Number(row.business_id || 0) || null,
    entityKey: row.canonical_key,
    entityType: evidence.entityType || "business_location",
    name: row.name,
    matchedTitle: evidence.matchedTitle || "",
    description: evidence.description || row.summary || "",
    locality: row.locality_name || "",
    imageUrl: evidence.imageUrl || row.primary_image_url || null,
    href: evidence.href || row.public_url || null,
    phone: row.phone || null,
    whatsapp: row.whatsapp || null,
    websiteUrl: row.website_url || null,
    latitude: validCoordinate(row.latitude, row.longitude) ? Number(row.latitude) : null,
    longitude: validCoordinate(row.latitude, row.longitude) ? Number(row.longitude) : null,
    distanceKm: distance,
    matchType: "exact",
    evidenceLevel: evidence.level || "structural_category",
    evidenceExcerpt: evidence.excerpt || row.summary || "",
    requestLabel: task.subject || task.query,
    requestQuery: task.query,
    taskType: task.type,
    commercial: evidence.commercial || {},
    rankingScore: Number(row.match_score || 0) + Number(row.quality_score || 0) / 10 + (row.is_featured ? 2 : 0) - (distance == null ? 0 : Math.min(distance, 100) / 20),
  };
}

function placeholders(values) {
  return values.map(() => "?").join(",");
}

async function searchByCategory({ siteCode, task, userLocation, limit }) {
  const ids = [...new Set((task.taxonomyNodeIds || []).map(Number).filter(Number.isInteger))].slice(0, 6);
  if (!ids.length) return [];
  const locality = task.localityPreference === "specified" ? normalizeDestinationTerm(task.locality) : "";
  const query = searchParts(task.query).boolean;
  const [rows] = await db.execute(
    `SELECT DISTINCT l.*,
            ${query ? "MATCH(l.name,l.summary,l.offer_text) AGAINST (? IN BOOLEAN MODE)" : "0"} match_score
       FROM tags_ai_search_locations l
       INNER JOIN tags_directory_sites s ON s.id=l.site_id AND s.code=? AND s.is_active=1
       INNER JOIN tags_ai_search_location_categories lc
         ON lc.search_location_id=l.id AND lc.site_id=l.site_id AND lc.assignment_status<>'rejected'
       INNER JOIN tags_directory_taxonomy_closure tc
         ON tc.descendant_id=lc.taxonomy_node_id AND tc.ancestor_id IN (${placeholders(ids)})
      WHERE l.visibility='public'
        ${locality ? "AND EXISTS(SELECT 1 FROM tags_ai_search_location_places lp WHERE lp.search_location_id=l.id AND lp.normalized_name LIKE ?)" : ""}
      ORDER BY match_score DESC,l.is_featured DESC,l.quality_score DESC
      LIMIT ?`,
    [query && query, siteCode, ...ids, locality && `%${locality}%`, Math.max(limit * 5, 20)].filter(value => value !== false && value !== "")
  );
  return rows.map(row => locationCandidate(row, task, userLocation));
}

function itemTypesForTask(type) {
  if (type === "find_dish") return ["dish"];
  if (type === "find_service") return ["service"];
  if (type === "find_experience") return ["experience", "service"];
  return ["product"];
}

async function searchItems({ siteCode, task, userLocation, limit }) {
  const search=searchParts(task.query);const query=search.boolean;
  if (!search.all.length) return [];
  const itemTypes = itemTypesForTask(task.type);
  const capacity=extractRequestedCapacity([task.query,...(task.constraints||[])]);
  const locality = task.localityPreference === "specified" ? normalizeDestinationTerm(task.locality) : "";
  const [rows] = await db.execute(
    `SELECT l.*,i.canonical_key item_key,i.item_type,i.name item_name,i.description item_description,
            i.price,i.sale_price,i.currency,i.stock_status,i.public_url item_url,i.primary_image_url item_image,
            ${query?"MATCH(i.name,i.category_text,i.searchable_text) AGAINST (? IN BOOLEAN MODE)":"0"} match_score
       FROM tags_ai_search_items i
       INNER JOIN tags_ai_search_locations l ON l.id=i.search_location_id AND l.visibility='public'
       INNER JOIN tags_directory_sites s ON s.id=i.site_id AND s.code=? AND s.is_active=1
      WHERE i.visibility='public' AND i.verification_status<>'rejected'
        AND i.item_type IN (${placeholders(itemTypes)})
        ${query?"AND MATCH(i.name,i.category_text,i.searchable_text) AGAINST (? IN BOOLEAN MODE)":""}
        ${search.shortPatterns.map(()=>"AND LOWER(CONCAT_WS(' ',i.name,i.category_text,i.searchable_text)) REGEXP ?").join(" ")}
        ${capacity?"AND CAST(JSON_UNQUOTE(JSON_EXTRACT(i.attributes_json,'$.capacity')) AS UNSIGNED)>=?":""}
        ${locality ? "AND EXISTS(SELECT 1 FROM tags_ai_search_location_places lp WHERE lp.search_location_id=l.id AND lp.normalized_name LIKE ?)" : ""}
      ORDER BY match_score DESC,l.is_featured DESC,l.quality_score DESC
      LIMIT ?`,
    [...(query?[query]:[]),siteCode,...itemTypes,...(query?[query]:[]),...search.shortPatterns,...(capacity?[capacity]:[]),...(locality ? [`%${locality}%`] : []), Math.max(limit * 6, 24)]
  );
  return rows.map(row => locationCandidate(row, task, userLocation, {
    entityType: row.item_type,
    matchedTitle: row.item_name,
    description: row.item_description || row.summary || "",
    imageUrl: row.item_image || row.primary_image_url,
    href: row.item_url || row.public_url,
    level: "structured_item",
    excerpt: [row.item_name, row.item_description].filter(Boolean).join(": ").slice(0, 700),
    commercial: { price: row.price, salePrice: row.sale_price, currency: row.currency, stockStatus: row.stock_status },
  }));
}

async function searchCapacityItems({ siteCode, task, userLocation, limit }) {
  const capacity=extractRequestedCapacity([task.query,...(task.constraints||[])]);
  const ids=[...new Set((task.taxonomyNodeIds||[]).map(Number).filter(Number.isInteger))].slice(0,6);
  if(!capacity||!ids.length)return[];
  const locality=task.localityPreference==="specified"?normalizeDestinationTerm(task.locality):"";
  const [rows]=await db.execute(`SELECT DISTINCT l.*,i.item_type,i.name item_name,i.description item_description,
      i.public_url item_url,i.primary_image_url item_image,i.price,i.sale_price,i.currency,i.stock_status,
      CAST(JSON_UNQUOTE(JSON_EXTRACT(i.attributes_json,'$.capacity')) AS UNSIGNED) published_capacity,
      (100-ABS(CAST(JSON_UNQUOTE(JSON_EXTRACT(i.attributes_json,'$.capacity')) AS SIGNED)-?)) match_score
    FROM tags_ai_search_items i
    INNER JOIN tags_ai_search_locations l ON l.id=i.search_location_id AND l.visibility='public'
    INNER JOIN tags_directory_sites s ON s.id=i.site_id AND s.code=? AND s.is_active=1
    INNER JOIN tags_ai_search_location_categories lc ON lc.search_location_id=l.id AND lc.site_id=l.site_id AND lc.assignment_status<>'rejected'
    INNER JOIN tags_directory_taxonomy_closure tc ON tc.descendant_id=lc.taxonomy_node_id AND tc.ancestor_id IN (${placeholders(ids)})
    WHERE i.visibility='public' AND i.verification_status<>'rejected'
      AND JSON_EXTRACT(i.attributes_json,'$.capacity') IS NOT NULL
      AND CAST(JSON_UNQUOTE(JSON_EXTRACT(i.attributes_json,'$.capacity')) AS UNSIGNED)>=?
      ${locality?"AND EXISTS(SELECT 1 FROM tags_ai_search_location_places lp WHERE lp.search_location_id=l.id AND lp.normalized_name LIKE ?)":""}
    ORDER BY published_capacity ASC,l.is_featured DESC,l.quality_score DESC LIMIT ?`,
    [capacity,siteCode,...ids,capacity,...(locality?[`%${locality}%`]:[]),Math.max(limit*4,16)]);
  return rows.map(row=>locationCandidate(row,task,userLocation,{entityType:row.item_type,matchedTitle:row.item_name,
    description:row.item_description||row.summary||"",imageUrl:row.item_image||row.primary_image_url,href:row.item_url||row.public_url,
    level:"structured_item",excerpt:`${row.item_name}: capacidad publicada para ${row.published_capacity} personas${row.item_description?`. ${row.item_description}`:""}`.slice(0,700),
    commercial:{price:row.price,salePrice:row.sale_price,currency:row.currency,stockStatus:row.stock_status,capacity:Number(row.published_capacity)}}));
}

async function searchDeclaredOffers({ siteCode, task, userLocation, limit }) {
  const ids = [...new Set((task.taxonomyNodeIds || []).map(Number).filter(Number.isInteger))].slice(0, 6);
  const search=searchParts(task.query);const query=search.boolean;
  if (!search.all.length) return [];
  const locality = task.localityPreference === "specified" ? normalizeDestinationTerm(task.locality) : "";
  const [rows] = await db.execute(
    `SELECT DISTINCT l.*,${query?"MATCH(l.name,l.summary,l.offer_text) AGAINST (? IN BOOLEAN MODE)":"0"} match_score
       FROM tags_ai_search_locations l
       INNER JOIN tags_directory_sites s ON s.id=l.site_id AND s.code=? AND s.is_active=1
       ${task.type === "find_dish" && ids.length ? `INNER JOIN tags_ai_search_location_categories lc ON lc.search_location_id=l.id AND lc.site_id=l.site_id AND lc.assignment_status<>'rejected' INNER JOIN tags_directory_taxonomy_closure tc ON tc.descendant_id=lc.taxonomy_node_id AND tc.ancestor_id IN (${placeholders(ids)})` : ""}
      WHERE l.visibility='public'
        ${query?"AND MATCH(l.name,l.summary,l.offer_text) AGAINST (? IN BOOLEAN MODE)":""}
        ${search.shortPatterns.map(()=>"AND LOWER(CONCAT_WS(' ',l.name,l.summary,l.offer_text)) REGEXP ?").join(" ")}
        ${locality ? "AND EXISTS(SELECT 1 FROM tags_ai_search_location_places lp WHERE lp.search_location_id=l.id AND lp.normalized_name LIKE ?)" : ""}
      ORDER BY match_score DESC,l.is_featured DESC,l.quality_score DESC
      LIMIT ?`,
    [...(query?[query]:[]),siteCode, ...(task.type === "find_dish" && ids.length ? ids : []),...(query?[query]:[]),...search.shortPatterns, ...(locality ? [`%${locality}%`] : []), Math.max(limit * 4, 16)]
  );
  return rows.map(row => locationCandidate(row, task, userLocation, { level: "explicit_business_text", excerpt: row.summary || row.offer_text || "" }));
}

async function searchBusinessName({ siteCode, task, userLocation, limit }) {
  const search=searchParts(task.query);const query=search.boolean;
  if (!search.all.length) return [];
  const [rows] = await db.execute(
    `SELECT l.*,${query?"MATCH(l.name,l.summary,l.offer_text) AGAINST (? IN BOOLEAN MODE)":"0"} match_score
       FROM tags_ai_search_locations l
       INNER JOIN tags_directory_sites s ON s.id=l.site_id AND s.code=? AND s.is_active=1
      WHERE l.visibility='public' ${query?"AND MATCH(l.name,l.summary,l.offer_text) AGAINST (? IN BOOLEAN MODE)":""}
        ${search.shortPatterns.map(()=>"AND LOWER(CONCAT_WS(' ',l.name,l.summary,l.offer_text)) REGEXP ?").join(" ")}
      ORDER BY (LOWER(l.name)=?) DESC,match_score DESC,l.quality_score DESC LIMIT ?`,
    [...(query?[query]:[]),siteCode,...(query?[query]:[]),...search.shortPatterns,normalizeDestinationTerm(task.query), Math.max(limit * 3, 12)]
  );
  return rows.map(row => locationCandidate(row, task, userLocation, { level: "business_identity" }));
}

async function searchTourism({ siteCode, task, userLocation, limit }) {
  const search=searchParts(task.query);const query=search.boolean;
  const ids = [...new Set((task.taxonomyNodeIds || []).map(Number).filter(Number.isInteger))].slice(0, 6);
  const locality = task.localityPreference === "specified" ? normalizeDestinationTerm(task.locality) : "";
  const type = task.type === "find_event" ? "event" : null;
  const params = [...(query?[query]:[]),siteCode,...ids,...(type?[type]:[]),...(query?[query]:[]),...search.shortPatterns,...(locality ? [`%${locality}%`] : []),Math.max(limit * 5,20)];
  const [rows] = await db.execute(
    `SELECT c.*,c.id content_id,${query ? "MATCH(c.title,c.summary,c.searchable_text) AGAINST (? IN BOOLEAN MODE)" : "0"} match_score
       FROM tags_ai_tourism_contents c
       INNER JOIN tags_directory_sites s ON s.id=c.site_id AND s.code=? AND s.is_active=1
       ${ids.length ? `INNER JOIN tags_ai_tourism_content_categories cc ON cc.content_id=c.id AND cc.site_id=c.site_id INNER JOIN tags_directory_taxonomy_closure tc ON tc.descendant_id=cc.taxonomy_node_id AND tc.ancestor_id IN (${placeholders(ids)})` : ""}
      WHERE c.status='published' AND (c.valid_until IS NULL OR c.valid_until>=NOW())
        ${type ? "AND c.content_type=?" : ""}
        ${query ? "AND MATCH(c.title,c.summary,c.searchable_text) AGAINST (? IN BOOLEAN MODE)" : ""}
        ${search.shortPatterns.map(()=>"AND LOWER(CONCAT_WS(' ',c.title,c.summary,c.searchable_text)) REGEXP ?").join(" ")}
        ${locality ? "AND LOWER(COALESCE(c.locality_name,'')) LIKE ?" : ""}
      ORDER BY match_score DESC,c.reviewed_at DESC,c.updated_at DESC LIMIT ?`,
    params
  );
  return rows.map(row => ({
    id: Number(row.content_id), businessId: null, entityKey: `tourism_content:${row.content_id}`, entityType: row.content_type,
    name: row.title, matchedTitle: row.title, description: row.summary || row.description || "", locality: row.locality_name || "",
    imageUrl: row.primary_image_url || null, href: row.public_url || null, phone: null, whatsapp: null, websiteUrl: null,
    latitude: validCoordinate(row.latitude, row.longitude) ? Number(row.latitude) : null,
    longitude: validCoordinate(row.latitude, row.longitude) ? Number(row.longitude) : null,
    distanceKm: distanceKm(userLocation, row.latitude, row.longitude), matchType: "exact", evidenceLevel: "tourism_editorial",
    evidenceExcerpt: row.summary || "", requestLabel: task.subject || task.query, requestQuery: task.query, taskType: task.type,
    commercial: {}, rankingScore: Number(row.match_score || 0),
  }));
}

export async function searchDestinationTaskV2({ siteCode, task, userLocation = null, limit = 4 }) {
  try {
    let candidates = [];
    if (task.resultReferenceKeys?.length && task.type === "follow_up") return { available: true, candidates: [] };
    if (["find_experience", "find_event", "public_local_info", "plan_day"].includes(task.type)) {
      const [tourism, providers] = await Promise.all([
        searchTourism({ siteCode, task, userLocation, limit }),
        task.taxonomyNodeIds?.length ? searchByCategory({ siteCode, task, userLocation, limit }) : Promise.resolve([]),
      ]);
      candidates = [...tourism, ...providers];
    } else if (["find_product", "find_dish", "find_service"].includes(task.type)) {
      const [items, declared, categoryProviders] = await Promise.all([
        searchItems({ siteCode, task, userLocation, limit }),
        searchDeclaredOffers({ siteCode, task, userLocation, limit }),
        shouldIncludeCategoryProviders(task)
          ? searchByCategory({ siteCode, task, userLocation, limit })
          : Promise.resolve([]),
      ]);
      candidates = [...items, ...declared, ...categoryProviders];
    } else if (task.type === "inspect_business") {
      candidates = await searchBusinessName({ siteCode, task, userLocation, limit });
    } else if (task.taxonomyNodeIds?.length) {
      const [categories,capacities]=await Promise.all([
        searchByCategory({ siteCode, task, userLocation, limit }),
        searchCapacityItems({siteCode,task,userLocation,limit}),
      ]);
      candidates=[...capacities,...categories];
    }
    return { available: true, candidates: rankDestinationCandidates(candidates, limit) };
  } catch (error) {
    if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code)) return { available: false, candidates: [], error: error.code };
    throw error;
  }
}

export async function isDestinationEngineV2Available(siteCode) {
  if (!/^[a-z0-9_-]{2,60}$/i.test(String(siteCode || ""))) return false;
  try {
    const [rows] = await db.execute(`SELECT 1 ready FROM tags_ai_search_locations l INNER JOIN tags_directory_sites s ON s.id=l.site_id AND s.code=? LIMIT 1`, [siteCode]);
    return rows.length > 0;
  } catch (error) {
    if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code)) return false;
    throw error;
  }
}

export async function getDestinationCandidatesByKeysV2({ siteCode, entityKeys = [], userLocation = null }) {
  const keys = [...new Set(entityKeys.map(value => String(value || "").trim()).filter(Boolean))].slice(0, 20);
  if (!keys.length) return [];
  const locationKeys = keys.filter(key => key.startsWith("business_location:"));
  const tourismIds = keys.filter(key => key.startsWith("tourism_content:")).map(key => Number(key.split(":")[1])).filter(Number.isInteger);
  const results = [];
  if (locationKeys.length) {
    const [rows] = await db.execute(`SELECT l.* FROM tags_ai_search_locations l INNER JOIN tags_directory_sites s ON s.id=l.site_id AND s.code=? WHERE l.visibility='public' AND l.canonical_key IN (${placeholders(locationKeys)})`, [siteCode, ...locationKeys]);
    results.push(...rows.map(row => locationCandidate(row, { type: "follow_up", query: "", subject: "" }, userLocation)));
  }
  if (tourismIds.length) {
    const [rows] = await db.execute(`SELECT c.*,c.id content_id FROM tags_ai_tourism_contents c INNER JOIN tags_directory_sites s ON s.id=c.site_id AND s.code=? WHERE c.status='published' AND c.id IN (${placeholders(tourismIds)})`, [siteCode, ...tourismIds]);
    results.push(...rows.map(row => ({ id:Number(row.id),businessId:null,entityKey:`tourism_content:${row.id}`,entityType:row.content_type,name:row.title,description:row.summary||row.description||"",locality:row.locality_name||"",imageUrl:row.primary_image_url||null,href:row.public_url||null,latitude:validCoordinate(row.latitude,row.longitude)?Number(row.latitude):null,longitude:validCoordinate(row.latitude,row.longitude)?Number(row.longitude):null,distanceKm:distanceKm(userLocation,row.latitude,row.longitude),evidenceLevel:"tourism_editorial",evidenceExcerpt:row.summary||"",commercial:{} })));
  }
  const byKey = new Map(results.map(item => [item.entityKey, item]));
  return keys.map(key => byKey.get(key)).filter(Boolean);
}

export function buildDestinationV2Context(tasks, candidates) {
  if (!candidates.length) return "No hay candidatos estructuralmente elegibles para esta consulta.";
  return tasks.map((task, taskIndex) => {
    const rows = candidates.filter(item => item.taskIndex === taskIndex || item.taskIndexes?.includes(taskIndex));
    return [`TAREA ${taskIndex + 1}: ${task.type} — ${task.subject || task.query}`, ...rows.map((item, index) => [
      `${index + 1}. ${item.name}`,
      `ID autorizado: ${item.entityKey}`,
      item.matchedTitle && `Coincidencia: ${item.matchedTitle}`,
      item.evidenceExcerpt && `Evidencia: ${String(item.evidenceExcerpt).slice(0, 500)}`,
      item.locality && `Localidad: ${item.locality}`,
      Number.isFinite(item.distanceKm) && `Distancia aproximada: ${item.distanceKm.toFixed(1)} km`,
      item.commercial?.price != null && `Precio publicado: ${item.commercial.currency || "ARS"} ${item.commercial.price}`,
    ].filter(Boolean).join("\n"))].join("\n");
  }).join("\n\n").slice(0, 14000);
}
