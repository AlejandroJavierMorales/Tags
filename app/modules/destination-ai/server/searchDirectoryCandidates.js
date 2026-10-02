import { db } from "@/app/lib/tags-db";

const STOP_WORDS = new Set([
  "al", "de", "el", "en", "es", "ir", "la", "me", "mi", "no", "se", "si", "su", "un", "ya",
  "aca", "algo", "como", "con", "del", "donde", "esta", "este", "hay", "las", "los", "para", "por", "que", "quiero", "una", "unos", "unas",
  "busco", "buscar", "comprar", "compro", "necesito", "persona", "personas", "recomenda", "recomendame", "recomendar", "recomendacion", "somos", "tiene", "tengan",
  "estoy", "puedo", "puede", "mover", "moverme", "movilizarme", "otra", "otro", "localidad", "zona", "cerca", "cercano", "cercana"
]);

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(value) {
  const normalized = normalize(value);
  return normalized.length > 4 ? normalized.replace(/(?:es|s)$/, "") : normalized;
}

function phraseAppears(query, label) {
  const queryStems = new Set(normalize(query).split(" ").filter(Boolean).map(stem));
  const labelStems = normalize(label).split(" ").filter(Boolean).map(stem);
  return labelStems.length > 0 && labelStems.every(term => queryStems.has(term));
}

function searchTerms(value) {
  return normalize(value)
    .split(/\s+/)
    .filter(term => term.length >= 2 && !STOP_WORDS.has(term))
    .slice(0, 6);
}

function compactPublicText(value, limit = 1200) {
  return String(value || "")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\\[nrt]/g, " ")
    .replace(/[{}\[\]"\\]/g, " ")
    .replace(/\b(?:color|background|fontSize|fontFamily|padding|margin|borderRadius|animation|alignment|layout|styles|css|imageUrl|url)\b\s*:?\s*[^,|]*/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function isInsideCalamuchita(location) {
  return location && location.latitude >= -33.15 && location.latitude <= -31.35 && location.longitude >= -65.35 && location.longitude <= -63.7;
}

function distanceKm(from, to) {
  const radians = value => value * Math.PI / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function relatedFallbackCategories(query) {
  const value = normalize(query);
  if (/\b(control|remoto|televisor|tv|smartv|cable|conector|router|audio)\b/.test(value)) return ["Electrónica", "Electricidad"];
  if (/\b(computadora|computacion|notebook|pc|impresora)\b/.test(value)) return ["Computación", "Electrónica"];
  return [];
}

export async function searchDirectoryCandidates({ siteCode, query, limit = 6, userLocation = null, includeAlternatives = true }) {
  if (!/^[a-z0-9_-]{2,60}$/i.test(String(siteCode || ""))) return [];
  const terms = searchTerms(query);
  const filters = ["s.code=?", "s.is_active=1", "sl.publication_status='published'", "l.status='published'"];
  const values = [siteCode];

  const [taxonomyResult, placesResult] = await Promise.all([
    db.execute(
      `SELECT DISTINCT n.id,n.name,n.depth
         FROM tags_directory_taxonomy_nodes n
         INNER JOIN tags_directory_listing_taxonomy lt ON lt.taxonomy_node_id=n.id
         INNER JOIN tags_directory_site_listings sl ON sl.listing_id=lt.listing_id
         INNER JOIN tags_directory_sites s ON s.id=sl.site_id
        WHERE s.code=? AND s.is_active=1 AND n.is_active=1 AND sl.publication_status='published'`,
      [siteCode]
    ),
    db.execute(
      `SELECT DISTINCT p.id,p.name
         FROM tags_geo_places p
         INNER JOIN tags_directory_listing_places lp ON lp.place_id=p.id AND lp.relation_type='location'
         INNER JOIN tags_directory_site_listings sl ON sl.listing_id=lp.listing_id
         INNER JOIN tags_directory_sites s ON s.id=sl.site_id
        WHERE s.code=? AND s.is_active=1 AND p.is_active=1 AND sl.publication_status='published'`,
      [siteCode]
    )
  ]);
  const matchedCategories = taxonomyResult[0]
    .filter(item => phraseAppears(query, item.name))
    .sort((a, b) => Number(b.depth) - Number(a.depth) || String(b.name).length - String(a.name).length);
  const matchedPlaces = placesResult[0]
    .filter(item => phraseAppears(query, item.name))
    .sort((a, b) => String(b.name).length - String(a.name).length);
  const category = matchedCategories[0] || null;
  const place = matchedPlaces[0] || null;
  const normalizedQuery = normalize(query);
  const allowsOtherLocalities = /\b(?:me puedo mover|puedo moverme|puedo viajar|otra localidad|otras localidades|cualquier localidad|no importa la localidad|alrededores|cerca de)\b/.test(normalizedQuery);
  const structuralTerms = new Set([category?.name, place?.name].filter(Boolean).flatMap(value => normalize(value).split(" ")).map(stem));
  const contentTerms = terms.filter(term => !structuralTerms.has(stem(term)));

  if (category) {
    filters.push(`EXISTS (
      SELECT 1 FROM tags_directory_listing_taxonomy flt
      INNER JOIN tags_directory_taxonomy_closure fc ON fc.descendant_id=flt.taxonomy_node_id
      WHERE flt.listing_id=l.id AND fc.ancestor_id=?
    )`);
    values.push(category.id);
  }
  if (place && !allowsOtherLocalities) {
    filters.push("EXISTS (SELECT 1 FROM tags_directory_listing_places flp WHERE flp.listing_id=l.id AND flp.place_id=? AND flp.relation_type='location')");
    values.push(place.id);
  }

  if (contentTerms.length) {
    const termFilters = [];
    for (const term of contentTerms) {
      const like = `%${term}%`;
      termFilters.push(`(l.display_name LIKE ? OR l.short_description LIKE ? OR l.description LIKE ? OR b.name LIKE ? OR b.description LIKE ? OR EXISTS (
        SELECT 1 FROM tags_directory_listing_taxonomy qlt
        INNER JOIN tags_directory_taxonomy_nodes qn ON qn.id=qlt.taxonomy_node_id AND qn.is_active=1
        WHERE qlt.listing_id=l.id AND qn.name LIKE ?
      ) OR EXISTS (
        SELECT 1 FROM tags_directory_listing_places qlp
        INNER JOIN tags_geo_places qp ON qp.id=qlp.place_id AND qp.is_active=1
        WHERE qlp.listing_id=l.id AND qp.name LIKE ?
      ) OR EXISTS (
        SELECT 1 FROM tags_qr_page_products qpr
        INNER JOIN tags_qr_pages qpp ON qpp.id=qpr.page_id AND qpp.status='published'
        WHERE qpr.page_id=l.qr_page_id AND qpr.is_visible=1 AND (qpr.title LIKE ? OR qpr.description LIKE ? OR qpr.category LIKE ?)
      ) OR EXISTS (
        SELECT 1 FROM tags_qr_pages qpage
        WHERE qpage.id=l.qr_page_id AND qpage.status='published' AND (qpage.title LIKE ? OR qpage.description LIKE ? OR qpage.seo_title LIKE ? OR qpage.seo_description LIKE ?)
      ) OR EXISTS (
        SELECT 1 FROM tags_qr_page_blocks qblock
        INNER JOIN tags_qr_page_sections qsection ON qsection.id=qblock.section_id AND qsection.is_visible=1
        INNER JOIN tags_qr_pages qbpage ON qbpage.id=qsection.page_id AND qbpage.status='published'
        WHERE qsection.page_id=l.qr_page_id AND qblock.is_visible=1 AND CAST(qblock.content_json AS CHAR) LIKE ?
      ) OR EXISTS (
        SELECT 1 FROM tags_qr_page_sections qtitle
        INNER JOIN tags_qr_pages qtpage ON qtpage.id=qtitle.page_id AND qtpage.status='published'
        WHERE qtitle.page_id=l.qr_page_id AND qtitle.is_visible=1 AND qtitle.title LIKE ?
      ) OR EXISTS (
        SELECT 1 FROM tags_stores qstore
        INNER JOIN tags_qr_pages qspp ON qspp.id=qstore.page_id AND qspp.status='published'
        INNER JOIN tags_business_addons qsba ON qsba.business_id=qstore.business_id AND qsba.addon_code='store' AND qsba.status='active' AND (qsba.expires_at IS NULL OR qsba.expires_at>=NOW())
        INNER JOIN tags_store_products qsp ON qsp.store_id=qstore.id AND qsp.is_visible=1 AND qsp.status='published'
        LEFT JOIN tags_store_categories qsc ON qsc.id=qsp.category_id
        WHERE qstore.business_id=l.business_id AND (qsp.title LIKE ? OR qsp.description LIKE ? OR qsc.name LIKE ?)
      ))`);
      values.push(like, like, like, like, like, like, like, like, like, like, like, like, like, like, like, like, like, like, like);
    }
    filters.push(`(${termFilters.join(" AND ")})`);
  }

  values.push(Math.max(1, Math.min(10, Number(limit) || 6)));
  const [rows] = await db.execute(
    `SELECT l.id,COALESCE(NULLIF(b.display_name,''),b.name,l.display_name) display_name,s.primary_host,
            l.short_description,l.description,b.description business_description,b.phone,b.whatsapp,b.address,b.website_url,b.logo_url,b.cover_url,
            COALESCE(l.latitude,b.latitude) latitude,COALESCE(l.longitude,b.longitude) longitude,
            sl.slug,sl.is_free,
            (SELECT p.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places p ON p.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name,
            (SELECT GROUP_CONCAT(DISTINCT n.name ORDER BY n.depth DESC SEPARATOR ', ') FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id AND n.is_active=1 WHERE lt.listing_id=l.id) categories,
            (SELECT CONCAT_WS(' · ',NULLIF(qp.title,''),NULLIF(qp.description,''),NULLIF(qp.seo_description,'')) FROM tags_qr_pages qp WHERE qp.id=l.qr_page_id AND qp.status='published' LIMIT 1) public_summary,
            (SELECT LEFT(GROUP_CONCAT(CONCAT_WS(': ',NULLIF(pr.title,''),NULLIF(pr.description,'')) ORDER BY pr.sort_order SEPARATOR ' | '),1600) FROM tags_qr_page_products pr INNER JOIN tags_qr_pages pp ON pp.id=pr.page_id AND pp.status='published' WHERE pr.page_id=l.qr_page_id AND pr.is_visible=1) offerings,
            (SELECT LEFT(GROUP_CONCAT(CAST(bl.content_json AS CHAR) ORDER BY sec.sort_order,bl.sort_order SEPARATOR ' '),1400) FROM tags_qr_page_blocks bl INNER JOIN tags_qr_page_sections sec ON sec.id=bl.section_id AND sec.is_visible=1 INNER JOIN tags_qr_pages bp ON bp.id=sec.page_id AND bp.status='published' WHERE sec.page_id=l.qr_page_id AND bl.is_visible=1) public_content,
            (SELECT LEFT(GROUP_CONCAT(CONCAT_WS(': ',NULLIF(sp.title,''),NULLIF(sp.description,'')) ORDER BY sp.is_featured DESC,sp.id DESC SEPARATOR ' | '),1600) FROM tags_stores st INNER JOIN tags_qr_pages spp ON spp.id=st.page_id AND spp.status='published' INNER JOIN tags_business_addons sba ON sba.business_id=st.business_id AND sba.addon_code='store' AND sba.status='active' AND (sba.expires_at IS NULL OR sba.expires_at>=NOW()) INNER JOIN tags_store_products sp ON sp.store_id=st.id AND sp.is_visible=1 AND sp.status='published' WHERE st.business_id=l.business_id) store_offerings,
            COALESCE(NULLIF(b.cover_url,''),(SELECT m.url FROM tags_directory_media m WHERE m.listing_id=l.id AND m.is_active=1 ORDER BY FIELD(m.media_type,'cover','gallery','logo'),m.sort_order,m.id LIMIT 1),NULLIF(b.logo_url,'')) image_url
       FROM tags_directory_site_listings sl
       INNER JOIN tags_directory_sites s ON s.id=sl.site_id
       INNER JOIN tags_directory_listings l ON l.id=sl.listing_id
       INNER JOIN tags_businesses b ON b.id=l.business_id
      WHERE ${filters.join(" AND ")}
      ORDER BY sl.is_free ASC,sl.is_featured DESC,sl.sort_order,l.display_name
      LIMIT ?`,
    values
  );

  const validUserLocation = isInsideCalamuchita(userLocation) ? userLocation : null;
  const exactCandidates = rows.map(row => ({
    id: Number(row.id),
    name: row.display_name,
    description: row.short_description || row.description || "",
    businessDescription: row.business_description || "",
    publicSummary: compactPublicText(row.public_summary, 700),
    offerings: compactPublicText(row.offerings, 1500),
    publicContent: compactPublicText(row.public_content, 1200),
    storeOfferings: compactPublicText(row.store_offerings, 1500),
    locality: row.locality_name || "",
    categories: row.categories || "",
    relationship: Number(row.is_free) === 0 ? "subscriber" : "free",
    imageUrl: row.image_url || null,
    href: row.primary_host ? `https://${String(row.primary_host).replace(/^https?:\/\//, "").replace(/\/$/, "")}/${row.slug}` : `/${row.slug}`,
    phone: row.phone || null,
    whatsapp: row.whatsapp || null,
    address: row.address || null,
    websiteUrl: row.website_url || null,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    distanceKm: validUserLocation && row.latitude != null && row.longitude != null ? distanceKm(validUserLocation, { latitude: Number(row.latitude), longitude: Number(row.longitude) }) : null,
    matchType: "exact",
  }));

  if (!includeAlternatives || !place || !allowsOtherLocalities || exactCandidates.length >= limit) return exactCandidates;
  const fallbackCategories = relatedFallbackCategories(query);
  if (!fallbackCategories.length) return exactCandidates;
  const alternatives = [];
  for (const fallbackCategory of fallbackCategories) {
    const nearby = await searchDirectoryCandidates({ siteCode, query: `${fallbackCategory} ${place.name}`, limit, userLocation, includeAlternatives: false });
    for (const item of nearby) {
      if (exactCandidates.some(candidate => candidate.id === item.id) || alternatives.some(candidate => candidate.id === item.id)) continue;
      alternatives.push({ ...item, matchType: "nearby_alternative" });
      if (exactCandidates.length + alternatives.length >= limit) break;
    }
    if (exactCandidates.length + alternatives.length >= limit) break;
  }
  return [...exactCandidates, ...alternatives].slice(0, limit);
}

export function buildDestinationContext(candidates) {
  if (!candidates.length) return "No hay opciones verificadas disponibles para esta consulta.";
  return candidates.map((item, index) => [
    `${index + 1}. ${item.name}`,
    item.matchType === "nearby_alternative" && "Tipo de coincidencia: alternativa cercana por rubro. No hay información publicada que confirme el producto o servicio exacto solicitado; presentarla únicamente como posibilidad para consultar.",
    item.categories && `Rubros: ${item.categories}`,
    item.locality && `Localidad: ${item.locality}`,
    item.description && `Descripción: ${item.description}`,
    item.businessDescription && item.businessDescription !== item.description && `Descripción comercial: ${item.businessDescription}`,
    item.publicSummary && `Presentación pública: ${item.publicSummary}`,
    item.offerings && `Productos o servicios publicados: ${item.offerings}`,
    item.publicContent && `Información pública adicional: ${item.publicContent}`,
    item.storeOfferings && `Productos publicados en su tienda: ${item.storeOfferings}`,
    item.address && `Dirección: ${item.address}`,
    Number.isFinite(item.distanceKm) && `Distancia aproximada desde la ubicación actual de la persona: ${item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)} m` : `${item.distanceKm.toFixed(1)} km`}`,
    item.phone && `Teléfono: ${item.phone}`,
    item.whatsapp && `WhatsApp: ${item.whatsapp}`,
    `Enlace para ampliar información: ${item.href}`,
  ].filter(Boolean).join("\n")).join("\n\n").slice(0, 16000);
}
