import { db } from "../../../lib/tags-db.js";
import { PRODUCT_IMPORT_TARGETS, productImportTargetLabel } from "./productImportWorkbook.js";

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function uniqueNames(values) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

async function catalogCategories(pageId, connection = db) {
  const [[products], [sections]] = await Promise.all([
    connection.query("SELECT DISTINCT category FROM tags_qr_page_products WHERE page_id=? AND category IS NOT NULL AND TRIM(category)<>'' ORDER BY category", [pageId]),
    connection.query("SELECT settings_json FROM tags_qr_page_sections WHERE page_id=?", [pageId]),
  ]);
  const configured = sections.flatMap(item => {
    const settings = parseJson(item.settings_json, {});
    return Array.isArray(settings.directoryCategories) ? settings.directoryCategories : [];
  });
  return uniqueNames([...configured, ...products.map(item => item.category)]);
}

async function storeCategories(storeId, connection = db) {
  const [rows] = await connection.query("SELECT id,name FROM tags_store_categories WHERE store_id=? ORDER BY sort_order,name", [storeId]);
  return { names: uniqueNames(rows.map(item => item.name)), rows };
}

export async function catalogImportSchemaReady(connection = db) {
  const [rows] = await connection.query(
    "SELECT COUNT(*) total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tags_qr_page_products' AND COLUMN_NAME IN ('sku','stock_enabled','stock_qty')"
  );
  return Number(rows[0]?.total || 0) === 3;
}

export async function resolveProductImportTarget({ businessId, targetType, connection = db }) {
  const normalizedType = String(targetType || "").trim().toLowerCase();
  if (!PRODUCT_IMPORT_TARGETS.has(normalizedType)) throw new Error("Aplicativo no válido");
  const [businesses] = await connection.query("SELECT id,COALESCE(NULLIF(display_name,''),name) name,email FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
  const business = businesses[0];
  if (!business) throw new Error("Prestador no encontrado");

  if (normalizedType === "catalog") {
    const [rows] = await connection.query("SELECT id,title,status,catalog_product_limit FROM tags_qr_pages WHERE business_id=? AND page_type='directory' ORDER BY status='published' DESC,id DESC LIMIT 1", [businessId]);
    const instance = rows[0];
    if (!instance) throw new Error("El prestador no tiene un Catálogo de Directorio disponible");
    const categories = await catalogCategories(instance.id, connection);
    const [[countRows], migrationReady] = await Promise.all([
      connection.query("SELECT COUNT(*) total FROM tags_qr_page_products WHERE page_id=?", [instance.id]),
      catalogImportSchemaReady(connection),
    ]);
    return { business, targetType: normalizedType, label: productImportTargetLabel(normalizedType), instanceId: Number(instance.id), instanceName: instance.title || "Catálogo", categories, categoryRows: [], productCount: Number(countRows[0]?.total || 0), productLimit: Math.max(1, Number(instance.catalog_product_limit || 50)), migrationReady };
  }

  const [rows] = await connection.query("SELECT id,name,status FROM tags_stores WHERE business_id=? AND app_type=? ORDER BY status='published' DESC,id DESC LIMIT 1", [businessId, normalizedType]);
  const instance = rows[0];
  if (!instance) throw new Error(normalizedType === "resto" ? "El prestador no tiene una Carta disponible" : "El prestador no tiene una Tienda disponible");
  const categoryData = await storeCategories(instance.id, connection);
  const [countRows] = await connection.query("SELECT COUNT(*) total FROM tags_store_products WHERE store_id=?", [instance.id]);
  return { business, targetType: normalizedType, label: productImportTargetLabel(normalizedType), instanceId: Number(instance.id), instanceName: instance.name || productImportTargetLabel(normalizedType), categories: categoryData.names, categoryRows: categoryData.rows, productCount: Number(countRows[0]?.total || 0), migrationReady: true };
}

export async function listProductImportTargets(connection = db) {
  const [[businesses], [catalogs], [stores]] = await Promise.all([
    connection.query("SELECT id,COALESCE(NULLIF(display_name,''),name) name,email FROM tags_businesses WHERE COALESCE(role,'client')<>'admin' ORDER BY COALESCE(NULLIF(display_name,''),name),id"),
    connection.query("SELECT p.id,p.business_id,p.title,p.status,(SELECT COUNT(*) FROM tags_qr_page_products product WHERE product.page_id=p.id) product_count FROM tags_qr_pages p WHERE p.page_type='directory' ORDER BY p.status='published' DESC,p.id DESC"),
    connection.query("SELECT s.id,s.business_id,s.app_type,s.name,s.status,(SELECT COUNT(*) FROM tags_store_products product WHERE product.store_id=s.id) product_count FROM tags_stores s WHERE s.app_type IN ('store','resto') ORDER BY s.status='published' DESC,s.id DESC"),
  ]);
  const byBusiness = new Map(businesses.map(item => [Number(item.id), { id: Number(item.id), name: item.name || `Prestador ${item.id}`, email: item.email || "", applications: [] }]));
  const seen = new Set();
  for (const item of catalogs) {
    const business = byBusiness.get(Number(item.business_id));const key = `${item.business_id}:catalog`;if (!business || seen.has(key)) continue;seen.add(key);
    business.applications.push({ type: "catalog", label: "Catálogo", instanceId: Number(item.id), instanceName: item.title || "Catálogo", productCount: Number(item.product_count || 0), status: item.status });
  }
  for (const item of stores) {
    const business = byBusiness.get(Number(item.business_id));const key = `${item.business_id}:${item.app_type}`;if (!business || seen.has(key)) continue;seen.add(key);
    business.applications.push({ type: item.app_type, label: productImportTargetLabel(item.app_type), instanceId: Number(item.id), instanceName: item.name || productImportTargetLabel(item.app_type), productCount: Number(item.product_count || 0), status: item.status });
  }
  return [...byBusiness.values()].filter(item => item.applications.length);
}
