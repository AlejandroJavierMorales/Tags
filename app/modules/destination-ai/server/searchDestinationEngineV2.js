import { db } from "@/app/lib/tags-db";
import { normalizeDestinationTerm } from "./destinationTaxonomyCore.js";
import { rankDestinationCandidates } from "./destinationRankingCore.js";
import { extractRequestedCapacity } from "./destinationCapacity.js";
import { stemDestinationSearchTerm } from "./destinationLexicalCore.js";
import { shouldIncludeCategoryProviders } from "./destinationRetrievalPolicy.js";
import { tourismContextEvidence, tourismContextScore } from "./destinationTourismContext.js";
import { explicitOfferStrength } from "./destinationOfferEvidence.js";

const STOP_WORDS = new Set(["a", "al", "algo", "con", "de", "del", "donde", "el", "en", "es", "la", "las", "lo", "los", "me", "mi", "para", "por", "que", "quiero", "un", "una", "y", "ahora", "tambien", "ademas", "buscar", "busco", "comprar", "compro", "conseguir", "decime", "dime", "necesito", "podria", "puedo", "recomenda", "recomendame", "tener", "tengo", "asesora", "asesorame", "asesorar", "asesoramiento", "consulta", "consultar", "contame", "informacion", "saber", "sobre", "tema"]);

function terms(value) {
  return [...new Set(normalizeDestinationTerm(value).split(" ").filter(term => (term.length > 1 || /^\d+$/u.test(term)) && !STOP_WORDS.has(term)).map(stemDestinationSearchTerm).filter(Boolean))].slice(0, 10);
}

function searchParts(value) {
  const all=terms(value);const long=all.filter(term=>term.length>=4);const short=all.filter(term=>term.length<4);return{all,long,short,shortPatterns:short.map(term=>`(^|[^[:alnum:]])${term}([^[:alnum:]]|$)`),boolean:long.map(term=>`+${term}*`).join(" ")};
}

function matchingTextExcerpt(value, queryTerms, maxLength = 900) {
  const source = String(value || "").replace(/\s+/g, " ").trim();
  if (!source) return "";
  const normalizedSource = normalizeDestinationTerm(source);
  const positions = queryTerms
    .map(term => normalizedSource.indexOf(term))
    .filter(position => position >= 0);
  if (!positions.length) return source.slice(0, maxLength);
  const start = Math.max(0, Math.min(...positions) - Math.floor(maxLength / 3));
  const end = Math.min(source.length, start + maxLength);
  return `${start > 0 ? "…" : ""}${source.slice(start, end).trim()}${end < source.length ? "…" : ""}`;
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

function objectValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return {};
  try { const parsed=JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; }
  catch { return {}; }
}

function readablePublicText(value, output = []) {
  if (typeof value === "string") {
    const text = value.replace(/\s+/g, " ").trim();
    if (text && !/^https?:\/\//i.test(text) && !/^#[0-9a-f]{3,8}$/i.test(text)) output.push(text);
  } else if (Array.isArray(value)) value.forEach(item => readablePublicText(item, output));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (!/^(?:url|image|images|storagePath|styles?|color|font|animation)/i.test(key)) readablePublicText(item, output);
    }
  }
  return output;
}

function readableBlockContent(value) {
  const source = String(value || "");
  const output = [];
  for (const fragment of source.split(/\r?\n/).filter(Boolean)) {
    try { readablePublicText(JSON.parse(fragment), output); }
    catch { output.push(fragment.replace(/\s+/g, " ").trim()); }
  }
  return output.filter(Boolean).join(" | ");
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
    planSlot: task.planSlot || null,
    commercial: evidence.commercial || {},
    relationship: row.relationship || "free",
    commercialPriority: row.relationship === "subscriber" ? 1 : 0,
    explicitOfferStrength: Number(evidence.explicitOfferStrength || 0),
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
        ${locality ? "AND (LOWER(COALESCE(l.locality_name,'')) LIKE ? OR EXISTS(SELECT 1 FROM tags_ai_search_location_places lp WHERE lp.search_location_id=l.id AND lp.normalized_name LIKE ?))" : ""}
      ORDER BY match_score DESC,l.is_featured DESC,l.quality_score DESC
      LIMIT ?`,
    [query && query, siteCode, ...ids, ...(locality ? [`%${locality}%`, `%${locality}%`] : []), Math.max(limit * 5, 20)].filter(value => value !== false && value !== "")
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
        ${locality ? "AND (EXISTS(SELECT 1 FROM tags_ai_search_location_places lp WHERE lp.search_location_id=l.id AND lp.normalized_name LIKE ?) OR LOWER(COALESCE(l.offer_text,'')) LIKE ?)" : ""}
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
    [...(query?[query]:[]),siteCode, ...(task.type === "find_dish" && ids.length ? ids : []),...(query?[query]:[]),...search.shortPatterns, ...(locality ? [`%${locality}%`, `%${locality}%`] : []), Math.max(limit * 4, 16)]
  );
  return rows.map(row => {
    const publishedText = row.offer_text || row.summary || "";
    const strength = explicitOfferStrength(publishedText, task);
    return locationCandidate(row, task, userLocation, {
      level: "explicit_business_text",
      excerpt: matchingTextExcerpt(publishedText, search.all),
      explicitOfferStrength: strength,
    });
  });
}

async function searchLivePublishedOffers({ siteCode, task, userLocation, limit }) {
  const search = searchParts(task.query);
  if (!search.all.length) return [];
  const locality = task.localityPreference === "specified" ? normalizeDestinationTerm(task.locality) : "";
  const termChecks = search.all.map(() => `AND EXISTS(
    SELECT 1 FROM tags_qr_pages page
    INNER JOIN tags_qr_page_sections sec ON sec.page_id=page.id AND sec.is_visible=1
    LEFT JOIN tags_qr_page_blocks bl ON bl.section_id=sec.id AND bl.is_visible=1
    WHERE page.business_id=dl.business_id AND page.status='published'
      AND (LOWER(COALESCE(sec.title,'')) LIKE ? OR LOWER(CAST(bl.content_json AS CHAR)) LIKE ?)
  )`).join(" ");
  const [rows] = await db.execute(
    `SELECT l.*,
            (SELECT GROUP_CONCAT(CAST(bl.content_json AS CHAR) ORDER BY sec.sort_order,bl.sort_order SEPARATOR '\n')
               FROM tags_qr_pages page
               INNER JOIN tags_qr_page_sections sec ON sec.page_id=page.id AND sec.is_visible=1
               INNER JOIN tags_qr_page_blocks bl ON bl.section_id=sec.id AND bl.is_visible=1
              WHERE page.business_id=dl.business_id AND page.status='published') live_content
       FROM tags_ai_search_locations l
       INNER JOIN tags_directory_sites s ON s.id=l.site_id AND s.code=? AND s.is_active=1
       INNER JOIN tags_directory_listings dl ON dl.id=l.listing_id AND dl.status='published'
      WHERE l.visibility='public' ${termChecks}
        ${locality ? "AND (EXISTS(SELECT 1 FROM tags_ai_search_location_places lp WHERE lp.search_location_id=l.id AND lp.normalized_name LIKE ?) OR LOWER(COALESCE(l.offer_text,'')) LIKE ?)" : ""}
      ORDER BY l.is_featured DESC,l.quality_score DESC
      LIMIT ?`,
    [siteCode, ...search.all.flatMap(term => [`%${term}%`, `%${term}%`]), ...(locality ? [`%${locality}%`, `%${locality}%`] : []), Math.max(limit * 4, 16)]
  );
  return rows.map(row => {
    const liveText = readableBlockContent(row.live_content);
    return locationCandidate(row, task, userLocation, {
      level: "explicit_business_text",
      excerpt: matchingTextExcerpt(liveText, search.all),
      explicitOfferStrength: explicitOfferStrength(liveText, task),
    });
  });
}

export async function getDestinationBusinessContextV2({ siteCode, businessIds = [] }) {
  const ids = [...new Set(businessIds.map(Number).filter(Number.isInteger))].slice(0, 4);
  if (!ids.length || !/^[a-z0-9_-]{2,60}$/i.test(String(siteCode || ""))) return "";
  const [locations, blockRows, items] = await Promise.all([
    db.execute(
      `SELECT l.business_id,l.name,l.summary,l.offer_text
         FROM tags_ai_search_locations l
         INNER JOIN tags_directory_sites s ON s.id=l.site_id AND s.code=? AND s.is_active=1
        WHERE l.visibility='public' AND l.business_id IN (${placeholders(ids)})
        ORDER BY l.quality_score DESC,l.id`,
      [siteCode, ...ids]
    ).then(([rows]) => rows),
    db.execute(
      `SELECT l.business_id,bl.content_json
         FROM tags_ai_search_locations l
         INNER JOIN tags_directory_sites s ON s.id=l.site_id AND s.code=? AND s.is_active=1
         INNER JOIN tags_directory_listings dl ON dl.id=l.listing_id AND dl.status='published'
         INNER JOIN tags_qr_page_sections sec ON sec.page_id=dl.qr_page_id AND sec.is_visible=1
         INNER JOIN tags_qr_page_blocks bl ON bl.section_id=sec.id AND bl.is_visible=1
        WHERE l.visibility='public' AND l.business_id IN (${placeholders(ids)})
        ORDER BY l.business_id,sec.sort_order,bl.sort_order`,
      [siteCode, ...ids]
    ).then(([rows]) => rows),
    db.execute(
      `SELECT i.business_id,i.item_type,i.name,i.description,i.category_text,i.price,i.sale_price,i.currency,i.stock_status
         FROM tags_ai_search_items i
         INNER JOIN tags_directory_sites s ON s.id=i.site_id AND s.code=? AND s.is_active=1
        WHERE i.visibility='public' AND i.verification_status<>'rejected' AND i.business_id IN (${placeholders(ids)})
        ORDER BY i.business_id,i.item_type,i.name
        LIMIT 160`,
      [siteCode, ...ids]
    ).then(([rows]) => rows),
  ]);
  const byBusiness = new Map();
  for (const row of locations) {
    if (!byBusiness.has(Number(row.business_id))) byBusiness.set(Number(row.business_id), {
      name: row.name,
      texts: [],
      items: [],
    });
    const entry = byBusiness.get(Number(row.business_id));
    const text = [row.offer_text, row.summary].filter(Boolean).join(" | ").trim();
    if (text && !entry.texts.includes(text)) entry.texts.push(text);
  }
  for (const row of blockRows) {
    const entry = byBusiness.get(Number(row.business_id));
    if (!entry) continue;
    const text = readableBlockContent(row.content_json);
    if (text && !entry.texts.includes(text)) entry.texts.push(text);
  }
  for (const row of items) {
    const entry = byBusiness.get(Number(row.business_id));
    if (!entry) continue;
    entry.items.push([
      `[${row.item_type}] ${row.name}`,
      row.category_text,
      row.description,
      row.price != null && `${row.currency || "ARS"} ${row.sale_price ?? row.price}`,
      row.stock_status && row.stock_status !== "unknown" && `Stock: ${row.stock_status}`,
    ].filter(Boolean).join(" — "));
  }
  return [...byBusiness.values()].map(entry => [
    `PRESTADOR: ${entry.name}`,
    ...entry.texts,
    ...entry.items,
  ].filter(Boolean).join("\n").slice(0, 4500)).join("\n\n").slice(0, 18000);
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
  const search=searchParts(task.retrievalMode === "category" ? "" : task.query);const query=search.boolean;
  const ids = [...new Set((task.taxonomyNodeIds || []).map(Number).filter(Number.isInteger))].slice(0, 6);
  const locality = task.localityPreference === "specified" ? normalizeDestinationTerm(task.locality) : "";
  const type = task.type === "find_event" ? "event" : null;
  const params = [...(query?[query]:[]),siteCode,...ids,...(type?[type]:[]),...(query?[query]:[]),...search.shortPatterns,...(locality ? [`%${locality}%`] : []),Math.max(limit * 5,20)];
  const [rows] = await db.execute(
    `SELECT c.*,c.id content_id,${query ? "MATCH(c.title,c.summary,c.searchable_text) AGAINST (? IN BOOLEAN MODE)" : "0"} match_score
       FROM tags_ai_tourism_contents c
       INNER JOIN tags_directory_sites s ON s.id=c.site_id AND s.code=? AND s.is_active=1
       ${ids.length ? `INNER JOIN tags_ai_tourism_content_categories cc ON cc.content_id=c.id AND cc.site_id=c.site_id INNER JOIN tags_directory_taxonomy_closure tc ON tc.descendant_id=cc.taxonomy_node_id AND tc.ancestor_id IN (${placeholders(ids)})` : ""}
      WHERE c.status='published' AND c.show_in_muchi=1
        ${type ? "AND c.valid_until IS NOT NULL AND DATE(c.valid_until)>=CURRENT_DATE()" : "AND (c.valid_until IS NULL OR DATE(c.valid_until)>=CURRENT_DATE())"}
        ${type ? "AND c.content_type=?" : ""}
        ${query ? "AND MATCH(c.title,c.summary,c.searchable_text) AGAINST (? IN BOOLEAN MODE)" : ""}
        ${search.shortPatterns.map(()=>"AND LOWER(CONCAT_WS(' ',c.title,c.summary,c.searchable_text)) REGEXP ?").join(" ")}
        ${locality ? "AND LOWER(COALESCE(c.locality_name,'')) LIKE ?" : ""}
      ORDER BY ${type ? "c.valid_from ASC," : ""}match_score DESC,c.reviewed_at DESC,c.updated_at DESC LIMIT ?`,
    params
  );
  return rows.map(row => tourismCandidate(row, task, userLocation));
}

function tourismCandidate(row, task, userLocation) {
  const contact=objectValue(row.contact_json);const practical=objectValue(row.practical_json);const availability=objectValue(row.availability_json);const event=objectValue(row.event_json);
  const contextual=tourismContextEvidence(row);const contextScore=tourismContextScore(row,task);
  const evidence=[row.summary||row.description,contextual.text,event.start&&`Comienza: ${event.start}`,event.end&&`Finaliza: ${event.end}`].filter(Boolean).join(". ").slice(0,1400);
  return {
    id: Number(row.content_id), businessId: null, entityKey: `tourism_content:${row.content_id}`, entityType: row.content_type,
    name: row.title, matchedTitle: row.title, description: row.summary || row.description || "", locality: row.locality_name || "",
    imageUrl: row.primary_image_url || null, href: row.public_url || contact.bookingUrl || null, phone: contact.phone || null, whatsapp: contact.whatsapp || null, websiteUrl: contact.website || null,
    latitude: validCoordinate(row.latitude, row.longitude) ? Number(row.latitude) : null,
    longitude: validCoordinate(row.latitude, row.longitude) ? Number(row.longitude) : null,
    distanceKm: distanceKm(userLocation, row.latitude, row.longitude), matchType: "exact", evidenceLevel: "tourism_editorial",
    evidenceExcerpt: evidence, requestLabel: task.subject || task.query, requestQuery: task.query, taskType: task.type, planSlot: task.planSlot || null,
    address: row.address || null, schedule: availability.schedule || null, duration: availability.duration || null,
    eventStart: event.start || row.valid_from || null, eventEnd: event.end || row.valid_until || null,
    difficulty: practical.difficulty || null, reservationRequired: availability.reservationRequired ?? null,
    audience: contextual.audience.text || null, weatherConditions: contextual.conditions.weather || null,
    restrictions: contextual.conditions.restrictions || null, recommendations: contextual.conditions.recommendations || null,
    rainSuitable: practical.rainSuitable ?? null, indoor: practical.indoor ?? null,
    accessibility: practical.accessibility || null, petsAllowed: practical.petsAllowed ?? null, contextScore,
    commercial: { priceMode:practical.priceMode||null,price:practical.priceFrom??null,priceTo:practical.priceTo??null,currency:practical.currency||null },
    rankingScore: Number(row.match_score || 0) + contextScore,
  };
}

export async function searchDestinationTaskV2({ siteCode, task, userLocation = null, limit = 4 }) {
  try {
    let candidates = [];
    if (task.resultReferenceKeys?.length && task.type === "follow_up") return { available: true, candidates: [] };
    if (["find_experience", "find_event", "public_local_info", "plan_day"].includes(task.type)) {
      const [tourism, providers] = await Promise.all([
        searchTourism({ siteCode, task, userLocation, limit }),
        task.type === "find_experience" && task.taxonomyNodeIds?.length ? searchByCategory({ siteCode, task, userLocation, limit }) : Promise.resolve([]),
      ]);
      candidates = [...tourism, ...providers];
    } else if (["find_product", "find_dish", "find_service"].includes(task.type)) {
      const [items, declared, livePublished, categoryProviders] = await Promise.all([
        searchItems({ siteCode, task, userLocation, limit }),
        searchDeclaredOffers({ siteCode, task, userLocation, limit }),
        searchLivePublishedOffers({ siteCode, task, userLocation, limit }),
        shouldIncludeCategoryProviders(task)
          ? searchByCategory({ siteCode, task, userLocation, limit })
          : Promise.resolve([]),
      ]);
      candidates = [...items, ...declared, ...livePublished, ...categoryProviders];
    } else if (task.type === "inspect_business") {
      candidates = await searchBusinessName({ siteCode, task, userLocation, limit });
    } else if (task.type === "find_business_category" || task.taxonomyNodeIds?.length) {
      const [categories,capacities,declared,livePublished]=await Promise.all([
        task.taxonomyNodeIds?.length ? searchByCategory({ siteCode, task, userLocation, limit }) : Promise.resolve([]),
        searchCapacityItems({siteCode,task,userLocation,limit}),
        searchDeclaredOffers({ siteCode, task, userLocation, limit }),
        searchLivePublishedOffers({ siteCode, task, userLocation, limit }),
      ]);
      candidates=[...capacities,...declared,...livePublished,...categories];
    }
    if (["find_service", "find_business_category"].includes(task.type)) {
      candidates = candidates.filter(item => item.evidenceLevel !== "explicit_business_text" || item.explicitOfferStrength >= 30);
    }
    const strongPublishedOffers = candidates.filter(item => item.evidenceLevel === "explicit_business_text" && item.explicitOfferStrength >= 30);
    if (strongPublishedOffers.length) candidates = task.type === "find_business_category"
      ? strongPublishedOffers
      : candidates.filter(item => item.evidenceLevel !== "explicit_business_text" || item.explicitOfferStrength >= 30);
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
    const [rows] = await db.execute(`SELECT c.*,c.id content_id FROM tags_ai_tourism_contents c INNER JOIN tags_directory_sites s ON s.id=c.site_id AND s.code=? WHERE c.status='published' AND c.show_in_muchi=1 AND c.id IN (${placeholders(tourismIds)})`, [siteCode, ...tourismIds]);
    results.push(...rows.map(row => tourismCandidate(row,{type:"follow_up",query:"",subject:""},userLocation)));
  }
  const byKey = new Map(results.map(item => [item.entityKey, item]));
  return keys.map(key => byKey.get(key)).filter(Boolean);
}

export function buildDestinationV2Context(tasks, candidates) {
  if (!candidates.length) return "No hay candidatos estructuralmente elegibles para esta consulta.";
  return tasks.map((task, taskIndex) => {
    const rows = candidates.filter(item => item.taskIndex === taskIndex || item.taskIndexes?.includes(taskIndex));
    return [`TAREA ${taskIndex + 1}: ${task.type}${task.planSlot?` (${task.planSlot})`:""} — ${task.subject || task.query}`, ...rows.map((item, index) => [
      `${index + 1}. ${item.name}`,
      `ID autorizado: ${item.entityKey}`,
      item.matchedTitle && `Coincidencia: ${item.matchedTitle}`,
      item.evidenceExcerpt && `Evidencia: ${String(item.evidenceExcerpt).slice(0, 500)}`,
      item.locality && `Localidad: ${item.locality}`,
      item.address && `Dirección o acceso: ${item.address}`,
      Number.isFinite(item.distanceKm) && `Distancia aproximada: ${item.distanceKm.toFixed(1)} km`,
      item.schedule && `Horarios publicados: ${item.schedule}`,
      item.duration && `Duración publicada: ${item.duration}`,
      item.eventStart && `Inicio: ${item.eventStart}`,
      item.eventEnd && `Finalización: ${item.eventEnd}`,
      item.difficulty && `Dificultad: ${item.difficulty}`,
      item.audience && `Público recomendado: ${item.audience}`,
      item.weatherConditions && `Condiciones climáticas publicadas: ${item.weatherConditions}`,
      item.restrictions && `Restricciones publicadas: ${item.restrictions}`,
      item.recommendations && `Recomendaciones publicadas: ${item.recommendations}`,
      item.rainSuitable === true && "Apto con lluvia: sí",
      item.rainSuitable === false && "Apto con lluvia: no",
      item.accessibility && `Accesibilidad publicada: ${item.accessibility}`,
      item.petsAllowed === true && "Admite mascotas: sí",
      item.petsAllowed === false && "Admite mascotas: no",
      item.commercial?.price != null && `Precio publicado: ${item.commercial.currency || "ARS"} ${item.commercial.price}`,
    ].filter(Boolean).join("\n"))].join("\n");
  }).join("\n\n").slice(0, 14000);
}
