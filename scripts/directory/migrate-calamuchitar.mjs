import "dotenv/config";
import mysql from "mysql2/promise";
import crypto from "node:crypto";

const SOURCE_TABLES = [
  "publishers", "publishers_ac", "subscriptions", "subscription_categories", "images",
  "categories", "subcategories", "subsubcategories", "countries", "states", "regions", "locality",
];
const TARGET_TABLES = [
  "tags_directory_sites", "tags_directory_listings", "tags_directory_site_listings",
  "tags_directory_taxonomy_nodes", "tags_directory_taxonomy_closure", "tags_directory_listing_taxonomy",
  "tags_geo_places", "tags_directory_listing_places", "tags_directory_media",
  "tags_legacy_routes", "tags_legacy_entity_map",
];
const SOURCE_SYSTEM = "calamuchitar";

function slug(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "sin-nombre";
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizedText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizedEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return email.includes("@") && !email.startsWith("@") && !email.endsWith("@") ? email : "";
}

function legacyPublisherSlug(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, "").replace(/ /g, "-").replace(/[.:]/g, "").toLowerCase();
}

function isPublishablePublisher(row) {
  return Number(row.active) === 1 && Number(row.dummy || 0) !== 1 && Number(row.in_calamuchitar ?? 1) !== 0;
}

function coordinates(value) {
  const parts = String(value || "").replace(/[()]/g, "").split(/[;,]/).map(part => Number(part.trim()));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return [null, null];
  if (parts[0] < -90 || parts[0] > 90 || parts[1] < -180 || parts[1] > 180) return [null, null];
  return [parts[0], parts[1]];
}

function nullable(value) {
  const result = String(value ?? "").trim();
  return result && result !== "." ? result : null;
}

function duplicateGroups(items, keyFactory) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFactory(item);
    if (!key) continue;
    const current = groups.get(key) || [];
    current.push(item);
    groups.set(key, current);
  }
  return [...groups.entries()].filter(([, values]) => values.length > 1).map(([key, values]) => ({
    value: key,
    publishers: values.map(item => ({ id: item.id, source: item.__source, name: item.company_name })),
  }));
}

function config(prefix) {
  const value = name => process.env[`${prefix}_${name}`];
  const required = ["DB_HOST", "DB_USER", "DB_NAME"];
  const missing = required.filter(name => !value(name));
  if (missing.length) throw new Error(`Faltan variables ${missing.map(name => `${prefix}_${name}`).join(", ")}`);
  return {
    host: value("DB_HOST"), port: Number(value("DB_PORT") || 3306), user: value("DB_USER"),
    password: value("DB_PASSWORD") || "", database: value("DB_NAME"), charset: "utf8mb4",
  };
}

async function tableNames(connection) {
  const [rows] = await connection.query(
    "SELECT TABLE_NAME table_name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()"
  );
  return new Set(rows.map(row => row.table_name));
}

async function count(connection, table) {
  const [rows] = await connection.query(`SELECT COUNT(*) total FROM \`${table}\``);
  return Number(rows[0]?.total || 0);
}

async function columns(connection, table) {
  const [rows] = await connection.query(
    "SELECT COLUMN_NAME column_name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",
    [table]
  );
  return new Set(rows.map(row => row.column_name));
}

async function scalar(connection, sql) {
  const [rows] = await connection.query(sql);
  return Number(rows[0]?.total || 0);
}

async function auditSource(connection, available) {
  const counts = {};
  for (const table of SOURCE_TABLES) counts[table] = available.has(table) ? await count(connection, table) : null;
  const findings = {};
  if (available.has("publishers") && available.has("publishers_ac")) {
    const publisherColumns = await columns(connection, "publishers");
    const publisherAcColumns = await columns(connection, "publishers_ac");
    if (publisherColumns.has("id") && publisherAcColumns.has("id")) {
      findings.overlappingPublisherIds = await scalar(connection,
        "SELECT COUNT(*) total FROM publishers p INNER JOIN publishers_ac pa ON pa.id=p.id"
      );
    }
  }
  if (available.has("subscriptions") && available.has("subscription_categories")) {
    const subscriptionColumns = await columns(connection, "subscriptions");
    const relationColumns = await columns(connection, "subscription_categories");
    const subscriptionId = subscriptionColumns.has("id") ? "id" : subscriptionColumns.has("subscription_id") ? "subscription_id" : null;
    const relationId = relationColumns.has("subscription_id") ? "subscription_id" : relationColumns.has("subscription") ? "subscription" : null;
    if (subscriptionId && relationId) {
      findings.orphanSubscriptionCategories = await scalar(connection,
        `SELECT COUNT(*) total FROM subscription_categories sc LEFT JOIN subscriptions s ON s.\`${subscriptionId}\`=sc.\`${relationId}\` WHERE s.\`${subscriptionId}\` IS NULL`
      );
    }
  }
  return { counts, findings };
}

async function auditTarget(connection, available) {
  const counts = {};
  for (const table of TARGET_TABLES) counts[table] = available.has(table) ? await count(connection, table) : null;
  return { schemaReady: TARGET_TABLES.every(table => available.has(table)), counts };
}

async function rows(connection, table) {
  const [result] = await connection.query(`SELECT * FROM \`${table}\` ORDER BY id`);
  return result;
}

async function mappedTarget(connection, sourceTable, sourceId, targetTable) {
  const [result] = await connection.execute(
    "SELECT target_id FROM tags_legacy_entity_map WHERE source_system=? AND source_table=? AND source_id=? AND target_table=? LIMIT 1",
    [SOURCE_SYSTEM, sourceTable, String(sourceId), targetTable]
  );
  return result[0]?.target_id ? Number(result[0].target_id) : null;
}

async function saveMapping(connection, sourceTable, sourceRow, targetTable, targetId) {
  await connection.execute(
    `INSERT INTO tags_legacy_entity_map
       (source_system,source_table,source_id,target_table,target_id,source_fingerprint)
     VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE target_id=VALUES(target_id),source_fingerprint=VALUES(source_fingerprint),updated_at=CURRENT_TIMESTAMP`,
    [SOURCE_SYSTEM, sourceTable, String(sourceRow.id), targetTable, targetId, fingerprint(sourceRow)]
  );
}

async function availableTaxonomySlug(connection, parentId, baseSlug, sourceId) {
  const [result] = await connection.execute(
    "SELECT id FROM tags_directory_taxonomy_nodes WHERE parent_id <=> ? AND slug=? LIMIT 1",
    [parentId, baseSlug]
  );
  return result.length ? `${baseSlug}-${sourceId}` : baseSlug;
}

async function insertTaxonomyNode(connection, sourceTable, sourceRow, parentId, depth, imageField) {
  const previous = await mappedTarget(connection, sourceTable, sourceRow.id, "tags_directory_taxonomy_nodes");
  if (previous) return { id: previous, inserted: false };
  const nodeSlug = await availableTaxonomySlug(connection, parentId, slug(sourceRow.name), sourceRow.id);
  const [result] = await connection.execute(
    `INSERT INTO tags_directory_taxonomy_nodes
       (site_id,parent_id,name,slug,node_type,depth,image_url,sort_order,is_active)
     VALUES (?,?,?,?,?,?,?,?,1)`,
    [null, parentId, String(sourceRow.name || "Sin nombre").trim(), nodeSlug, "category", depth, sourceRow[imageField] || null, Number(sourceRow.id)]
  );
  const targetId = Number(result.insertId);
  await connection.execute(
    "INSERT IGNORE INTO tags_directory_taxonomy_closure (ancestor_id,descendant_id,depth) VALUES (?,?,0)",
    [targetId, targetId]
  );
  if (parentId) {
    await connection.execute(
      `INSERT IGNORE INTO tags_directory_taxonomy_closure (ancestor_id,descendant_id,depth)
       SELECT ancestor_id,?,depth+1 FROM tags_directory_taxonomy_closure WHERE descendant_id=?`,
      [targetId, parentId]
    );
  }
  await saveMapping(connection, sourceTable, sourceRow, "tags_directory_taxonomy_nodes", targetId);
  return { id: targetId, inserted: true };
}

async function availableGeoSlug(connection, parentId, placeType, baseSlug, sourceId) {
  const [result] = await connection.execute(
    "SELECT id FROM tags_geo_places WHERE parent_id <=> ? AND place_type=? AND slug=? LIMIT 1",
    [parentId, placeType, baseSlug]
  );
  return result.length ? `${baseSlug}-${sourceId}` : baseSlug;
}

async function availableListingSlug(connection, siteId, baseSlug, sourceId) {
  const [result] = await connection.execute(
    "SELECT id FROM tags_directory_site_listings WHERE site_id=? AND slug=? LIMIT 1",
    [siteId, baseSlug]
  );
  return result.length ? `${baseSlug}-${sourceId}` : baseSlug;
}

async function insertGeoPlace(connection, sourceTable, sourceRow, parentId, placeType) {
  const previous = await mappedTarget(connection, sourceTable, sourceRow.id, "tags_geo_places");
  if (previous) return { id: previous, inserted: false };
  const placeSlug = await availableGeoSlug(connection, parentId, placeType, slug(sourceRow.name), sourceRow.id);
  const [result] = await connection.execute(
    "INSERT INTO tags_geo_places (parent_id,place_type,name,slug,is_active) VALUES (?,?,?,?,1)",
    [parentId, placeType, String(sourceRow.name || "Sin nombre").trim(), placeSlug]
  );
  const targetId = Number(result.insertId);
  await saveMapping(connection, sourceTable, sourceRow, "tags_geo_places", targetId);
  return { id: targetId, inserted: true };
}

async function migrationPreview(source) {
  const [categories, subcategories, subsubcategories, countries, states, regions, localities] = await Promise.all([
    rows(source, "categories"), rows(source, "subcategories"), rows(source, "subsubcategories"),
    rows(source, "countries"), rows(source, "states"), rows(source, "regions"), rows(source, "locality"),
  ]);
  const categoryIds = new Set(categories.map(row => Number(row.id)));
  const subcategoryIds = new Set(subcategories.map(row => Number(row.id)));
  const countryIds = new Set(countries.map(row => Number(row.id)));
  const stateIds = new Set(states.map(row => Number(row.id)));
  const regionIds = new Set(regions.map(row => Number(row.id)));
  return {
    records: { categories: categories.length, subcategories: subcategories.length, subsubcategories: subsubcategories.length, countries: countries.length, states: states.length, regions: regions.length, locality: localities.length },
    orphanParents: {
      subcategories: subcategories.filter(row => !categoryIds.has(Number(row.category_id))).map(row => row.id),
      subsubcategories: subsubcategories.filter(row => !subcategoryIds.has(Number(row.subcategory_id))).map(row => row.id),
      states: states.filter(row => !countryIds.has(Number(row.country_id))).map(row => row.id),
      regions: regions.filter(row => !stateIds.has(Number(row.state_id))).map(row => row.id),
      locality: localities.filter(row => !regionIds.has(Number(row.region_id))).map(row => row.id),
    },
  };
}

async function publisherMigrationPreview(source, target) {
  const [legacyPublishers, currentPublishers, subscriptions, categoryRelations, media, businesses] = await Promise.all([
    rows(source, "publishers"), rows(source, "publishers_ac"), rows(source, "subscriptions"),
    rows(source, "subscription_categories"), rows(source, "images"), rows(target, "tags_businesses"),
  ]);
  const selected = new Map();
  for (const row of legacyPublishers) selected.set(Number(row.id), { ...row, __source: "publishers" });
  for (const row of currentPublishers) selected.set(Number(row.id), { ...row, __source: "publishers_ac" });
  const publishers = [...selected.values()].sort((a, b) => Number(a.id) - Number(b.id));
  const publisherIds = new Set(publishers.map(row => Number(row.id)));
  const subscriptionIds = new Set(subscriptions.map(row => Number(row.id)));
  const taxonomyMapTables = {
    category_id: "categories", subcategory_id: "subcategories", subsubcategory_id: "subsubcategories",
  };
  const unresolvedTaxonomyRelations = [];
  for (const relation of categoryRelations) {
    for (const [field, sourceTable] of Object.entries(taxonomyMapTables)) {
      if (!relation[field]) continue;
      if (!await mappedTarget(target, sourceTable, relation[field], "tags_directory_taxonomy_nodes")) {
        unresolvedTaxonomyRelations.push({ relationId: relation.id, field, sourceId: relation[field] });
      }
    }
  }
  const businessByEmail = new Map();
  for (const business of businesses) {
    const email = normalizedEmail(business.email);
    if (!email) continue;
    const list = businessByEmail.get(email) || [];
    list.push(business);
    businessByEmail.set(email, list);
  }
  const safeBusinessMatches = [];
  const ambiguousBusinessMatches = [];
  for (const publisher of publishers) {
    const email = normalizedEmail(publisher.email1);
    const candidates = email ? businessByEmail.get(email) || [] : [];
    if (!candidates.length) continue;
    const sameName = candidates.filter(business => {
      const publisherName = normalizedText(publisher.company_name);
      return [business.name, business.display_name].some(name => normalizedText(name) === publisherName);
    });
    if (sameName.length === 1) {
      safeBusinessMatches.push({ publisherId: publisher.id, publisherName: publisher.company_name, businessId: sameName[0].id });
    } else {
      ambiguousBusinessMatches.push({
        publisherId: publisher.id, publisherName: publisher.company_name, email,
        candidateBusinesses: candidates.map(item => ({ id: item.id, name: item.name, displayName: item.display_name })),
      });
    }
  }
  return {
    selectionRule: "publishers_ac replaces publishers when id overlaps",
    selectedPublishers: publishers.length,
    selectedFromPublishersAc: publishers.filter(row => row.__source === "publishers_ac").length,
    selectedOnlyFromLegacyPublishers: publishers.filter(row => row.__source === "publishers").length,
    activePublishers: publishers.filter(row => Number(row.active) === 1).length,
    inactivePublishers: publishers.filter(row => Number(row.active) !== 1).length,
    duplicatedEmails: duplicateGroups(publishers, row => normalizedEmail(row.email1)),
    duplicatedLegacySlugs: duplicateGroups(publishers, row => legacyPublisherSlug(row.name_site || row.company_name)),
    subscriptions: subscriptions.length,
    subscriptionsWithoutSelectedPublisher: subscriptions.filter(row => !publisherIds.has(Number(row.publisher))).map(row => ({ id: row.id, publisherId: row.publisher })),
    categoryRelations: categoryRelations.length,
    categoryRelationsWithoutSubscription: categoryRelations.filter(row => !subscriptionIds.has(Number(row.subscription_id))).map(row => row.id),
    unresolvedTaxonomyRelations,
    media: media.length,
    mediaWithoutSubscription: media.filter(row => !subscriptionIds.has(Number(row.subscription_id))).map(row => row.id),
    safeBusinessMatches,
    ambiguousBusinessMatches,
  };
}

async function selectedPublishers(source) {
  const [legacy, current] = await Promise.all([rows(source, "publishers"), rows(source, "publishers_ac")]);
  const selected = new Map();
  for (const row of legacy) selected.set(Number(row.id), { ...row, __source: "publishers" });
  for (const row of current) selected.set(Number(row.id), { ...row, __source: "publishers_ac" });
  return [...selected.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

async function findPublisherLocality(target, publisher) {
  if (publisher.__source === "publishers_ac" && publisher.city) {
    return mappedTarget(target, "locality", publisher.city, "tags_geo_places");
  }
  const cityName = nullable(publisher.city);
  if (!cityName) return null;
  const [result] = await target.execute(
    "SELECT id FROM tags_geo_places WHERE place_type='locality' AND LOWER(name)=LOWER(?) ORDER BY id LIMIT 1",
    [cityName]
  );
  return result[0]?.id ? Number(result[0].id) : null;
}

async function applyPublisherListings(source, target) {
  const [siteRows] = await target.execute("SELECT id FROM tags_directory_sites WHERE code=? LIMIT 1", [SOURCE_SYSTEM]);
  if (!siteRows[0]) throw new Error("No existe el canal calamuchitar");
  const siteId = Number(siteRows[0].id);
  const publishers = await selectedPublishers(source);
  const [legacyRows, subscriptions, relations, images] = await Promise.all([
    rows(source, "publishers"), rows(source, "subscriptions"), rows(source, "subscription_categories"), rows(source, "images"),
  ]);
  const legacyById = new Map(legacyRows.map(row => [Number(row.id), row]));
  const subscriptionsByPublisher = new Map();
  for (const subscription of subscriptions) {
    const list = subscriptionsByPublisher.get(Number(subscription.publisher)) || [];
    list.push(subscription);
    subscriptionsByPublisher.set(Number(subscription.publisher), list);
  }
  const relationsBySubscription = new Map();
  for (const relation of relations) {
    const list = relationsBySubscription.get(Number(relation.subscription_id)) || [];
    list.push(relation);
    relationsBySubscription.set(Number(relation.subscription_id), list);
  }
  const imagesBySubscription = new Map();
  for (const image of images) {
    const list = imagesBySubscription.get(Number(image.subscription_id)) || [];
    list.push(image);
    imagesBySubscription.set(Number(image.subscription_id), list);
  }
  const stats = { listings: 0, published: 0, archived: 0, siteListings: 0, legacyRoutes: 0, routeCollisions: [], taxonomyLinks: 0, placeLinks: 0, media: 0 };
  await target.beginTransaction();
  try {
    for (const publisher of publishers) {
      let listingId = await mappedTarget(target, publisher.__source, publisher.id, "tags_directory_listings");
      const publishable = isPublishablePublisher(publisher);
      if (!listingId) {
        const [latitude, longitude] = coordinates(publisher.coordinates);
        const safePayload = {
          publisherId: publisher.id, sourceTable: publisher.__source, creationDate: publisher.creationdate || null,
          modality: publisher.modality ?? null, rating: publisher.rating ?? null, legacyFlags: {
            site: publisher.site ?? null, catalog: publisher.catalog ?? null, isRestoran: publisher.is_restoran ?? null,
            isEcommerce: publisher.is_ecommerce ?? null, inCalamuchitar: publisher.in_calamuchitar ?? null,
          },
        };
        const [result] = await target.execute(
          `INSERT INTO tags_directory_listings
             (business_id,display_name,short_description,description,email,phone,whatsapp,website_url,address,latitude,longitude,contact_config,social_config,source_payload,status)
           VALUES (NULL,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            nullable(publisher.company_name) || `Publisher ${publisher.id}`,
            nullable(publisher.description1)?.slice(0, 500) || null,
            nullable(publisher.description2) || nullable(publisher.description1),
            normalizedEmail(publisher.email1) || null, nullable(publisher.phone), nullable(publisher.whatsapp), nullable(publisher.web), nullable(publisher.street),
            latitude, longitude,
            JSON.stringify({ email2: nullable(publisher.email2) }),
            JSON.stringify({ instagram: nullable(publisher.ig), facebook: nullable(publisher.fb) }),
            JSON.stringify(safePayload), publishable ? "published" : "archived",
          ]
        );
        listingId = Number(result.insertId);
        await saveMapping(target, publisher.__source, publisher, "tags_directory_listings", listingId);
        const overwrittenLegacy = legacyById.get(Number(publisher.id));
        if (publisher.__source === "publishers_ac" && overwrittenLegacy) {
          await saveMapping(target, "publishers", overwrittenLegacy, "tags_directory_listings", listingId);
        }
        stats.listings++;
      }
      if (publishable) stats.published++; else stats.archived++;

      let siteListingId = await mappedTarget(target, publisher.__source, publisher.id, "tags_directory_site_listings");
      const preferredSlug = slug(publisher.name_site || publisher.company_name || `publisher-${publisher.id}`);
      if (!siteListingId) {
        const listingSlug = await availableListingSlug(target, siteId, preferredSlug, publisher.id);
        const [result] = await target.execute(
          `INSERT INTO tags_directory_site_listings
             (site_id,listing_id,slug,publication_status,is_free,is_featured,sort_order,seo_title,seo_description,seo_keywords,published_at)
           VALUES (?,?,?,?,?,0,?,?,?,?,?)`,
          [siteId, listingId, listingSlug, publishable ? "published" : "archived", Number(publisher.site) === 1 || nullable(publisher.name_site) ? 0 : 1, Number(publisher.id), nullable(publisher.company_name), nullable(publisher.description1)?.slice(0, 500) || null, nullable(publisher.keywords), publishable ? (publisher.creationdate || new Date()) : null]
        );
        siteListingId = Number(result.insertId);
        await saveMapping(target, publisher.__source, publisher, "tags_directory_site_listings", siteListingId);
        stats.siteListings++;
      }

      if (publishable) {
        const legacyPath = `/${legacyPublisherSlug(publisher.name_site || publisher.company_name)}`;
        const [routeRows] = await target.execute("SELECT listing_id FROM tags_legacy_routes WHERE site_id=? AND legacy_path=? LIMIT 1", [siteId, legacyPath]);
        if (!routeRows.length) {
          await target.execute(
            "INSERT INTO tags_legacy_routes (site_id,listing_id,source_system,legacy_path,route_type,is_active) VALUES (?,?,?,?, 'render',1)",
            [siteId, listingId, SOURCE_SYSTEM, legacyPath]
          );
          stats.legacyRoutes++;
        } else if (Number(routeRows[0].listing_id) !== listingId) {
          stats.routeCollisions.push({ legacyPath, publisherId: publisher.id, existingListingId: routeRows[0].listing_id });
        }
      }

      const publisherSubscriptions = subscriptionsByPublisher.get(Number(publisher.id)) || [];
      const taxonomyIds = new Set();
      for (const subscription of publisherSubscriptions) {
        await saveMapping(target, "subscriptions", subscription, "tags_directory_listings", listingId);
        for (const relation of relationsBySubscription.get(Number(subscription.id)) || []) {
          for (const [field, sourceTable] of [["category_id", "categories"], ["subcategory_id", "subcategories"], ["subsubcategory_id", "subsubcategories"]]) {
            if (!relation[field]) continue;
            const taxonomyId = await mappedTarget(target, sourceTable, relation[field], "tags_directory_taxonomy_nodes");
            if (taxonomyId) taxonomyIds.add(taxonomyId);
          }
        }
        for (const image of imagesBySubscription.get(Number(subscription.id)) || []) {
          if (await mappedTarget(target, "images", image.id, "tags_directory_media")) continue;
          const [result] = await target.execute(
            "INSERT INTO tags_directory_media (listing_id,media_type,url,sort_order,is_active,source_payload) VALUES (?,'gallery',?,?,1,?)",
            [listingId, image.image_name, Number(image.id), JSON.stringify({ subscriptionId: subscription.id })]
          );
          await saveMapping(target, "images", image, "tags_directory_media", Number(result.insertId));
          stats.media++;
        }
      }
      let primaryAssigned = false;
      for (const taxonomyId of taxonomyIds) {
        const [result] = await target.execute(
          "INSERT IGNORE INTO tags_directory_listing_taxonomy (listing_id,taxonomy_node_id,is_primary,sort_order) VALUES (?,?,?,?)",
          [listingId, taxonomyId, primaryAssigned ? 0 : 1, primaryAssigned ? 1 : 0]
        );
        if (result.affectedRows) stats.taxonomyLinks++;
        primaryAssigned = true;
      }

      const localityId = await findPublisherLocality(target, publisher);
      if (localityId) {
        const [result] = await target.execute(
          "INSERT IGNORE INTO tags_directory_listing_places (listing_id,place_id,relation_type,is_primary) VALUES (?,?,'location',1)",
          [listingId, localityId]
        );
        if (result.affectedRows) stats.placeLinks++;
      }

      const profileUrl = nullable(publisher.profile_image || publisher.profileimage);
      if (profileUrl && !await mappedTarget(target, publisher.__source, publisher.id, "tags_directory_media")) {
        const [result] = await target.execute(
          "INSERT INTO tags_directory_media (listing_id,media_type,url,sort_order,is_active,source_payload) VALUES (?,'logo',?,0,1,?)",
          [listingId, profileUrl, JSON.stringify({ publisherId: publisher.id, sourceTable: publisher.__source })]
        );
        await saveMapping(target, publisher.__source, publisher, "tags_directory_media", Number(result.insertId));
        stats.media++;
      }
    }
    await target.commit();
    return stats;
  } catch (error) {
    await target.rollback();
    throw error;
  }
}

async function applyTaxonomyAndGeography(source, target) {
  const inserted = { taxonomy: 0, geography: 0 };
  await target.beginTransaction();
  try {
    for (const row of await rows(source, "categories")) {
      const result = await insertTaxonomyNode(target, "categories", row, null, 0, "img_name");
      if (result.inserted) inserted.taxonomy++;
    }
    for (const row of await rows(source, "subcategories")) {
      const parentId = await mappedTarget(target, "categories", row.category_id, "tags_directory_taxonomy_nodes");
      if (!parentId) throw new Error(`Subcategoría ${row.id} sin categoría migrada ${row.category_id}`);
      const result = await insertTaxonomyNode(target, "subcategories", row, parentId, 1, "img_name");
      if (result.inserted) inserted.taxonomy++;
    }
    for (const row of await rows(source, "subsubcategories")) {
      const parentId = await mappedTarget(target, "subcategories", row.subcategory_id, "tags_directory_taxonomy_nodes");
      if (!parentId) throw new Error(`Subsubcategoría ${row.id} sin subcategoría migrada ${row.subcategory_id}`);
      const result = await insertTaxonomyNode(target, "subsubcategories", row, parentId, 2, "image");
      if (result.inserted) inserted.taxonomy++;
    }
    const geoLevels = [
      ["countries", null, "country_id", "country"],
      ["states", "countries", "country_id", "state"],
      ["regions", "states", "state_id", "region"],
      ["locality", "regions", "region_id", "locality"],
    ];
    for (const [table, parentTable, parentField, placeType] of geoLevels) {
      for (const row of await rows(source, table)) {
        const parentId = parentTable ? await mappedTarget(target, parentTable, row[parentField], "tags_geo_places") : null;
        if (parentTable && !parentId) throw new Error(`${table} ${row.id} sin padre migrado ${row[parentField]}`);
        const result = await insertGeoPlace(target, table, row, parentId, placeType);
        if (result.inserted) inserted.geography++;
      }
    }
    await target.commit();
    return inserted;
  } catch (error) {
    await target.rollback();
    throw error;
  }
}

async function main() {
  const apply = process.argv.includes("--apply-taxonomy-geo");
  const applyListings = process.argv.includes("--apply-publisher-listings");
  if (process.argv.includes("--apply") && !apply && !applyListings) throw new Error("Use un alcance explícito de aplicación");
  const sourceConfig = config("DIRECTORY_SOURCE");
  const targetConfig = config("DIRECTORY_TARGET");
  if ((apply || applyListings) && process.env.DIRECTORY_MIGRATION_CONFIRM !== targetConfig.database) {
    throw new Error("Para escribir, DIRECTORY_MIGRATION_CONFIRM debe coincidir exactamente con DIRECTORY_TARGET_DB_NAME");
  }
  const source = await mysql.createConnection(sourceConfig);
  const target = await mysql.createConnection(targetConfig);
  try {
    const [sourceTables, targetTables] = await Promise.all([tableNames(source), tableNames(target)]);
    const [sourceAudit, targetAudit, preview, publisherPreview] = await Promise.all([
      auditSource(source, sourceTables), auditTarget(target, targetTables), migrationPreview(source), publisherMigrationPreview(source, target),
    ]);
    const hasOrphans = Object.values(preview.orphanParents).some(ids => ids.length);
    if (apply && (!targetAudit.schemaReady || reportMissing(sourceTables).length || hasOrphans)) {
      throw new Error("La migración no puede aplicarse: faltan tablas o existen relaciones padre huérfanas");
    }
    const applied = apply ? await applyTaxonomyAndGeography(source, target) : applyListings ? await applyPublisherListings(source, target) : null;
    const report = {
      mode: apply ? "apply-taxonomy-geo" : applyListings ? "apply-publisher-listings" : "audit-only",
      generatedAt: new Date().toISOString(),
      sourceDatabase: sourceConfig.database,
      targetDatabase: targetConfig.database,
      missingSourceTables: SOURCE_TABLES.filter(table => !sourceTables.has(table)),
      source: sourceAudit,
      target: targetAudit,
      migrationPreview: preview,
      publisherMigrationPreview: publisherPreview,
      applied,
      nextDecision: "Definir unificación publishers/publishers_ac e inventario de rutas de producción antes de migrar fichas.",
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.missingSourceTables.length) process.exitCode = 2;
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
}

function reportMissing(available) {
  return SOURCE_TABLES.filter(table => !available.has(table));
}

main().catch(error => {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
});
