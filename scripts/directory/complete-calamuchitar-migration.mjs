import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

async function importStandaloneSource(relativeUrl) {
  const source = await fs.readFile(new URL(relativeUrl, import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const { defaultStoreTemplate } = await importStandaloneSource("../../app/modules/store/lib/defaultStoreTemplate.js");
const { storeModuleDefinitions } = await importStandaloneSource("../../app/modules/store/lib/storeModuleDefinitions.js");
const { getDefaultQRPageTemplate } = await importStandaloneSource("../../app/modules/qr-page/lib/defaultQRPageTemplate.js");

const SOURCE_SYSTEM = "calamuchitar";
const CATALOG_TABLES = ["products", "product_category", "product_subcategory", "product_images", "product_sizes", "product_colors"];
const CATALOG_TARGET_TABLES = [
  "tags_business_addons", "tags_products", "tags_qr_codes", "tags_qr_addon_usage", "tags_qr_pages", "tags_stores", "tags_store_sections", "tags_store_blocks",
  "tags_store_categories", "tags_store_products", "tags_store_product_images", "tags_store_options", "tags_store_option_values",
  "tags_store_variants", "tags_store_variant_values",
];

function argument(name, fallback = "") {
  const prefix = `${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function csvSet(name, normalize = value => value) {
  return new Set(argument(name).split(",").map(value => value.trim()).filter(Boolean).map(normalize));
}

function config(prefix) {
  const value = name => process.env[`${prefix}_${name}`];
  const missing = ["DB_HOST", "DB_USER", "DB_NAME"].filter(name => !value(name));
  if (missing.length) throw new Error(`Faltan variables ${missing.map(name => `${prefix}_${name}`).join(", ")}`);
  return {
    host: value("DB_HOST"),
    port: Number(value("DB_PORT") || 3306),
    user: value("DB_USER"),
    password: value("DB_PASSWORD") || "",
    database: value("DB_NAME"),
    charset: "utf8mb4",
  };
}

function normalizedEmail(value) {
  const result = String(value || "").trim().toLowerCase();
  return result.includes("@") && !result.startsWith("@") && !result.endsWith("@") ? result : "";
}

function normalizedText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function nullable(value) {
  const result = String(value ?? "").trim();
  return result && result !== "." ? result : null;
}

function hasLegacyWeb(publisher) {
  return Number(publisher.site) === 1
    || Boolean(nullable(publisher.name_site))
    || publisher.__hasLegacyGallery === true
    || Number(publisher.catalog) === 1
    || Number(publisher.eshoop) === 1;
}

function slug(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "sin-nombre";
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function tableNames(connection) {
  const [rows] = await connection.query("SELECT TABLE_NAME table_name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()");
  return new Set(rows.map(row => row.table_name));
}

async function rows(connection, table) {
  const [result] = await connection.query(`SELECT * FROM \`${table}\` ORDER BY id`);
  return result;
}

async function selectedPublishers(source) {
  const selected = new Map();
  for (const row of await rows(source, "publishers")) selected.set(Number(row.id), { ...row, __source: "publishers" });
  for (const row of await rows(source, "publishers_ac")) selected.set(Number(row.id), { ...row, __source: "publishers_ac" });
  return [...selected.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

async function legacyGalleryOwners(source, sourceTables) {
  if (!sourceTables.has("subscriptions") || !sourceTables.has("images")) return { ids: new Set(), emails: new Set() };
  const [subscriptions, images, legacyPublishers, currentPublishers] = await Promise.all([
    rows(source, "subscriptions"),
    rows(source, "images"),
    sourceTables.has("publishers") ? rows(source, "publishers") : [],
    sourceTables.has("publishers_ac") ? rows(source, "publishers_ac") : [],
  ]);
  const publisherBySubscription = new Map(
    subscriptions.map(subscription => [Number(subscription.id), Number(subscription.publisher)])
  );
  const publisherById = new Map(currentPublishers.map(publisher => [Number(publisher.id), publisher]));
  for (const publisher of legacyPublishers) {
    if (!publisherById.has(Number(publisher.id))) publisherById.set(Number(publisher.id), publisher);
  }
  const publisherIds = new Set();
  const publisherEmails = new Set();
  for (const image of images) {
    if (!nullable(image.image_name)) continue;
    const publisherId = publisherBySubscription.get(Number(image.subscription_id));
    if (!publisherId) continue;
    publisherIds.add(publisherId);
    const publisher = publisherById.get(publisherId);
    const email = normalizedEmail(publisher?.email1);
    if (email) publisherEmails.add(email);
  }
  return { ids: publisherIds, emails: publisherEmails };
}

async function mappedTarget(connection, sourceTable, sourceId, targetTable) {
  const [result] = await connection.execute(
    "SELECT target_id FROM tags_legacy_entity_map WHERE source_system=? AND source_table=? AND source_id=? AND target_table=? LIMIT 1",
    [SOURCE_SYSTEM, sourceTable, String(sourceId), targetTable]
  );
  return result[0]?.target_id ? Number(result[0].target_id) : null;
}

async function saveMapping(connection, sourceTable, sourceId, sourceValue, targetTable, targetId) {
  await connection.execute(
    `INSERT INTO tags_legacy_entity_map
       (source_system,source_table,source_id,target_table,target_id,source_fingerprint)
     VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE target_id=VALUES(target_id),source_fingerprint=VALUES(source_fingerprint),updated_at=CURRENT_TIMESTAMP`,
    [SOURCE_SYSTEM, sourceTable, String(sourceId), targetTable, targetId, fingerprint(sourceValue)]
  );
}

async function publisherListingId(target, publisher) {
  return mappedTarget(target, publisher.__source, publisher.id, "tags_directory_listings")
    || mappedTarget(target, publisher.__source === "publishers_ac" ? "publishers" : "publishers_ac", publisher.id, "tags_directory_listings");
}

async function publisherBusinessId(target, publisher) {
  const mapped = await mappedTarget(target, publisher.__source, publisher.id, "tags_businesses");
  if (mapped) return mapped;
  const listingId = await publisherListingId(target, publisher);
  if (!listingId) return null;
  const [rows] = await target.execute("SELECT business_id FROM tags_directory_listings WHERE id=? LIMIT 1", [listingId]);
  return rows[0]?.business_id ? Number(rows[0].business_id) : null;
}

function publisherBusinessValues(publisher) {
  const name = nullable(publisher.company_name) || `Prestador ${publisher.id}`;
  return {
    name,
    displayName: name,
    email:
      normalizedEmail(publisher.email1) ||
      `legacy-${publisher.id}@calamuchita.ar`,
    phone: nullable(publisher.phone),
    description: nullable(publisher.description2) || nullable(publisher.description1),
    logoUrl: nullable(publisher.profile_image || publisher.profileimage),
    whatsapp: nullable(publisher.whatsapp),
    address: nullable(publisher.street),
    websiteUrl: nullable(publisher.web),
    instagramUrl: nullable(publisher.ig),
    facebookUrl: nullable(publisher.fb),
  };
}

/*
 * La migracion historica primero carga el listado Directory. Ese listado no
 * puede quedar como fuente de lectura: el editor del cliente trabaja sobre
 * tags_businesses, tags_qr_pages y sus bloques. Esta sincronizacion es
 * idempotente y tambien sirve para reparar fichas que ya existian.
 */
async function syncDefinitiveDirectoryProfile(target, { businessId, listingId, publisher }) {
  if (!Number(businessId) || !Number(listingId)) return;

  const [listingRows] = await target.execute(
    "SELECT * FROM tags_directory_listings WHERE id=? AND business_id=? LIMIT 1",
    [listingId, businessId]
  );
  const listing = listingRows[0];
  if (!listing) return;

  const [mediaRows] = await target.execute(
    "SELECT media_type,url FROM tags_directory_media WHERE listing_id=? AND is_active=1 ORDER BY sort_order,id",
    [listingId]
  );
  const logoUrl = mediaRows.find(item => item.media_type === "logo")?.url || null;
  const coverUrl = mediaRows.find(item => item.media_type === "cover")?.url || null;
  const values = publisherBusinessValues(publisher || {});
  const descriptionShort = nullable(publisher?.description1) || nullable(listing.short_description);
  const descriptionLong = nullable(publisher?.description2) || nullable(listing.description) || descriptionShort;
  const businessName = values.displayName || listing.display_name;

  await target.execute(
    `UPDATE tags_businesses SET
       display_name=COALESCE(NULLIF(display_name,''),?),
       email=COALESCE(NULLIF(email,''),?),
       phone=COALESCE(NULLIF(phone,''),?),
       description=COALESCE(NULLIF(description,''),?),
       logo_url=COALESCE(NULLIF(logo_url,''),?),
       cover_url=COALESCE(NULLIF(cover_url,''),?),
       whatsapp=COALESCE(NULLIF(whatsapp,''),?),
       address=COALESCE(NULLIF(address,''),?),
       website_url=COALESCE(NULLIF(website_url,''),?),
       instagram_url=COALESCE(NULLIF(instagram_url,''),?),
       facebook_url=COALESCE(NULLIF(facebook_url,''),?),
       updated_at=NOW()
     WHERE id=?`,
    [
      businessName || null,
      nullable(listing.email) || values.email || null,
      nullable(listing.phone) || values.phone || null,
      descriptionLong || null,
      logoUrl || values.logoUrl || null,
      coverUrl || null,
      nullable(listing.whatsapp) || values.whatsapp || null,
      nullable(listing.address) || values.address || null,
      nullable(listing.website_url) || values.websiteUrl || null,
      nullable(listing.instagram_url) || values.instagramUrl || null,
      nullable(listing.facebook_url) || values.facebookUrl || null,
      businessId,
    ]
  );

  const [pageRows] = await target.execute(
    "SELECT id FROM tags_qr_pages WHERE id=(SELECT qr_page_id FROM tags_directory_listings WHERE id=? LIMIT 1) AND business_id=? LIMIT 1",
    [listingId, businessId]
  );
  if (!pageRows.length) return;

  const pageId = Number(pageRows[0].id);
  await target.execute(
    `UPDATE tags_qr_pages SET
       title=COALESCE(NULLIF(title,''),?),
       description=COALESCE(NULLIF(description,''),?),
       logo_url=COALESCE(NULLIF(logo_url,''),?),
       cover_image_url=COALESCE(NULLIF(cover_image_url,''),?),
       whatsapp=COALESCE(NULLIF(whatsapp,''),?),
       email=COALESCE(NULLIF(email,''),?),
       phone=COALESCE(NULLIF(phone,''),?),
       address=COALESCE(NULLIF(address,''),?),
       website_url=COALESCE(NULLIF(website_url,''),?),
       instagram_url=COALESCE(NULLIF(instagram_url,''),?),
       facebook_url=COALESCE(NULLIF(facebook_url,''),?),
       updated_at=NOW()
     WHERE id=? AND business_id=?`,
    [
      businessName || null,
      descriptionLong || null,
      logoUrl || values.logoUrl || null,
      coverUrl || null,
      nullable(listing.whatsapp) || values.whatsapp || null,
      nullable(listing.email) || values.email || null,
      nullable(listing.phone) || values.phone || null,
      nullable(listing.address) || values.address || null,
      nullable(listing.website_url) || values.websiteUrl || null,
      nullable(listing.instagram_url) || values.instagramUrl || null,
      nullable(listing.facebook_url) || values.facebookUrl || null,
      pageId,
      businessId,
    ]
  );

  const [blocks] = await target.execute(
    `SELECT b.id,b.content_json
     FROM tags_qr_page_sections s
     INNER JOIN tags_qr_page_blocks b ON b.section_id=s.id AND b.type='web_section'
     WHERE s.page_id=? AND JSON_UNQUOTE(JSON_EXTRACT(s.settings_json,'$.directoryBaseSlot'))='presentation'
     ORDER BY b.id LIMIT 1`,
    [pageId]
  );
  if (blocks.length) {
    let content = {};
    try { content = JSON.parse(blocks[0].content_json || "{}"); } catch { content = {}; }
    const paragraphs = descriptionLong && descriptionLong !== descriptionShort ? [descriptionLong] : [];
    await target.execute(
      "UPDATE tags_qr_page_blocks SET content_json=? WHERE id=?",
      [JSON.stringify({ ...content, title: businessName || content.title || "", highlightedText: descriptionShort || "", paragraphs }), blocks[0].id]
    );
  }
}

async function businessPromotionPlan(source, target, resolutions = {}, publisherIds = new Set(), options = {}) {
  const galleryPublisherIds = options.galleryPublisherIds || new Set();
  const galleryPublisherEmails = options.galleryPublisherEmails || new Set();
  const publishers = (await selectedPublishers(source))
    .map(publisher => ({
      ...publisher,
      __hasLegacyGallery: galleryPublisherIds.has(Number(publisher.id)) || galleryPublisherEmails.has(normalizedEmail(publisher.email1)),
    }))
    .filter(publisher => !publisherIds.size || publisherIds.has(Number(publisher.id)))
    .filter(publisher => !options.excludedPublisherIds?.has(Number(publisher.id)))
    .filter(publisher => options.allPublishers || Number(publisher.dummy) === 1 || hasLegacyWeb(publisher));
  const [businesses] = await target.query("SELECT id,name,display_name,email FROM tags_businesses ORDER BY id");
  const byEmail = new Map();
  for (const business of businesses) {
    const email = normalizedEmail(business.email);
    if (!email) continue;
    const list = byEmail.get(email) || [];
    list.push(business);
    byEmail.set(email, list);
  }
  const plan = [];
  for (const publisher of publishers) {
    const listingId = await publisherListingId(target, publisher);
    if (!listingId) {
      plan.push({ action: "blocked", reason: "listing_not_migrated", publisher });
      continue;
    }
    const [listingRows] = await target.execute("SELECT business_id FROM tags_directory_listings WHERE id=? LIMIT 1", [listingId]);
    if (listingRows[0]?.business_id) {
      plan.push({ action: "linked", publisher, listingId, businessId: Number(listingRows[0].business_id) });
      continue;
    }
    const mapped = await mappedTarget(target, publisher.__source, publisher.id, "tags_businesses");
    if (mapped) {
      plan.push({ action: "match", matchReason: "legacy_mapping", publisher, listingId, businessId: mapped });
      continue;
    }
    const values = publisherBusinessValues(publisher);

    if (!values.email) {
      plan.push({
        action: "blocked",
        reason: "invalid_email",
        publisher
      });
      continue;
    }

    const businessResolutions = resolutions.businesses || resolutions;
    const resolution = businessResolutions[`${publisher.__source}:${publisher.id}`] ?? businessResolutions[`publisher:${publisher.id}`];
    if (resolution === "create") {
      plan.push({ action: "create", matchReason: "manual_resolution", publisher, listingId, values });
      continue;
    }
    if (Number(resolution) > 0) {
      const selectedBusiness = businesses.find(item => Number(item.id) === Number(resolution));
      if (!selectedBusiness) {
        plan.push({ action: "blocked", reason: "resolved_business_not_found", publisher, listingId, requestedBusinessId: Number(resolution) });
      } else {
        plan.push({ action: "match", matchReason: "manual_resolution", publisher, listingId, businessId: Number(selectedBusiness.id) });
      }
      continue;
    }
    const candidates = values.email ? byEmail.get(values.email) || [] : [];
    const sameName = candidates.filter(item => [item.name, item.display_name].some(name => normalizedText(name) === normalizedText(values.name)));
    if (sameName.length === 1) {
      plan.push({ action: "match", matchReason: "same_email_and_name", publisher, listingId, businessId: Number(sameName[0].id) });
    } else if (candidates.length) {
      plan.push({ action: "blocked", reason: "ambiguous_existing_email", publisher, listingId, candidateBusinessIds: candidates.map(item => item.id) });
    } else {
      plan.push({ action: "create", publisher, listingId, values });
    }
  }
  return plan;
}

async function ensureAddon(conn, businessId, addonCode) {
  const [rows] = await conn.execute("SELECT id FROM tags_business_addons WHERE business_id=? AND addon_code=? LIMIT 1", [businessId, addonCode]);
  if (rows.length) {
    await conn.execute("UPDATE tags_business_addons SET status='active',expires_at=NULL WHERE id=?", [rows[0].id]);
    return false;
  }
  await conn.execute(
    "INSERT INTO tags_business_addons (business_id,addon_code,quantity,status,amount,currency,notes,started_at) VALUES (?,?,1,'active',0,'ARS',?,NOW())",
    [businessId, addonCode, "Asignado por migración controlada de CalamuchitAr"]
  );
  return true;
}

async function shouldAssignDirectoryAddon(conn, listingId, policy, publisher = null) {
  if (policy === "all") return true;
  if (policy === "web" || policy === "dummy") return hasLegacyWeb(publisher);
  if (policy !== "paid") return false;
  const [rows] = await conn.execute("SELECT COUNT(*) total FROM tags_directory_site_listings WHERE listing_id=? AND is_free=0", [listingId]);
  return Number(rows[0]?.total || 0) > 0;
}

async function applyBusinessPromotion(target, plan, addonPolicy) {

  const stats = {
    created: 0,
    matched: 0,
    alreadyLinked: 0,
    blocked: 0,
    directoryAddons: 0,
    issues: []
  };

  await target.beginTransaction();

  try {

    for (const item of plan) {

      /*
       * ------------------------------------------------------------
       * Registros bloqueados durante la auditoría / armado del plan
       * ------------------------------------------------------------
       *
       * No frenan la migración.
       * Quedan documentados para resolución manual posterior.
       */
      if (item.action === "blocked") {

        stats.blocked++;

        stats.issues.push({
          type: item.reason || "blocked",
          source: item.publisher?.__source || null,
          publisherId: item.publisher?.id || null,
          company: item.publisher?.company_name || null,
          email1: item.publisher?.email1 || null,
          email2: item.publisher?.email2 || null,
          candidateBusinessIds: item.candidateBusinessIds || [],
          requestedBusinessId: item.requestedBusinessId || null
        });

        continue;
      }

      let businessId =
        item.businessId || null;

      /*
       * ------------------------------------------------------------
       * Crear cliente Tags
       * ------------------------------------------------------------
       */
      if (item.action === "create") {

        const v =
          item.values;

        /*
         * Email histórico inválido.
         *
         * No abortamos toda la migración.
         * Dejamos documentado el publisher y continuamos.
         */
        if (!v.email) {

          stats.blocked++;

          stats.issues.push({
            type: "invalid_email",
            source: item.publisher.__source,
            publisherId: item.publisher.id,
            company: item.publisher.company_name,
            email1: item.publisher.email1 || null,
            email2: item.publisher.email2 || null,
            emailUsed: null
          });

          continue;
        }

        try {

          const [result] =
            await target.execute(
              `
              INSERT INTO tags_businesses
              (
                name,
                display_name,
                email,
                phone,
                description,
                logo_url,
                whatsapp,
                address,
                website_url,
                instagram_url,
                facebook_url,
                subscription_status,
                role,
                created_at,
                updated_at
              )
              VALUES
              (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                'active',
                'client',
                NOW(),
                NOW()
              )
              `,
              [
                v.name,
                v.displayName,
                v.email,
                v.phone,
                v.description,
                v.logoUrl,
                v.whatsapp,
                v.address,
                v.websiteUrl,
                v.instagramUrl,
                v.facebookUrl
              ]
            );

          businessId =
            Number(result.insertId);

          stats.created++;

        } catch (error) {

          /*
           * --------------------------------------------------------
           * Email duplicado
           * --------------------------------------------------------
           *
           * El primer registro que logró insertarse queda como válido.
           *
           * Los posteriores con el mismo email NO se vinculan
           * automáticamente al primero porque podrían representar
           * negocios diferentes.
           *
           * Se documentan y la migración continúa.
           */
          if (
            error?.code === "ER_DUP_ENTRY" ||
            error?.errno === 1062
          ) {

            stats.blocked++;

            stats.issues.push({
              type: "duplicate_email",
              source: item.publisher.__source,
              publisherId: item.publisher.id,
              company: item.publisher.company_name,
              email1: item.publisher.email1 || null,
              email2: item.publisher.email2 || null,
              emailUsed: v.email,
              databaseError: error.message
            });

            continue;
          }

          /*
           * Cualquier otro error de base NO se ignora.
           *
           * Si ocurre un error estructural, SQL, tabla inexistente,
           * columna incorrecta, conexión, etc., abortamos y hacemos
           * rollback porque ya no estamos ante un problema normal
           * de calidad del dato histórico.
           */
          throw error;
        }

      } else if (item.action === "linked") {

        stats.alreadyLinked++;

      } else {

        stats.matched++;
      }

      /*
       * ------------------------------------------------------------
       * Vincular ficha Directory con business
       * ------------------------------------------------------------
       *
       * Solo llegamos acá si:
       * - el business fue creado correctamente;
       * - ya estaba vinculado;
       * - o fue asociado correctamente.
       */
      await target.execute(
        `
        UPDATE tags_directory_listings
        SET business_id=?
        WHERE id=?
          AND business_id IS NULL
        `,
        [
          businessId,
          item.listingId
        ]
      );

      /*
       * ------------------------------------------------------------
       * Guardar correspondencia histórica
       * ------------------------------------------------------------
       */
      await saveMapping(
        target,
        item.publisher.__source,
        item.publisher.id,
        item.publisher,
        "tags_businesses",
        businessId
      );

      await target.execute("UPDATE tags_directory_site_listings SET is_free=? WHERE listing_id=?", [Number(item.publisher.dummy) === 1 ? 1 : 0, item.listingId]);

      if (
        item.publisher.__source === "publishers_ac"
      ) {

        await saveMapping(
          target,
          "publishers",
          item.publisher.id,
          item.publisher,
          "tags_businesses",
          businessId
        );
      }

      /*
       * ------------------------------------------------------------
       * Addon Directory
       * ------------------------------------------------------------
       */
      if (
        await shouldAssignDirectoryAddon(
          target,
          item.listingId,
          addonPolicy,
          item.publisher
        )
      ) {

        if (
          await ensureAddon(
            target,
            businessId,
            "directory"
          )
        ) {

          stats.directoryAddons++;
        }
      }
    }

    await target.commit();

    return stats;

  } catch (error) {

    await target.rollback();

    throw error;
  }
}

function legacyWebSectionContent(section) {
  const paragraphs = [section.text2, section.text3, section.text4].map(nullable).filter(Boolean);
  return {
    title: nullable(section.title) || "",
    subtitle: nullable(section.subtitle) || "",
    highlightedText: nullable(section.text1) || "",
    paragraphs,
    images: nullable(section.image_url) ? [{ url: nullable(section.image_url), alt: nullable(section.title) || "" }] : [],
    imageLayout: "grid",
    menuName: nullable(section.menu_name) || nullable(section.title) || "Sección",
    legacySectionId: Number(section.id),
  };
}

async function syncLegacyWebSections(target, pageId, sections) {
  for (const section of sections) {
    const content = legacyWebSectionContent(section);
    const marker = Number(section.id);
    const [existing] = await target.execute(
      `SELECT s.id section_id,b.id block_id
       FROM tags_qr_page_sections s
       INNER JOIN tags_qr_page_blocks b ON b.section_id=s.id AND b.type='web_section'
       WHERE s.page_id=? AND JSON_UNQUOTE(JSON_EXTRACT(s.settings_json,'$.legacySectionId'))=?
       LIMIT 1`, [pageId, String(marker)]
    );
    if (existing.length) {
      await target.execute("UPDATE tags_qr_page_blocks SET content_json=? WHERE id=?", [JSON.stringify(content), existing[0].block_id]);
      continue;
    }
    await target.execute("UPDATE tags_qr_page_sections SET sort_order=sort_order+1 WHERE page_id=? AND sort_order>=2", [pageId]);
    const [sectionResult] = await target.execute(
      "INSERT INTO tags_qr_page_sections (page_id,type,title,sort_order,settings_json,styles_json) VALUES (?,?,?,?,?,JSON_OBJECT())",
      [pageId, "content", content.title || "Sección web", 2, JSON.stringify({ directoryBaseSlot: "legacy-web-section", legacySectionId: marker })]
    );
    await target.execute(
      "INSERT INTO tags_qr_page_blocks (section_id,type,sort_order,content_json,styles_json) VALUES (?, 'web_section', 1, ?, JSON_OBJECT())",
      [sectionResult.insertId, JSON.stringify(content)]
    );
  }
}

async function activateMigratedDirectoryPages(source, target, plan) {
  const stats = { created: 0, existing: 0, skipped: 0, withoutActiveAddon: 0 };
  const sourceTables = await tableNames(source);
  const legacySections = sourceTables.has("web_sections") ? await rows(source, "web_sections") : [];
  const sectionsByOwner = new Map();
  for (const section of legacySections) {
    const owner = normalizedEmail(section.owner);
    if (!owner) continue;
    const list = sectionsByOwner.get(owner) || [];
    list.push(section);
    sectionsByOwner.set(owner, list);
  }
  for (const item of plan) {
    if (item.action === "blocked" || !Number(item.businessId) || !Number(item.listingId)) {
      stats.skipped++;
      continue;
    }
    if (!hasLegacyWeb(item.publisher)) {
      stats.skipped++;
      continue;
    }
    const businessId = Number(item.businessId);
    const publisherSections = sectionsByOwner.get(normalizedEmail(item.publisher.email1)) || [];
    const [existing] = await target.execute("SELECT id FROM tags_qr_pages WHERE business_id=? AND page_type='directory' LIMIT 1", [businessId]);
    if (existing.length) {
      await target.execute("UPDATE tags_directory_listings SET qr_page_id=? WHERE id=? AND business_id=?", [existing[0].id, item.listingId, businessId]);
      await target.execute("UPDATE tags_directory_listings SET status='published',updated_at=NOW() WHERE id=? AND business_id=?", [item.listingId, businessId]);
      await target.execute("UPDATE tags_directory_site_listings SET publication_status='published',published_at=COALESCE(published_at,NOW()) WHERE listing_id=?", [item.listingId]);
      await target.execute("UPDATE tags_directory_site_listings SET is_free=? WHERE listing_id=?", [Number(item.publisher.dummy) === 1 ? 1 : 0, item.listingId]);
      await target.execute("UPDATE tags_qr_pages SET status='published' WHERE id=? AND business_id=? AND page_type='directory'", [existing[0].id, businessId]);
      await target.execute("UPDATE tags_businesses SET qr_page_enabled=1 WHERE id=?", [businessId]);
      if (publisherSections.length) await syncLegacyWebSections(target, Number(existing[0].id), publisherSections);
      stats.existing++;
      continue;
    }
    const [addons] = await target.execute("SELECT id FROM tags_business_addons WHERE business_id=? AND addon_code='directory' AND status='active' LIMIT 1", [businessId]);
    if (!addons.length) {
      stats.withoutActiveAddon++;
      continue;
    }
    const [businessRows] = await target.execute("SELECT * FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
    const business = businessRows[0];
    const [channels] = await target.execute(
      `SELECT sl.slug,s.primary_host,
          EXISTS(SELECT 1 FROM tags_legacy_routes lr WHERE lr.listing_id=sl.listing_id AND lr.site_id=sl.site_id AND lr.is_active=1 AND TRIM(BOTH '/' FROM lr.legacy_path)=sl.slug) historical
       FROM tags_directory_site_listings sl INNER JOIN tags_directory_sites s ON s.id=sl.site_id
       WHERE sl.listing_id=? ORDER BY historical DESC,sl.id LIMIT 1`,
      [item.listingId]
    );
    if (!channels.length) throw new Error(`La ficha ${item.listingId} no tiene un canal asignado`);
    const [listingRows] = await target.execute("SELECT * FROM tags_directory_listings WHERE id=? AND business_id=? LIMIT 1", [item.listingId, businessId]);
    const listing = listingRows[0];
    const [legacyMedia] = await target.execute("SELECT media_type,url,alt_text FROM tags_directory_media WHERE listing_id=? AND is_active=1 ORDER BY FIELD(media_type,'logo','cover','gallery'),sort_order,id LIMIT 10", [item.listingId]);
    const channel = channels[0];
    const publicSlug = slug(channel.slug || business.name);
    const preferredPageSlug = publicSlug;
    const [slugRows] = await target.execute("SELECT id FROM tags_qr_pages WHERE slug=? LIMIT 1", [preferredPageSlug]);
    const pageSlug = slugRows.length ? `directory-${businessId}-${preferredPageSlug}` : preferredPageSlug;
    const publicUrl = String(process.env.NODE_ENV || "development") === "development"
      ? `${String(process.env.NEXT_PUBLIC_BASE_URL_DEV || "http://localhost:3000").replace(/\/$/, "")}/${publicSlug}`
      : `https://${channel.primary_host}/${publicSlug}`;
    const templateBusiness = {
      ...business,
      name: business.display_name || business.name,
      description: business.description || listing.description || listing.short_description || "",
      logo_url: business.logo_url || legacyMedia.find(media => media.media_type === "logo")?.url || null,
      cover_url: business.cover_url || legacyMedia.find(media => media.media_type === "cover")?.url || null,
    };
    const baseTemplate = getDefaultQRPageTemplate(templateBusiness);
    const template = {
      page: {
        ...baseTemplate.page,
        title: templateBusiness.name,
        description: templateBusiness.description,
        logo_url: templateBusiness.logo_url,
        cover_image_url: templateBusiness.cover_url,
        whatsapp: business.whatsapp || business.phone || null,
        email: business.email || null,
        phone: business.phone || null,
        address: business.address || null,
        website_url: business.website_url || null,
        instagram_url: business.instagram_url || null,
        facebook_url: business.facebook_url || null,
      },
      sections: [
        { type: "content", title: "Presentación", sort_order: 1, settings_json: { directoryBaseSlot: "presentation" }, blocks: [{ type: "web_section", sort_order: 1, content_json: { title: templateBusiness.name, subtitle: "", highlightedText: templateBusiness.description, paragraphs: [], images: [], imageLayout: "grid" } }] },
        ...publisherSections.map((section, index) => ({ type: "content", title: nullable(section.title) || "Sección web", sort_order: index + 2, settings_json: { directoryBaseSlot: "legacy-web-section", legacySectionId: Number(section.id) }, blocks: [{ type: "web_section", sort_order: 1, content_json: legacyWebSectionContent(section) }] })),
        { type: "content", title: "Galería", sort_order: publisherSections.length + 2, settings_json: { directoryBaseSlot: "gallery" }, blocks: [{ type: "gallery", sort_order: 1, content_json: { images: legacyMedia.filter(media => ["cover", "gallery"].includes(media.media_type)).slice(0, 8).map(media => ({ url: media.url, alt: media.alt_text || "" })), maxImages: 8 } }] },
        { type: "content", title: "Contacto", sort_order: publisherSections.length + 3, settings_json: { directoryBaseSlot: "contact" }, blocks: [{ type: "contact_info", sort_order: 1, content_json: { showWhatsapp: true, showPhone: true, showEmail: true, showAddress: true } }] },
      ],
    };
    await target.beginTransaction();
    try {
      const qrCode = await uniqueQrCode(target);
      const [qr] = await target.execute(
        "INSERT INTO tags_qr_codes (business_id,code,label,is_active,created_at,value,final_url,status,tracking_enabled,product_id,has_qr_page) VALUES (?,?,?,1,NOW(),?,?,'active',1,40,1)",
        [businessId, qrCode, templateBusiness.name, publicUrl, publicUrl]
      );
      const [page] = await target.execute(
        `INSERT INTO tags_qr_pages
          (business_id,qr_code_id,page_type,schema_type,slug,slug_locked,title,description,status,logo_url,cover_image_url,whatsapp,email,phone,address,website_url,instagram_url,facebook_url,global_styles,header_config,footer_config,seo_title,seo_description,created_at,updated_at)
         VALUES (?,?,'directory','auto',?,1,?,?,'published',?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
        [businessId, qr.insertId, pageSlug, template.page.title, template.page.description, template.page.logo_url, template.page.cover_image_url, template.page.whatsapp, template.page.email, template.page.phone, template.page.address, template.page.website_url, template.page.instagram_url, template.page.facebook_url, JSON.stringify(template.page.global_styles || {}), JSON.stringify(template.page.header_config || {}), JSON.stringify(template.page.footer_config || {}), template.page.title, template.page.description]
      );
      for (const sectionData of template.sections) {
        const [section] = await target.execute("INSERT INTO tags_qr_page_sections (page_id,type,title,sort_order,settings_json,styles_json) VALUES (?,?,?,?,?,JSON_OBJECT())", [page.insertId, sectionData.type, sectionData.title, sectionData.sort_order, JSON.stringify(sectionData.settings_json || {})]);
        for (const block of sectionData.blocks) {
          await target.execute("INSERT INTO tags_qr_page_blocks (section_id,type,sort_order,content_json,styles_json) VALUES (?,?,?,?,JSON_OBJECT())", [section.insertId, block.type, block.sort_order, JSON.stringify(block.content_json || {})]);
        }
      }
      await target.execute("UPDATE tags_directory_listings SET qr_page_id=?,display_name=?,updated_at=NOW() WHERE id=? AND business_id=?", [page.insertId, templateBusiness.name, item.listingId, businessId]);
      await target.execute("UPDATE tags_directory_listings SET status='published',updated_at=NOW() WHERE id=? AND business_id=?", [item.listingId, businessId]);
      await target.execute("UPDATE tags_directory_site_listings SET publication_status='published',published_at=COALESCE(published_at,NOW()) WHERE listing_id=?", [item.listingId]);
      await target.execute("UPDATE tags_directory_site_listings SET is_free=? WHERE listing_id=?", [Number(item.publisher.dummy) === 1 ? 1 : 0, item.listingId]);
      await target.execute("UPDATE tags_businesses SET qr_page_enabled=1 WHERE id=?", [businessId]);
      await target.execute(
        `INSERT INTO tags_qr_addon_usage (qr_code_id,business_id,addon_code,source_table,source_id,status,created_at,updated_at)
         VALUES (?,?,'directory','tags_directory_listings',?,'active',NOW(),NOW())
         ON DUPLICATE KEY UPDATE source_id=VALUES(source_id),status='active',updated_at=NOW()`,
        [qr.insertId, businessId, item.listingId]
      );
      await target.commit();
      stats.created++;
    } catch (error) {
      await target.rollback();
      throw error;
    }
  }
  return stats;
}

async function catalogPlan(source, target, sourceTables, targetTables, resolutions = {}, ownerFilter = new Set(), excludedPublisherIds = new Set(), galleryPublisherIds = new Set(), galleryPublisherEmails = new Set()) {
  const missingTables = [
    ...(!sourceTables.has("subscriptions") ? ["source:subscriptions"] : []),
    ...CATALOG_TABLES.filter(table => !sourceTables.has(table)).map(table => `source:${table}`),
    ...CATALOG_TARGET_TABLES.filter(table => !targetTables.has(table)).map(table => `target:${table}`),
  ];
  if (missingTables.length) return { missingTables, owners: [], blocked: [] };
  const [digitalQrProducts] = await target.execute("SELECT id FROM tags_products WHERE id=40 AND is_digital=1 LIMIT 1");
  if (!digitalQrProducts.length) return { missingTables: ["target:tags_products.id=40 digital"], owners: [], blocked: [] };
  const products = await rows(source, "products");
  const publishers = (await selectedPublishers(source)).map(publisher => ({
    ...publisher,
    __hasLegacyGallery: galleryPublisherIds.has(Number(publisher.id)) || galleryPublisherEmails.has(normalizedEmail(publisher.email1)),
  }));
  const subscriptions = await rows(source, "subscriptions");
  const owners = [...new Set(products.map(item => normalizedEmail(item.owner)).filter(Boolean))]
    .filter(owner => !ownerFilter.size || ownerFilter.has(owner));
  const catalogResolutions = resolutions.catalogs || {};
  const result = { missingTables: [], owners: [], blocked: [], skipped: [] };
  for (const owner of owners) {
    const sourcePublisher = publishers.find(item => normalizedEmail(item.email1) === owner);
    if (!sourcePublisher) {
      result.blocked.push({ owner, reason: "catalog_owner_publisher_not_found" });
      continue;
    }
    if (excludedPublisherIds.has(Number(sourcePublisher.id))) {
      result.skipped.push({ owner, reason: "excluded_publisher", publisherId: sourcePublisher.id, companyName: sourcePublisher.company_name });
      continue;
    }
    const resolution = catalogResolutions[owner];
    if (resolution?.mode === "skip") {
      result.skipped.push({ owner, reason: resolution.reason || "manual_skip" });
      continue;
    }
    const sourcePublisherId = Number(resolution?.sourcePublisherId || sourcePublisher.id);
    const sourceSubscriptionId = Number(resolution?.sourceSubscriptionId || subscriptions.find(item => Number(item.publisher) === sourcePublisherId)?.id || 0);
    const publisherName = normalizedText(sourcePublisher.company_name);
    const isSierrasEnergia = publisherName.includes("sierras") && publisherName.includes("energia") && publisherName.includes("solar");
    if (Number(sourcePublisher.dummy) !== 1 && !hasLegacyWeb(sourcePublisher) && !isSierrasEnergia && resolution?.mode !== "store") {
      result.skipped.push({ owner, reason: "non_dummy_outside_this_migration", publisherId: sourcePublisher.id, companyName: sourcePublisher.company_name });
      continue;
    }
    if (!sourceSubscriptionId) {
      result.blocked.push({ owner, reason: "publisher_without_subscription", sourcePublisherId });
      continue;
    }
    const [sourceSubscriptions] = await source.execute("SELECT id,publisher FROM subscriptions WHERE id=? AND publisher=? LIMIT 1", [sourceSubscriptionId, sourcePublisherId]);
    if (!sourceSubscriptions.length) {
      result.blocked.push({ owner, reason: "subscription_does_not_match_publisher", sourcePublisherId, sourceSubscriptionId });
      continue;
    }
    let businessId = Number(resolution?.businessId || 0);
    if (!businessId) {
      const [businessRows] = await target.execute("SELECT id FROM tags_businesses WHERE LOWER(email)=LOWER(?) ORDER BY id", [owner]);
      if (businessRows.length === 1) businessId = Number(businessRows[0].id);
      else if (businessRows.length > 1) {
        result.blocked.push({ owner, reason: "ambiguous_business_email", candidateBusinessIds: businessRows.map(item => item.id) });
        continue;
      }
    }
    const [businessRows] = await target.execute("SELECT id FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
    if (!businessId) {
      result.blocked.push({ owner, reason: "business_not_found", sourcePublisherId });
      continue;
    }
    if (!businessRows.length) {
      result.blocked.push({ owner, reason: "resolved_business_not_found", businessId });
      continue;
    }
    if (isSierrasEnergia || resolution?.mode === "store") {
      let storeId = Number(resolution?.targetStoreId || 0);
      if (!storeId) {
        const [stores] = await target.execute("SELECT id FROM tags_stores WHERE business_id=? AND app_type='store' ORDER BY id", [businessId]);
        if (stores.length === 1) storeId = Number(stores[0].id);
        else if (stores.length > 1) {
          result.blocked.push({ owner, reason: "multiple_store_destinations_require_resolution", businessId, candidateStoreIds: stores.map(item => item.id) });
          continue;
        }
      }
      const [stores] = await target.execute("SELECT id FROM tags_stores WHERE id=? AND business_id=? AND app_type='store' LIMIT 1", [storeId, businessId]);
      if (!stores.length) {
        result.blocked.push({ owner, reason: "sierras_store_not_found", businessId, targetStoreId: storeId });
        continue;
      }
      result.owners.push({ owner, mode: "store", businessId, sourcePublisherId, sourceSubscriptionId, storeId, productCount: products.filter(item => normalizedEmail(item.owner) === owner).length });
      continue;
    }
    if (!businessId) {
      result.blocked.push({ owner, reason: "business_not_found", sourcePublisherId });
      continue;
    }
    if (resolution?.mode === "directory_catalog" || !resolution) {
      const [pages] = await target.execute(
        `SELECT l.id listing_id,l.qr_page_id page_id
         FROM tags_directory_listings l
         INNER JOIN tags_qr_pages p ON p.id=l.qr_page_id AND p.business_id=l.business_id AND p.page_type='directory'
         WHERE l.business_id=? LIMIT 1`,
        [businessId]
      );
      if (!pages.length) {
        result.blocked.push({ owner, reason: "directory_page_not_activated", businessId });
        continue;
      }
      result.owners.push({ owner, mode: "directory_catalog", businessId, sourcePublisherId, sourceSubscriptionId, pageId: Number(pages[0].page_id), listingId: Number(pages[0].listing_id), productCount: products.filter(item => normalizedEmail(item.owner) === owner).length });
      continue;
    }
    if (resolution?.mode === "store") {
      const storeId = Number(resolution.targetStoreId || 0);
      const [stores] = await target.execute("SELECT id FROM tags_stores WHERE id=? AND business_id=? AND app_type='store' LIMIT 1", [storeId, businessId]);
      if (!stores.length) {
        result.blocked.push({ owner, reason: "resolved_store_not_found", businessId, targetStoreId: storeId });
        continue;
      }
      result.owners.push({ owner, mode: resolution.mode, businessId, sourcePublisherId, sourceSubscriptionId, storeId, productCount: products.filter(item => normalizedEmail(item.owner) === owner).length });
      continue;
    }
    result.blocked.push({ owner, reason: "invalid_destination_mode", mode: resolution.mode });
  }
  return result;
}

async function uniqueSlug(conn, table, column, preferred, suffix) {
  let candidate = slug(preferred);
  let index = 0;
  while (true) {
    const [rows] = await conn.execute(`SELECT id FROM \`${table}\` WHERE \`${column}\`=? LIMIT 1`, [candidate]);
    if (!rows.length) return candidate;
    index++;
    candidate = `${slug(preferred)}-${suffix}${index > 1 ? `-${index}` : ""}`;
  }
}

async function uniqueQrCode(conn) {
  while (true) {
    const code = crypto.randomBytes(6).toString("hex").slice(0, 8).toUpperCase();
    const [rows] = await conn.execute("SELECT id FROM tags_qr_codes WHERE code=? LIMIT 1", [code]);
    if (!rows.length) return code;
  }
}

async function installStoreTemplate(conn, storeId) {
  for (const sectionData of defaultStoreTemplate) {
    const [section] = await conn.execute(
      "INSERT INTO tags_store_sections (store_id,code,title,section_type,is_visible,sort_order,settings_json) VALUES (?,?,?,?,1,?,?)",
      [storeId, sectionData.code || null, sectionData.title || null, sectionData.section_type, Number(sectionData.sort_order || 0), JSON.stringify(sectionData.settings || {})]
    );
    for (const [index, block] of (sectionData.blocks || []).entries()) {
      const definition = storeModuleDefinitions[block.block_type] || {};
      await conn.execute(
        "INSERT INTO tags_store_blocks (section_id,block_type,title,content_json,styles_json,animation_json,is_visible,sort_order) VALUES (?,?,?,?,?,?,1,?)",
        [section.insertId, block.block_type, block.title || null, JSON.stringify(block.content ?? definition.defaultContent ?? {}), JSON.stringify(block.styles ?? definition.defaultStyles ?? {}), JSON.stringify(block.animation ?? definition.defaultAnimation ?? {}), Number(block.sort_order ?? index)]
      );
    }
  }
}

async function legacyAutomaticStoreMigrationDisabled(conn, ownerPlan) {
  throw new Error("La creación o reutilización automática de Store fue deshabilitada. Defina mode=store y targetStoreId explícitamente.");
  /* Código histórico conservado temporalmente como referencia de migración; no existe ningún llamado ejecutable. */
  const mapped = await mappedTarget(conn, "catalog_owner", ownerPlan.owner, "tags_stores");
  if (mapped) return { storeId: mapped, created: false };
  const [existing] = await conn.execute("SELECT id FROM tags_stores WHERE business_id=? AND app_type='store' ORDER BY id", [ownerPlan.businessId]);
  if (existing.length === 1) {
    await saveMapping(conn, "catalog_owner", ownerPlan.owner, ownerPlan, "tags_stores", existing[0].id);
    return { storeId: Number(existing[0].id), created: false };
  }
  if (existing.length > 1) throw new Error(`El cliente ${ownerPlan.businessId} tiene más de una tienda; requiere resolución manual`);

  const [businessRows] = await conn.execute("SELECT * FROM tags_businesses WHERE id=? LIMIT 1", [ownerPlan.businessId]);
  const business = businessRows[0];
  const [listingRows] = await conn.execute(
    "SELECT sl.slug FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id WHERE l.business_id=? ORDER BY sl.id LIMIT 1",
    [ownerPlan.businessId]
  );
  const storeSlug = await uniqueSlug(conn, "tags_qr_pages", "slug", `${listingRows[0]?.slug || business.name}-tienda`, ownerPlan.publisher.id);
  const publicBaseUrl = String(process.env.DIRECTORY_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL_PROD || "http://localhost:3000").replace(/\/$/, "");
  const publicUrl = `${publicBaseUrl}/p/${storeSlug}`;
  const qrCode = await uniqueQrCode(conn);
  const [qr] = await conn.execute(
    "INSERT INTO tags_qr_codes (business_id,code,label,is_active,created_at,value,final_url,status,tracking_enabled,product_id,has_qr_page) VALUES (?,?,?,1,NOW(),?,?,'active',1,40,1)",
    [ownerPlan.businessId, qrCode, `${business.display_name || business.name} · Tienda`, publicUrl, publicUrl]
  );
  const [page] = await conn.execute(
    `INSERT INTO tags_qr_pages
       (business_id,qr_code_id,page_type,schema_type,slug,slug_locked,title,description,status,logo_url,cover_image_url,email,phone,whatsapp,global_styles,header_config,footer_config,seo_title,seo_description,created_at,updated_at)
     VALUES (?,?,'store','store',?,1,?,?,'published',?,?,?,?,?,JSON_OBJECT(),JSON_OBJECT(),JSON_OBJECT(),?,?,NOW(),NOW())`,
    [ownerPlan.businessId, qr.insertId, storeSlug, `${business.display_name || business.name} · Tienda`, business.description || null, business.logo_url || null, business.cover_url || null, business.email || null, business.phone || null, business.whatsapp || business.phone || null, `${business.display_name || business.name} | Tienda`, business.description || `Catálogo de ${business.display_name || business.name}`]
  );
  const [store] = await conn.execute(
    `INSERT INTO tags_stores
       (business_id,app_type,page_id,slug,name,description,logo_url,cover_url,whatsapp,email,address,currency,status,seo_title,seo_description,settings_json,styles_json,created_at,updated_at)
     VALUES (?,'store',?,?,?,?,?,?,?,?,?,'ARS','published',?,?,?,JSON_OBJECT(),NOW(),NOW())`,
    [ownerPlan.businessId, page.insertId, storeSlug, `${business.display_name || business.name} · Tienda`, business.description || null, business.logo_url || null, business.cover_url || null, business.whatsapp || business.phone || null, business.email || null, business.address || null, `${business.display_name || business.name} | Tienda`, business.description || `Catálogo de ${business.display_name || business.name}`, JSON.stringify({ allowedPaymentMethods: ["whatsapp"], migratedCatalog: true, legacyOwner: ownerPlan.owner })]
  );
  const storeId = Number(store.insertId);
  await conn.execute(
    `INSERT INTO tags_qr_addon_usage
       (qr_code_id,business_id,addon_code,source_table,source_id,status,created_at,updated_at)
     VALUES (?,?,'store','tags_stores',?,'active',NOW(),NOW())
     ON DUPLICATE KEY UPDATE business_id=VALUES(business_id),source_table=VALUES(source_table),source_id=VALUES(source_id),status='active',updated_at=NOW()`,
    [qr.insertId, ownerPlan.businessId, storeId]
  );
  await installStoreTemplate(conn, storeId);
  await saveMapping(conn, "catalog_owner", ownerPlan.owner, ownerPlan, "tags_stores", storeId);
  await saveMapping(conn, "catalog_owner", ownerPlan.owner, ownerPlan, "tags_qr_pages", Number(page.insertId));
  return { storeId, created: true };
}

async function createCategory(conn, sourceTable, item, storeId, parentId = null) {
  const previous = await mappedTarget(conn, sourceTable, item.id, "tags_store_categories");
  if (previous) return previous;
  const categorySlug = await uniqueSlug(conn, "tags_store_categories", "slug", `${slug(item.name)}-${storeId}`, item.id);
  const [result] = await conn.execute(
    "INSERT INTO tags_store_categories (store_id,parent_id,name,slug,sort_order,is_visible) VALUES (?,?,?,?,?,1)",
    [storeId, parentId, nullable(item.name) || `Categoría ${item.id}`, categorySlug, Number(item.id)]
  );
  await saveMapping(conn, sourceTable, item.id, item, "tags_store_categories", Number(result.insertId));
  return Number(result.insertId);
}

function productDescription(product) {
  return [product.description, product.description2, product.description3, product.promotion_description]
    .map(nullable).filter(Boolean).join("\n\n") || null;
}

async function migrateProductOptions(conn, product, productId, sizes, colors) {
  const groups = [
    { name: "Tamaño", values: sizes.filter(item => Number(item.product_id) === Number(product.id)), field: "size" },
    { name: "Color", values: colors.filter(item => Number(item.product_id) === Number(product.id)), field: "color" },
  ].filter(group => group.values.length);
  if (!groups.length) return 0;
  const optionGroups = [];
  for (const [groupIndex, group] of groups.entries()) {
    const [option] = await conn.execute("INSERT INTO tags_store_options (product_id,name,sort_order) VALUES (?,?,?)", [productId, group.name, groupIndex]);
    const values = [];
    for (const [valueIndex, legacy] of group.values.entries()) {
      const [value] = await conn.execute("INSERT INTO tags_store_option_values (option_id,value,sort_order) VALUES (?,?,?)", [option.insertId, nullable(legacy[group.field]) || `Opción ${legacy.id}`, valueIndex]);
      values.push({ optionId: Number(option.insertId), valueId: Number(value.insertId), label: legacy[group.field], imageUrl: nullable(legacy.image_url) });
    }
    optionGroups.push(values);
  }
  const combinations = optionGroups.reduce((all, group) => all.flatMap(existing => group.map(value => [...existing, value])), [[]]);
  const price = Number(product.price || 0);
  const discount = Math.max(0, Math.min(100, Number(product.discount || 0)));
  const salePrice = discount > 0 ? Number((price * (1 - discount / 100)).toFixed(2)) : null;
  for (const combination of combinations) {
    const title = combination.map(item => item.label).join(" / ");
    const [variant] = await conn.execute(
      "INSERT INTO tags_store_variants (product_id,sku,title,price,sale_price,stock_qty,image_url,is_visible) VALUES (?,?,?,?,?,0,?,1)",
      [productId, nullable(product.code) ? `${product.code}-${slug(title)}`.slice(0, 120) : null, title, price, salePrice, combination.find(item => item.imageUrl)?.imageUrl || null]
    );
    for (const value of combination) {
      await conn.execute("INSERT INTO tags_store_variant_values (variant_id,option_id,option_value_id) VALUES (?,?,?)", [variant.insertId, value.optionId, value.valueId]);
    }
  }
  return combinations.length;
}

async function resolvedCatalogStore(conn, ownerPlan) {
  if (ownerPlan.mode !== "store" || !Number(ownerPlan.storeId)) {
    throw new Error(`El catálogo ${ownerPlan.owner} no tiene una tienda destino explícita`);
  }
  await saveMapping(conn, "catalog_owner", ownerPlan.owner, ownerPlan, "tags_stores", ownerPlan.storeId);
  return { storeId: Number(ownerPlan.storeId), created: false };
}

function legacyProductCategory(product, categories, subcategories) {
  const subcategory = subcategories.find(item => Number(item.id) === Number(product.subcategory));
  if (nullable(subcategory?.name)) return nullable(subcategory.name);
  const category = categories.find(item => Number(item.id) === Number(product.category));
  return nullable(category?.name) || "Productos";
}

async function ensureDirectoryCatalogBlock(conn, ownerPlan) {
  const mapped = await mappedTarget(conn, "catalog_owner", ownerPlan.owner, "tags_qr_page_sections");
  if (mapped) {
    const [rows] = await conn.execute("SELECT id FROM tags_qr_page_sections WHERE id=? AND page_id=? LIMIT 1", [mapped, ownerPlan.pageId]);
    if (rows.length) return Number(mapped);
  }
  const [existing] = await conn.execute(
    `SELECT s.id FROM tags_qr_page_sections s
     INNER JOIN tags_qr_page_blocks b ON b.section_id=s.id AND b.type='catalog'
     WHERE s.page_id=? ORDER BY s.sort_order,s.id LIMIT 1`,
    [ownerPlan.pageId]
  );
  if (existing.length) {
    await saveMapping(conn, "catalog_owner", ownerPlan.owner, ownerPlan, "tags_qr_page_sections", Number(existing[0].id));
    return Number(existing[0].id);
  }
  const [orders] = await conn.execute("SELECT COALESCE(MAX(sort_order),0)+1 next_order FROM tags_qr_page_sections WHERE page_id=?", [ownerPlan.pageId]);
  const [section] = await conn.execute(
    "INSERT INTO tags_qr_page_sections (page_id,type,title,sort_order,settings_json,styles_json) VALUES (?,'catalog','Catálogo',?,JSON_OBJECT(),JSON_OBJECT())",
    [ownerPlan.pageId, Number(orders[0]?.next_order || 1)]
  );
  await conn.execute(
    "INSERT INTO tags_qr_page_blocks (section_id,type,sort_order,content_json,styles_json) VALUES (?,'catalog',1,?,JSON_OBJECT())",
    [section.insertId, JSON.stringify({ category: "all" })]
  );
  await saveMapping(conn, "catalog_owner", ownerPlan.owner, ownerPlan, "tags_qr_page_sections", Number(section.insertId));
  return Number(section.insertId);
}

async function migrateDirectoryCatalog(conn, ownerPlan, sourceData, stats) {
  await ensureDirectoryCatalogBlock(conn, ownerPlan);
  const ownerProducts = sourceData.products.filter(item => normalizedEmail(item.owner) === ownerPlan.owner);
  const [orders] = await conn.execute("SELECT COALESCE(MAX(sort_order),0) max_order FROM tags_qr_page_products WHERE page_id=?", [ownerPlan.pageId]);
  let sortOrder = Number(orders[0]?.max_order || 0);
  for (const product of ownerProducts) {
    if (await mappedTarget(conn, "products", product.id, "tags_qr_page_products")) continue;
    const productImages = [
      ...(nullable(product.image_url) ? [{ url: nullable(product.image_url), alt: nullable(product.title) || "" }] : []),
      ...sourceData.images
        .filter(item => Number(item.product_id) === Number(product.id) && nullable(item.image_url))
        .map(item => ({ url: nullable(item.image_url), alt: nullable(product.title) || "" }))
    ].filter((image, index, all) => all.findIndex(candidate => candidate.url === image.url) === index).slice(0, 12);
    const price = Number(product.price || 0);
    const discount = Math.max(0, Math.min(100, Number(product.discount || 0)));
    const salePrice = discount > 0 ? Number((price * (1 - discount / 100)).toFixed(2)) : price;
    const [result] = await conn.execute(
      `INSERT INTO tags_qr_page_products
         (page_id,category,title,description,price,old_price,discount_label,currency,image_url,images_json,button_label,button_url,whatsapp_text,sort_order,is_visible,seo_title,seo_description)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
      [ownerPlan.pageId, legacyProductCategory(product, sourceData.categories, sourceData.subcategories), nullable(product.title) || `Producto ${product.id}`, productDescription(product), salePrice || null, discount > 0 ? price : null, discount > 0 ? `${discount}% OFF` : null, "ARS", productImages[0]?.url || null, JSON.stringify(productImages), "Consultar", null, `Hola, quiero consultar por ${nullable(product.title) || `Producto ${product.id}`}`, ++sortOrder, nullable(product.title), nullable(product.description)]
    );
    await saveMapping(conn, "products", product.id, product, "tags_qr_page_products", Number(result.insertId));
    stats.directoryProducts++;
    stats.images += productImages.length;
  }
  await saveMapping(conn, "catalog_owner", ownerPlan.owner, ownerPlan, "tags_qr_pages", ownerPlan.pageId);
}

async function applyCatalogs(source, target, plan) {
  const [products, categories, subcategories, images, sizes, colors] = await Promise.all(CATALOG_TABLES.map(table => rows(source, table)));
  const stats = { storesCreated: 0, storesReused: 0, categories: 0, products: 0, directoryProducts: 0, images: 0, variants: 0, blockedOwners: plan.blocked.length };
  await target.beginTransaction();
  try {
    for (const ownerPlan of plan.owners) {
      if (ownerPlan.mode === "directory_catalog") {
        await migrateDirectoryCatalog(target, ownerPlan, { categories, subcategories, products, images, sizes, colors }, stats);
        continue;
      }
      const store = await resolvedCatalogStore(target, ownerPlan);
      if (store.created) stats.storesCreated++; else stats.storesReused++;
      const ownerCategories = categories.filter(item => normalizedEmail(item.owner) === ownerPlan.owner);
      const ownerSubcategories = subcategories.filter(item => normalizedEmail(item.owner) === ownerPlan.owner);
      for (const category of ownerCategories) {
        if (!await mappedTarget(target, "product_category", category.id, "tags_store_categories")) stats.categories++;
        await createCategory(target, "product_category", category, store.storeId);
      }
      for (const subcategory of ownerSubcategories) {
        const parentId = await mappedTarget(target, "product_category", subcategory.category_id, "tags_store_categories");
        if (!parentId) throw new Error(`Subcategoría histórica ${subcategory.id} sin categoría migrada`);
        if (!await mappedTarget(target, "product_subcategory", subcategory.id, "tags_store_categories")) stats.categories++;
        await createCategory(target, "product_subcategory", subcategory, store.storeId, parentId);
      }
      for (const product of products.filter(item => normalizedEmail(item.owner) === ownerPlan.owner)) {
        if (await mappedTarget(target, "products", product.id, "tags_store_products")) continue;
        const subcategoryId = product.subcategory ? await mappedTarget(target, "product_subcategory", product.subcategory, "tags_store_categories") : null;
        const categoryId = subcategoryId || (product.category ? await mappedTarget(target, "product_category", product.category, "tags_store_categories") : null);
        const productSlug = await uniqueSlug(target, "tags_store_products", "slug", product.title || product.code || `producto-${product.id}`, product.id);
        const price = Number(product.price || 0);
        const discount = Math.max(0, Math.min(100, Number(product.discount || 0)));
        const salePrice = discount > 0 ? Number((price * (1 - discount / 100)).toFixed(2)) : null;
        const hasOptions = sizes.some(item => Number(item.product_id) === Number(product.id)) || colors.some(item => Number(item.product_id) === Number(product.id));
        const [result] = await target.execute(
          `INSERT INTO tags_store_products
             (store_id,category_id,sku,slug,title,description,price,sale_price,currency,stock_enabled,stock_qty,requires_shipping,requires_preparation,is_visible,status,settings_json,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,'ARS',?,?,?,0,?,?,?,NOW(),NOW())`,
          [store.storeId, categoryId, nullable(product.code), productSlug, nullable(product.title) || `Producto ${product.id}`, productDescription(product), price, salePrice, hasOptions ? 0 : (Number(product.stock) >= 0 ? 1 : 0), Math.max(0, Number(product.stock || 0)), nullable(product.envio) ? 1 : 0, Number(product.activo) === 1 ? 1 : 0, Number(product.activo) === 1 ? "published" : "disabled", JSON.stringify({ legacyProductId: product.id, legacyStock: product.stock, legacyDiscount: product.discount })]
        );
        const productId = Number(result.insertId);
        await saveMapping(target, "products", product.id, product, "tags_store_products", productId);
        stats.products++;
        const productImages = [
          ...(nullable(product.image_url) ? [{ id: `primary-${product.id}`, image_url: product.image_url, primary: true }] : []),
          ...images.filter(item => Number(item.product_id) === Number(product.id)).map(item => ({ ...item, primary: false })),
        ];
        for (const [index, image] of productImages.entries()) {
          const [imageResult] = await target.execute(
            "INSERT INTO tags_store_product_images (product_id,image_url,sort_order,is_primary) VALUES (?,?,?,?)",
            [productId, image.image_url, index, image.primary ? 1 : 0]
          );
          await saveMapping(target, image.primary ? "products_primary_image" : "product_images", image.id, image, "tags_store_product_images", Number(imageResult.insertId));
          stats.images++;
        }
        stats.variants += await migrateProductOptions(target, product, productId, sizes, colors);
      }
    }
    await target.commit();
    return stats;
  } catch (error) {
    await target.rollback();
    throw error;
  }
}

function summarizeBusinessPlan(plan) {
  return {
    total: plan.length,
    create: plan.filter(item => item.action === "create").length,
    match: plan.filter(item => item.action === "match").length,
    linked: plan.filter(item => item.action === "linked").length,
    blocked: plan.filter(item => item.action === "blocked").map(item => ({ publisherId: item.publisher.id, source: item.publisher.__source, name: item.publisher.company_name, reason: item.reason, candidateBusinessIds: item.candidateBusinessIds || [] })),
  };
}

async function writeReport(report) {
  const reportPath = argument("--report");
  if (!reportPath) return;
  const resolved = path.resolve(reportPath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function readResolutions() {
  const resolutionPath = argument("--resolutions");
  if (!resolutionPath) return {};
  const source = await fs.readFile(path.resolve(resolutionPath), "utf8");
  const parsed = JSON.parse(source);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("El archivo de resoluciones debe contener un objeto JSON");
  return parsed;
}

async function main() {
  const applyBusinesses = process.argv.includes("--apply-businesses");
  const applyCatalogsFlag = process.argv.includes("--apply-catalogs");
  const activateDirectoryPages = process.argv.includes("--activate-directory-pages");
  const allPublishers = process.argv.includes("--all-publishers");
  const addonPolicy = argument("--directory-addon", "none");
  const publisherIds = csvSet("--publisher-ids", value => Number(value));
  const excludedPublisherIds = csvSet("--exclude-publisher-ids", value => Number(value));
  const catalogOwners = csvSet("--catalog-owners", normalizedEmail);
  if (!["none", "paid", "all", "web", "dummy"].includes(addonPolicy)) throw new Error("--directory-addon debe ser none, paid, all o web");
  const sourceConfig = config("DIRECTORY_SOURCE");
  const targetConfig = config("DIRECTORY_TARGET");

  console.log({
    confirm: process.env.DIRECTORY_MIGRATION_CONFIRM,
    target: process.env.DIRECTORY_TARGET_DB_NAME,
    database: targetConfig.database
  });

  /* if ((applyBusinesses || applyCatalogsFlag || activateDirectoryPages) && process.env.DIRECTORY_MIGRATION_CONFIRM !== targetConfig.database) { */
  if (
    (applyBusinesses || applyCatalogsFlag || activateDirectoryPages) &&
    (
      process.env.DIRECTORY_MIGRATION_CONFIRM ||
      process.env.DIRECTORY_TARGET_DB_NAME
    ) !== targetConfig.database
  ) {
    throw new Error("Para escribir, DIRECTORY_MIGRATION_CONFIRM debe coincidir exactamente con DIRECTORY_TARGET_DB_NAME");
  }
  const source = await mysql.createConnection(sourceConfig);
  const target = await mysql.createConnection(targetConfig);
  try {
    const resolutions = await readResolutions();
    const [sourceTables, targetTables] = await Promise.all([tableNames(source), tableNames(target)]);
    const requiredSource = ["publishers", "publishers_ac"];
    const requiredTarget = ["tags_businesses", "tags_directory_listings", "tags_directory_site_listings", "tags_legacy_entity_map"];
    const missingRequired = [...requiredSource.filter(item => !sourceTables.has(item)), ...requiredTarget.filter(item => !targetTables.has(item))];
    if (missingRequired.length) throw new Error(`Faltan tablas requeridas: ${missingRequired.join(", ")}`);

    const galleryOwners = await legacyGalleryOwners(source, sourceTables);
    const galleryPublisherIds = galleryOwners.ids;
    const galleryPublisherEmails = galleryOwners.emails;
    const businessPlan = await businessPromotionPlan(source, target, resolutions, publisherIds, { allPublishers, excludedPublisherIds, galleryPublisherIds, galleryPublisherEmails });
    const businessApplied = applyBusinesses ? await applyBusinessPromotion(target, businessPlan, addonPolicy) : null;
    const refreshedBusinessPlan = applyBusinesses ? await businessPromotionPlan(source, target, resolutions, publisherIds, { allPublishers, excludedPublisherIds, galleryPublisherIds, galleryPublisherEmails }) : businessPlan;
    const directoryPagesApplied = activateDirectoryPages ? await activateMigratedDirectoryPages(source, target, refreshedBusinessPlan) : null;
    const catalogs = await catalogPlan(source, target, sourceTables, targetTables, resolutions, catalogOwners, excludedPublisherIds, galleryPublisherIds, galleryPublisherEmails);
    if (applyCatalogsFlag && catalogs.missingTables.length) throw new Error(`Faltan tablas de catálogo: ${catalogs.missingTables.join(", ")}`);
    if (applyCatalogsFlag && catalogs.blocked.length) throw new Error("Hay propietarios de catálogo sin resolver. Ejecute primero la auditoría y la promoción de clientes");
    const catalogsApplied = applyCatalogsFlag ? await applyCatalogs(source, target, catalogs) : null;
    const report = {
      mode: applyCatalogsFlag ? "apply-catalogs" : applyBusinesses ? "apply-businesses" : "audit-only",
      generatedAt: new Date().toISOString(),
      sourceDatabase: sourceConfig.database,
      targetDatabase: targetConfig.database,
      allPublishers,
      directoryAddonPolicy: addonPolicy,
      publisherIds: [...publisherIds],
      excludedPublisherIds: [...excludedPublisherIds],
      galleryPublisherIds: [...galleryPublisherIds],
      galleryPublisherEmails: [...galleryPublisherEmails],
      catalogOwners: [...catalogOwners],
      manualResolutions: Object.keys(resolutions).length,
      businesses: summarizeBusinessPlan(refreshedBusinessPlan),
      businessApplied,
      directoryPagesApplied,
      catalogs: { missingTables: catalogs.missingTables, owners: catalogs.owners.map(item => ({ owner: item.owner, mode: item.mode, businessId: item.businessId, pageId: item.pageId || null, storeId: item.storeId || null, productCount: item.productCount })), blocked: catalogs.blocked, skipped: catalogs.skipped },
      catalogsApplied,
      emailsSent: 0,
    };
    await writeReport(report);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
}

main().catch(error => {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
});
