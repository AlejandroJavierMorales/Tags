import "dotenv/config";
import crypto from "node:crypto";
import mysql from "mysql2/promise";

const args = new Set(process.argv.slice(2));
const option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) || "";
const APPLY = args.has("--apply");
const SITE_CODE = option("site") || "calamuchitar";
const LIMIT = Math.max(0, Number(option("limit") || 0));
const SAMPLE_SIZE = Math.max(1, Math.min(20, Number(option("samples") || 5)));
const BATCH_SIZE = Math.max(10, Math.min(500, Number(option("batch") || 100)));
const CONTAINS = canonical(option("contains"));

function config() {
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

function text(value, max = 20000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function canonical(value) {
  return text(value, 255).toLocaleLowerCase("es-AR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function stem(value) {
  const normalized = canonical(value);
  return normalized.length > 4 ? normalized.replace(/(?:es|s)$/, "") : normalized;
}

function containsNormalizedTerms(document, query) {
  const documentTerms = new Set(canonical(`${document.title} ${document.searchableText}`).split(" ").filter(Boolean).map(stem));
  const queryTerms = canonical(query).split(" ").filter(Boolean).map(stem);
  return queryTerms.length > 0 && queryTerms.every(term => documentTerms.has(term));
}

function numberOrNull(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function json(value) {
  return value == null ? null : JSON.stringify(value);
}

function hash(document) {
  const stable = {
    title: document.title, summary: document.summary, searchableText: document.searchableText,
    attributes: document.attributes, commercial: document.commercial, location: document.location,
    availability: document.availability, actions: document.actions, primaryImageUrl: document.primaryImageUrl,
    latitude: document.latitude, longitude: document.longitude, visibility: document.visibility,
  };
  return crypto.createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

function href(host, slug) {
  const cleanHost = text(host, 255).replace(/^https?:\/\//, "").replace(/\/$/, "");
  return cleanHost && slug ? `https://${cleanHost}/${slug}` : null;
}

function businessDocument(row) {
  const searchableText = [row.display_name, row.short_description, row.description, row.business_description,
    row.seo_title, row.seo_description, row.seo_keywords, row.categories, row.locality_name,
    row.page_title, row.page_description, row.page_seo_title, row.page_seo_description].map(value => text(value)).filter(Boolean).join(" | ");
  return {
    siteId: Number(row.site_id), businessId: numberOrNull(row.business_id), listingId: Number(row.listing_id),
    entityType: "business", sourceType: "directory_listing", sourceId: String(row.listing_id),
    canonicalKey: `directory_listing:${row.listing_id}`, title: text(row.display_name, 255),
    summary: text(row.short_description || row.description || row.business_description, 4000), searchableText,
    attributes: { categories: text(row.categories, 2000), primaryCategories: text(row.primary_categories, 1000), relationship: Number(row.is_free) ? "free" : "subscriber", featured: Boolean(Number(row.is_featured)), openingHours: row.opening_hours || null },
    commercial: null,
    location: { locality: text(row.locality_name, 190) || null, address: text(row.address, 500) || null },
    availability: null,
    actions: { view: href(row.primary_host, row.slug), phone: text(row.phone, 80) || null, whatsapp: text(row.whatsapp, 80) || null, website: text(row.website_url, 2000) || null },
    primaryImageUrl: text(row.image_url, 2000) || null, images: null,
    latitude: numberOrNull(row.latitude), longitude: numberOrNull(row.longitude), visibility: "public",
    qualityScore: [row.short_description || row.description, row.locality_name, row.latitude && row.longitude, row.image_url, row.phone || row.whatsapp].filter(Boolean).length * 20,
    sourceUpdatedAt: row.source_updated_at, claims: [],
  };
}

function productDocument(row, sourceType) {
  const isStore = sourceType === "store_product";
  const title = text(row.title, 255);
  const entityType = row.app_type === "resto" ? "menu_item" : "product";
  const sourceId = String(row.product_id);
  const price = numberOrNull(row.sale_price ?? row.price);
  const stockKnown = isStore && Number(row.stock_enabled) === 1;
  return {
    siteId: Number(row.site_id), businessId: numberOrNull(row.business_id), listingId: Number(row.listing_id),
    entityType, sourceType, sourceId, canonicalKey: `${sourceType}:${sourceId}`,
    title, summary: text(row.description, 4000),
    searchableText: [title, row.description, row.category_name, row.seo_title, row.seo_description].map(value => text(value)).filter(Boolean).join(" | "),
    attributes: { category: text(row.category_name, 255) || null, sku: text(row.sku, 120) || null },
    commercial: { price, regularPrice: numberOrNull(row.price), currency: text(row.currency, 10) || "ARS", stockStatus: stockKnown ? (Number(row.stock_qty) > 0 ? "known_available" : "known_unavailable") : "unknown", stockQty: stockKnown ? Number(row.stock_qty || 0) : null },
    location: { locality: text(row.locality_name, 190) || null }, availability: null,
    actions: { view: href(row.primary_host, row.listing_slug), product: text(row.button_url, 2000) || null },
    primaryImageUrl: text(row.image_url, 2000) || null, images: null,
    latitude: numberOrNull(row.latitude), longitude: numberOrNull(row.longitude), visibility: "public",
    qualityScore: [row.description, row.category_name, row.image_url, price != null].filter(Boolean).length * 25,
    sourceUpdatedAt: row.source_updated_at,
    claims: [{ claimType: entityType === "menu_item" ? "product" : "product", canonicalValue: canonical(title), displayValue: title, evidenceKind: "structured", evidenceExcerpt: title, sourceField: `${sourceType}.title`, confidence: 1, status: "confirmed" }],
  };
}

function serviceDocument(row) {
  const title = text(row.name, 255);
  const isExcursion = row.business_profile_code === "activities";
  return {
    siteId: Number(row.site_id), businessId: numberOrNull(row.business_id), listingId: Number(row.listing_id),
    entityType: isExcursion ? "excursion" : "service", sourceType: "turnos_service", sourceId: String(row.service_id),
    canonicalKey: `turnos_service:${row.service_id}`, title, summary: text(row.description, 4000),
    searchableText: [title, row.description, row.category_name, row.app_name].map(value => text(value)).filter(Boolean).join(" | "),
    attributes: { category: text(row.category_name, 255) || null, durationMinutes: Number(row.duration_minutes || 0), capacity: Number(row.capacity || 0), bookingMode: row.booking_mode },
    commercial: { price: Number(row.is_price_visible) ? numberOrNull(row.price) : null, currency: text(row.currency, 10) || "ARS" },
    location: { locality: text(row.locality_name, 190) || null },
    availability: { status: Number(row.public_availability_enabled) ? "consultable" : "not_configured", checkedAt: null },
    actions: { view: href(row.primary_host, row.listing_slug), booking: row.turnos_slug ? `/turnos/${row.turnos_slug}` : null },
    primaryImageUrl: text(row.image_url, 2000) || null, images: null,
    latitude: numberOrNull(row.latitude), longitude: numberOrNull(row.longitude), visibility: "public",
    qualityScore: [row.description, row.category_name, row.image_url, row.duration_minutes].filter(Boolean).length * 25,
    sourceUpdatedAt: row.source_updated_at,
    claims: [{ claimType: "service", canonicalValue: canonical(title), displayValue: title, evidenceKind: "structured", evidenceExcerpt: title, sourceField: "turnos_service.name", confidence: 1, status: "confirmed" }],
  };
}

function knowledgeDocument(row) {
  return {
    siteId: Number(row.site_id), businessId: numberOrNull(row.business_id), listingId: Number(row.listing_id),
    entityType: "business_knowledge", sourceType: "ai_chatbot_knowledge", sourceId: String(row.knowledge_id),
    canonicalKey: `ai_chatbot_knowledge:${row.knowledge_id}`, title: text(row.title, 255), summary: text(row.topics, 1000),
    searchableText: [row.title, row.topics, row.content].map(value => text(value)).filter(Boolean).join(" | "),
    attributes: { topics: text(row.topics, 1000) || null }, commercial: null,
    location: { locality: text(row.locality_name, 190) || null }, availability: null,
    actions: { view: href(row.primary_host, row.listing_slug) }, primaryImageUrl: text(row.image_url, 2000) || null, images: null,
    latitude: numberOrNull(row.latitude), longitude: numberOrNull(row.longitude), visibility: "public", qualityScore: 75,
    sourceUpdatedAt: row.source_updated_at, claims: [],
  };
}

const BASE_SELECT = `
  INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
  INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id AND ds.code=? AND ds.is_active=1
  LEFT JOIN tags_businesses b ON b.id=l.business_id
  WHERE l.status='published'`;

async function loadDocuments(connection) {
  const limit = LIMIT ? ` LIMIT ${LIMIT}` : "";
  const [businesses] = await connection.query(`
    SELECT ds.id site_id,ds.primary_host,l.id listing_id,l.business_id,sl.slug,sl.is_free,sl.is_featured,
           COALESCE(NULLIF(b.display_name,''),NULLIF(b.name,''),l.display_name) display_name,
           l.short_description,l.description,b.description business_description,
           sl.seo_title,sl.seo_description,sl.seo_keywords,l.opening_hours,
           qp.title page_title,qp.description page_description,qp.seo_title page_seo_title,qp.seo_description page_seo_description,
           (SELECT GROUP_CONCAT(NULLIF(sec.title,'') ORDER BY sec.sort_order SEPARATOR ' | ') FROM tags_qr_page_sections sec WHERE sec.page_id=l.qr_page_id AND sec.is_visible=1) section_titles,
           (SELECT LEFT(GROUP_CONCAT(CAST(bl.content_json AS CHAR) ORDER BY sec.sort_order,bl.sort_order SEPARATOR ' | '),12000)
              FROM tags_qr_page_sections sec INNER JOIN tags_qr_page_blocks bl ON bl.section_id=sec.id AND bl.is_visible=1
             WHERE sec.page_id=l.qr_page_id AND sec.is_visible=1) public_blocks,
           COALESCE(l.phone,b.phone) phone,COALESCE(l.whatsapp,b.whatsapp) whatsapp,
           COALESCE(l.website_url,b.website_url) website_url,COALESCE(l.address,b.address) address,
           COALESCE(l.latitude,b.latitude) latitude,COALESCE(l.longitude,b.longitude) longitude,
           (SELECT p.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places p ON p.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name,
            (SELECT GROUP_CONCAT(DISTINCT n.name ORDER BY n.depth DESC SEPARATOR ', ') FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id AND n.is_active=1 WHERE lt.listing_id=l.id) categories,
            (SELECT GROUP_CONCAT(DISTINCT n.name ORDER BY n.depth DESC SEPARATOR ', ') FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id AND n.is_active=1 WHERE lt.listing_id=l.id AND lt.is_primary=1) primary_categories,
           COALESCE((SELECT m.url FROM tags_directory_media m WHERE m.listing_id=l.id AND m.is_active=1 ORDER BY FIELD(m.media_type,'cover','gallery','logo'),m.sort_order,m.id LIMIT 1),b.cover_url,b.logo_url) image_url,
           GREATEST(l.updated_at,sl.updated_at,COALESCE(b.updated_at,l.updated_at)) source_updated_at
      FROM tags_directory_listings l
      LEFT JOIN tags_qr_pages qp ON qp.id=l.qr_page_id AND qp.status='published'
      ${BASE_SELECT}${limit}`, [SITE_CODE]);

  const [qrProducts] = await connection.query(`
    SELECT ds.id site_id,ds.primary_host,l.id listing_id,l.business_id,sl.slug listing_slug,
           p.id product_id,p.title,p.description,p.category category_name,p.price,NULL sale_price,p.currency,
           NULL sku,0 stock_enabled,NULL stock_qty,p.image_url,p.button_url,p.seo_title,p.seo_description,
           COALESCE(l.latitude,b.latitude) latitude,COALESCE(l.longitude,b.longitude) longitude,
           (SELECT gp.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places gp ON gp.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name,
           p.updated_at source_updated_at,NULL app_type
      FROM tags_qr_page_products p
      INNER JOIN tags_qr_pages qp ON qp.id=p.page_id AND qp.status='published'
      INNER JOIN tags_directory_listings l ON l.qr_page_id=qp.id
      LEFT JOIN tags_businesses b ON b.id=l.business_id
      ${BASE_SELECT.replace("LEFT JOIN tags_businesses b ON b.id=l.business_id\n  ", "")}
      AND p.is_visible=1${limit}`, [SITE_CODE]);

  const [storeProducts] = await connection.query(`
    SELECT ds.id site_id,ds.primary_host,l.id listing_id,l.business_id,sl.slug listing_slug,
           p.id product_id,p.title,p.description,c.name category_name,p.price,p.sale_price,p.currency,p.sku,
           p.stock_enabled,p.stock_qty,st.app_type,NULL button_url,p.seo_title,p.seo_description,
           (SELECT i.image_url FROM tags_store_product_images i WHERE i.product_id=p.id ORDER BY i.is_primary DESC,i.sort_order,i.id LIMIT 1) image_url,
           COALESCE(l.latitude,b.latitude) latitude,COALESCE(l.longitude,b.longitude) longitude,
           (SELECT gp.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places gp ON gp.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name,
           p.updated_at source_updated_at
      FROM tags_store_products p
      INNER JOIN tags_stores st ON st.id=p.store_id AND st.status='published'
      LEFT JOIN tags_store_categories c ON c.id=p.category_id AND c.is_visible=1
      INNER JOIN tags_directory_listings l ON l.business_id=st.business_id
      LEFT JOIN tags_businesses b ON b.id=l.business_id
      ${BASE_SELECT.replace("LEFT JOIN tags_businesses b ON b.id=l.business_id\n  ", "")}
      AND p.is_visible=1 AND p.status='published'${limit}`, [SITE_CODE]);

  const [services] = await connection.query(`
    SELECT ds.id site_id,ds.primary_host,l.id listing_id,l.business_id,sl.slug listing_slug,
           s.id service_id,s.name,s.description,s.image_url,s.booking_mode,s.public_availability_enabled,
           s.duration_minutes,s.capacity,s.price,s.currency,s.is_price_visible,s.updated_at source_updated_at,
           c.name category_name,a.name app_name,a.slug turnos_slug,a.business_profile_code,
           COALESCE(l.latitude,b.latitude) latitude,COALESCE(l.longitude,b.longitude) longitude,
           (SELECT gp.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places gp ON gp.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name
      FROM tags_turnos_services s
      INNER JOIN tags_turnos_apps a ON a.id=s.turnos_id AND a.status='published'
      LEFT JOIN tags_turnos_service_categories c ON c.id=s.category_id AND c.is_visible=1
      INNER JOIN tags_directory_listings l ON l.business_id=a.business_id
      LEFT JOIN tags_businesses b ON b.id=l.business_id
      ${BASE_SELECT.replace("LEFT JOIN tags_businesses b ON b.id=l.business_id\n  ", "")}
      AND s.is_active=1 AND s.is_visible=1${limit}`, [SITE_CODE]);

  const [knowledge] = await connection.query(`
    SELECT ds.id site_id,ds.primary_host,l.id listing_id,l.business_id,sl.slug listing_slug,
           k.id knowledge_id,k.title,k.topics,k.content,k.updated_at source_updated_at,
           COALESCE(l.latitude,b.latitude) latitude,COALESCE(l.longitude,b.longitude) longitude,
           (SELECT gp.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places gp ON gp.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name,
           COALESCE((SELECT m.url FROM tags_directory_media m WHERE m.listing_id=l.id AND m.is_active=1 ORDER BY FIELD(m.media_type,'cover','gallery','logo'),m.sort_order,m.id LIMIT 1),b.cover_url,b.logo_url) image_url
      FROM tags_ai_chatbot_knowledge k
      INNER JOIN tags_directory_listings l ON l.business_id=k.business_id
      LEFT JOIN tags_businesses b ON b.id=l.business_id
      ${BASE_SELECT.replace("LEFT JOIN tags_businesses b ON b.id=l.business_id\n  ", "")}
      AND k.is_active=1${limit}`, [SITE_CODE]);

  return [
    ...businesses.map(businessDocument),
    ...qrProducts.map(row => productDocument(row, "qr_product")),
    ...storeProducts.map(row => productDocument(row, "store_product")),
    ...services.map(serviceDocument),
    ...knowledge.map(knowledgeDocument),
  ].map(document => ({ ...document, sourceHash: hash(document) }));
}

async function ensureTargetSchema(connection) {
  const [rows] = await connection.query("SELECT TABLE_NAME table_name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('tags_ai_knowledge_documents','tags_ai_knowledge_claims')");
  if (rows.length !== 2) throw new Error("Falta ejecutar la migración 2026-09-26-tags-destination-ai-knowledge-core.sql");
}

async function upsertDocument(connection, document) {
  const [result] = await connection.execute(`
    INSERT INTO tags_ai_knowledge_documents
      (site_id,business_id,listing_id,entity_type,source_type,source_id,canonical_key,title,summary,searchable_text,
       attributes_json,commercial_json,location_json,availability_json,actions_json,primary_image_url,images_json,
       latitude,longitude,visibility,verification_status,quality_score,source_updated_at,indexed_at,source_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      business_id=VALUES(business_id),listing_id=VALUES(listing_id),entity_type=VALUES(entity_type),source_type=VALUES(source_type),
      source_id=VALUES(source_id),title=VALUES(title),summary=VALUES(summary),searchable_text=VALUES(searchable_text),
      attributes_json=VALUES(attributes_json),commercial_json=VALUES(commercial_json),location_json=VALUES(location_json),
      availability_json=VALUES(availability_json),actions_json=VALUES(actions_json),primary_image_url=VALUES(primary_image_url),
      images_json=VALUES(images_json),latitude=VALUES(latitude),longitude=VALUES(longitude),visibility=VALUES(visibility),
      quality_score=VALUES(quality_score),source_updated_at=VALUES(source_updated_at),indexed_at=VALUES(indexed_at),source_hash=VALUES(source_hash),id=LAST_INSERT_ID(id)`, [
    document.siteId,document.businessId,document.listingId,document.entityType,document.sourceType,document.sourceId,document.canonicalKey,
    document.title,document.summary,document.searchableText,json(document.attributes),json(document.commercial),json(document.location),
    json(document.availability),json(document.actions),document.primaryImageUrl,json(document.images),document.latitude,document.longitude,
    document.visibility,"automatic",document.qualityScore,document.sourceUpdatedAt,new Date(),document.sourceHash,
  ]);
  const documentId = Number(result.insertId);
  for (const claim of document.claims) {
    if (!claim.canonicalValue) continue;
    await connection.execute(`
      INSERT INTO tags_ai_knowledge_claims
        (document_id,claim_type,canonical_value,display_value,evidence_kind,evidence_excerpt,source_field,confidence,status)
      VALUES (?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE display_value=VALUES(display_value),evidence_kind=VALUES(evidence_kind),
        evidence_excerpt=VALUES(evidence_excerpt),source_field=VALUES(source_field),confidence=VALUES(confidence),
        status=IF(status='rejected','rejected',VALUES(status))`,
      [documentId,claim.claimType,claim.canonicalValue,claim.displayValue,claim.evidenceKind,claim.evidenceExcerpt,claim.sourceField,claim.confidence,claim.status]
    );
  }
}

function report(documents, database) {
  const byType = {};
  const bySource = {};
  for (const document of documents) {
    byType[document.entityType] = (byType[document.entityType] || 0) + 1;
    bySource[document.sourceType] = (bySource[document.sourceType] || 0) + 1;
  }
  const matchingDocuments = CONTAINS
    ? documents.filter(item => containsNormalizedTerms(item, CONTAINS))
    : [];
  return {
    mode: APPLY ? "apply" : "dry-run",
    generatedAt: new Date().toISOString(), siteCode: SITE_CODE, database,
    totals: { documents: documents.length, claims: documents.reduce((sum, item) => sum + item.claims.length, 0), byType, bySource },
    warnings: {
      withoutCoordinates: documents.filter(item => item.latitude == null || item.longitude == null).length,
      withoutImage: documents.filter(item => !item.primaryImageUrl).length,
      businessDescriptionsEligibleForConceptExtraction: documents.filter(item => item.entityType === "business" && item.searchableText).length,
    },
    contains: CONTAINS ? {
      query: CONTAINS,
      matches: matchingDocuments.length,
      documents: matchingDocuments.slice(0, 20).map(item => ({ canonicalKey: item.canonicalKey, type: item.entityType, title: item.title, source: item.sourceType })),
    } : null,
    samples: documents.slice(0, SAMPLE_SIZE).map(item => ({ canonicalKey: item.canonicalKey, type: item.entityType, title: item.title, source: item.sourceType, claims: item.claims.map(claim => claim.displayValue), qualityScore: item.qualityScore })),
  };
}

async function main() {
  if (!/^[a-z0-9_-]{2,80}$/i.test(SITE_CODE)) throw new Error("site inválido");
  const settings = config();
  if (APPLY && process.env.DESTINATION_AI_BACKFILL_CONFIRM !== settings.database) {
    throw new Error("Para escribir, DESTINATION_AI_BACKFILL_CONFIRM debe coincidir exactamente con DB_DATABASE_NAME");
  }
  const connection = await mysql.createConnection(settings);
  try {
    const [[server]] = await connection.query("SELECT DATABASE() database_name,VERSION() version");
    const documents = await loadDocuments(connection);
    const output = report(documents, server.database_name);
    output.mysqlVersion = server.version;
    if (APPLY) {
      await ensureTargetSchema(connection);
      for (let offset = 0; offset < documents.length; offset += BATCH_SIZE) {
        const batch = documents.slice(offset, offset + BATCH_SIZE);
        await connection.beginTransaction();
        try {
          for (const document of batch) await upsertDocument(connection, document);
          await connection.commit();
        } catch (error) {
          await connection.rollback();
          throw new Error(`Falló el lote ${offset + 1}-${offset + batch.length}: ${error.message}`);
        }
      }
      let staleDocuments = 0;
      if (documents.length) {
        const canonicalKeys = documents.map(document => document.canonicalKey);
        const placeholders = canonicalKeys.map(() => "?").join(",");
        const [staleResult] = await connection.execute(
          `UPDATE tags_ai_knowledge_documents d
              INNER JOIN tags_directory_sites ds ON ds.id=d.site_id AND ds.code=?
              SET d.visibility='stale',d.indexed_at=NOW()
            WHERE d.source_type IN ('directory_listing','qr_product','store_product','turnos_service','ai_chatbot_knowledge')
              AND d.canonical_key NOT IN (${placeholders})`,
          [SITE_CODE, ...canonicalKeys]
        );
        staleDocuments = Number(staleResult.affectedRows || 0);
      }
      output.applied = { documents: documents.length, staleDocuments, batchSize: BATCH_SIZE };
    }
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  process.stderr.write(`BACKFILL_ERROR: ${error.message}\n`);
  process.exitCode = 1;
});
