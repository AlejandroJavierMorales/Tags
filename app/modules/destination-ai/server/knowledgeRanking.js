import { inferProviderProfiles, modeProfileBoost, providerMatchesPolicy } from "./destinationSearchPolicy.js";

const STOP_WORDS = new Set([
  "al", "de", "el", "en", "es", "la", "las", "lo", "los", "me", "mi", "no", "si", "para", "por", "que", "quiero", "una", "un",
  "busco", "buscar", "comprar", "compro", "necesito", "recomenda", "recomendame", "recomendar", "tiene", "tengan",
  "estoy", "puedo", "puede", "mover", "moverme", "cerca", "donde", "algo", "como", "del", "hay", "decime", "dime",
  "otra", "otras", "otro", "otros", "localidad", "localidades", "lugar", "lugares", "opcion", "opciones", "alternativa", "alternativas",
  "entonces", "mejor", "distinto", "distinta", "ahi", "alla", "aca", "mismo", "misma", "igual", "cualquiera",
  "ahora", "tambien", "ademas", "aparte", "favor", "podrias", "podria", "ver", "ir"
]);

export function normalizeKnowledgeText(value) {
  return String(value || "").toLocaleLowerCase("es-AR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function stem(value) {
  const term = normalizeKnowledgeText(value);
  return term.length > 4 ? term.replace(/(?:es|s)$/, "") : term;
}

export function knowledgeQueryTerms(value) {
  return [...new Set(normalizeKnowledgeText(value).split(" ").filter(term => term.length >= 2 && !STOP_WORDS.has(term)).map(stem))].slice(0, 10);
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === "object" && !Buffer.isBuffer(value)) return value;
  try { return JSON.parse(Buffer.isBuffer(value) ? value.toString("utf8") : String(value)); } catch { return {}; }
}

function validLocation(value) {
  return value && Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude))
    && Number(value.latitude) >= -90 && Number(value.latitude) <= 90
    && Number(value.longitude) >= -180 && Number(value.longitude) <= 180;
}

function distanceKm(from, to) {
  const radians = value => value * Math.PI / 180;
  const dLat = radians(Number(to.latitude) - Number(from.latitude));
  const dLon = radians(Number(to.longitude) - Number(from.longitude));
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(Number(from.latitude))) * Math.cos(radians(Number(to.latitude))) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function termCoverage(row, terms) {
  const titleTerms = new Set(normalizeKnowledgeText(row.title).split(" ").map(stem));
  const source = `${row.title} ${row.summary || ""} ${row.searchable_text || ""}`;
  const textTerms = new Set(normalizeKnowledgeText(source).split(" ").map(stem));
  const titleMatches = terms.filter(term => titleTerms.has(term)).length;
  const textMatches = terms.filter(term => textTerms.has(term)).length;
  const orderedText = normalizeKnowledgeText(source).split(" ").map(stem);
  const phrase = terms.length > 1 && orderedText.some((term, index) => terms.every((queryTerm, offset) => orderedText[index + offset] === queryTerm));
  return { titleMatches, textMatches, all: terms.length > 0 && textMatches === terms.length, phrase };
}

function commerceContextScore(row, coverage) {
  if (!coverage.all) return 0;
  const value = normalizeKnowledgeText(`${row.title} ${row.summary || ""} ${row.searchable_text || ""}`);
  const commerceCue = /\b(venta|vendemos|vende|comercializa|producto|productos|catalogo|stock|distribuidor|distribuidores)\b/.test(value);
  const serviceCue = /\b(servicio|servicios|reparacion|instalacion|mantenimiento|tecnico)\b/.test(value);
  if (["product", "menu_item"].includes(row.entity_type)) return 24;
  if (["service", "excursion"].includes(row.entity_type)) return 20;
  if (coverage.phrase && commerceCue) return 24;
  if (commerceCue) return 15;
  if (coverage.phrase && serviceCue) return 10;
  return coverage.phrase ? 6 : 0;
}

function evidenceContext(row) {
  const value = normalizeKnowledgeText(`${row.title} ${row.summary || ""} ${row.searchable_text || ""}`);
  return {
    commercial: ["product", "menu_item"].includes(row.entity_type) || /\b(venta|vendemos|vende|comercializa|producto|productos|catalogo|stock|distribuidor|distribuidores)\b/.test(value),
    service: ["service", "excursion"].includes(row.entity_type) || /\b(servicio|servicios|reparacion|instalacion|mantenimiento|tecnico)\b/.test(value)
  };
}

function specializationScore(row, coverage) {
  if (!coverage.all) return 0;
  const value = normalizeKnowledgeText(`${row.title} ${row.summary || ""} ${row.searchable_text || ""}`);
  return /\b(todo tipo|especialista|especialistas|especializado|especializados|amplia variedad)\b/.test(value) ? 6 : 0;
}

function matchingExcerpt(row, terms, maxLength = 420) {
  const source = String(row.searchable_text || row.summary || "").replace(/\s+/g, " ").trim();
  if (!source) return "";
  const normalizedSource = normalizeKnowledgeText(source);
  const positions = terms.map(term => normalizedSource.search(new RegExp(`\\b${term}(?:es|s)?\\b`))).filter(position => position >= 0);
  if (!positions.length) return source.slice(0, maxLength);
  const start = Math.max(0, Math.min(...positions) - 120);
  const end = Math.min(source.length, start + maxLength);
  return `${start > 0 ? "…" : ""}${source.slice(start, end).trim()}${end < source.length ? "…" : ""}`;
}

function evidenceWeight(row) {
  if (row.claim_evidence_kind === "structured") return 40;
  if (["business_editorial", "directory_editorial"].includes(row.claim_evidence_kind)) return 36;
  if (row.claim_evidence_kind === "explicit_text") return 32;
  if (["product", "service", "menu_item", "excursion"].includes(row.entity_type)) return 30;
  if (row.claim_evidence_kind === "category_inference") return 6;
  return 16;
}

export function rankKnowledgeRows(rows, { query, searchIntent = "", userLocation = null, preferredLocality = "", excludedLocalities = [], searchPolicy = null } = {}) {
  const terms = knowledgeQueryTerms(query);
  const preferred = normalizeKnowledgeText(preferredLocality);
  const excluded = new Set(excludedLocalities.map(normalizeKnowledgeText).filter(Boolean));
  const ranked = rows.map(row => {
    const coverage = termCoverage(row, terms);
    const location = parseJson(row.location_json);
    const actions = parseJson(row.actions_json);
    const attributes = parseJson(row.attributes_json);
    const commercial = parseJson(row.commercial_json);
    const businessCategoryCoverage = termCoverage({
      title: row.title,
      summary: "",
      searchable_text: `${attributes.categories || ""} ${attributes.category || ""}`
    }, terms);
    const evidence = evidenceContext(row);
    const providerProfiles = inferProviderProfiles(row);
    const policyMatch = providerMatchesPolicy(row, searchPolicy);
    const businessIdentity = searchPolicy?.allowedProfiles?.length ? policyMatch : businessCategoryCoverage.all;
    const coordinates = { latitude: Number(row.latitude), longitude: Number(row.longitude) };
    const distance = validLocation(userLocation) && validLocation(coordinates) ? distanceKm(userLocation, coordinates) : null;
    const normalizedLocality = normalizeKnowledgeText(location.locality);
    const localityMatch = Boolean(preferred && normalizedLocality && (normalizedLocality.includes(preferred) || preferred.includes(normalizedLocality)));
    const localityExcluded = Boolean(normalizedLocality && excluded.has(normalizedLocality));
    const score = evidenceWeight(row) + coverage.textMatches * 7 + coverage.titleMatches * 4 + (coverage.all ? 18 : 0)
      + commerceContextScore(row, coverage) + specializationScore(row, coverage) + Math.min(5, Math.max(0, Number(row.lexical_score || 0)) / 2)
      + Math.min(5, Number(row.quality_score || 0) / 20) + (distance == null ? 0 : Math.max(0, 10 - Math.min(10, distance / 5)))
      + (localityMatch ? 18 : 0) + modeProfileBoost(providerProfiles, searchPolicy?.mode) + (row.relationship === "subscriber" ? 2 : 0) + (Number(row.is_featured) ? 1 : 0);
    return {
      row, score: score + (["find_business", "find_place"].includes(searchIntent) && businessIdentity ? 24 : 0), coverage, businessCategoryCoverage, businessIdentity, providerProfiles, policyMatch, location, actions, attributes, commercial, distance, localityMatch, localityExcluded, evidence,
      evidenceLevel: row.claim_evidence_kind || (["product", "service", "menu_item", "excursion"].includes(row.entity_type) ? "structured" : "explicit_text"),
      matchExcerpt: row.claim_evidence_excerpt || matchingExcerpt(row, terms)
    };
  }).filter(item => {
    const required = terms.length <= 3 ? terms.length : Math.max(2, Math.ceil(terms.length * 0.6));
    const relevantEvidence = searchIntent === "find_product" ? item.evidence.commercial : searchIntent === "find_service" ? item.evidence.service : true;
    const categoryIntent = ["find_business", "find_place", "general_destination"].includes(searchIntent);
    const domainCategorySearch = categoryIntent && searchPolicy?.allowedProfiles?.length && searchPolicy.matchMode === "category";
    const relevantCoverage = categoryIntent && !searchPolicy?.allowedProfiles?.length ? item.businessCategoryCoverage : item.coverage;
    const relevantBusiness = !categoryIntent || item.businessIdentity;
    const coverageMatch = domainCategorySearch || relevantCoverage.titleMatches === terms.length || relevantCoverage.textMatches >= required;
    return !item.localityExcluded && relevantEvidence && relevantBusiness && terms.length > 0 && coverageMatch;
  }).sort((a, b) => {
    if (validLocation(userLocation) && !preferred) {
      const distanceOrder = (a.distance ?? Infinity) - (b.distance ?? Infinity);
      if (distanceOrder) return distanceOrder;
    }
    return b.score - a.score || (a.distance ?? Infinity) - (b.distance ?? Infinity) || String(a.row.title).localeCompare(String(b.row.title), "es");
  });
  if (preferred) return ranked.filter(item => item.localityMatch);
  return ranked;
}

export function recommendationFromRanked(item) {
  const row = item.row;
  return {
    id: Number(row.listing_id), businessId: row.business_id == null ? null : Number(row.business_id), documentId: Number(row.id),
    entityKey: row.canonical_key, entityType: row.entity_type, name: row.business_name || row.title,
    matchedTitle: row.entity_type === "business" ? null : row.title, description: row.summary || "",
    locality: item.location.locality || "", categories: item.attributes.categories || item.attributes.category || "",
    relationship: row.relationship || "free", imageUrl: row.primary_image_url || null, href: item.actions.view || null,
    phone: item.actions.phone || null, whatsapp: item.actions.whatsapp || null, websiteUrl: item.actions.website || null,
    latitude: row.latitude == null ? null : Number(row.latitude), longitude: row.longitude == null ? null : Number(row.longitude),
    distanceKm: item.distance, matchType: item.evidenceLevel === "category_inference" ? "nearby_alternative" : "exact",
    evidenceLevel: item.evidenceLevel, evidenceExcerpt: item.matchExcerpt || row.summary || "", score: Number(item.score.toFixed(2)), commercial: item.commercial
  };
}

export function recommendationFromStoredRow(row, userLocation = null) {
  const location = parseJson(row.location_json);
  const coordinates = { latitude: Number(row.latitude), longitude: Number(row.longitude) };
  const distance = validLocation(userLocation) && validLocation(coordinates) ? distanceKm(userLocation, coordinates) : null;
  return recommendationFromRanked({
    row,
    location,
    actions: parseJson(row.actions_json),
    attributes: parseJson(row.attributes_json),
    commercial: parseJson(row.commercial_json),
    distance,
    evidenceLevel: row.claim_evidence_kind || (["product", "service", "menu_item", "excursion"].includes(row.entity_type) ? "structured" : "explicit_text"),
    matchExcerpt: row.claim_evidence_excerpt || row.summary || "",
    score: Number(row.quality_score || 0) / 20
  });
}
