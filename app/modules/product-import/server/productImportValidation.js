import { db } from "../../../lib/tags-db.js";
import { parseSimpleWorkbookXlsx } from "../../destination-ai/server/simpleXlsx.js";
import { expectedProductImportHeaders, PRODUCT_IMPORT_CHECKED, PRODUCT_IMPORT_STATUSES, PRODUCT_IMPORT_UNCHECKED } from "./productImportWorkbook.js";
import { resolveProductImportTarget } from "./productImportTargets.js";
import { normalizePlatformCurrency } from "../../../lib/platformCurrencies.js";

export const PRODUCT_IMPORT_MODES = new Set(["create_only", "create_and_update", "update_only"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

export const cleanImportValue = (value, max = 50000) => String(value ?? "").trim().slice(0, max);
export const normalizeImportValue = value => cleanImportValue(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
export const normalizeProductCode = value => normalizeImportValue(value).replace(/\s+/g, "-");
export const normalizeImageFilename = value => cleanImportValue(value).replace(/\\/g, "/").split("/").pop().toLowerCase();
export function importBoolean(value) { const text = normalizeImportValue(value).replace(/[☑☐]/g, "").trim();if (["si", "sí", "1", "true"].includes(text)) return true;if (["no", "0", "false"].includes(text)) return false;return null; }
export function importDecimal(value) { const text = cleanImportValue(value).replace(/\s/g, "");if (!text) return null;const normalizedValue = text.includes(",") && text.includes(".") ? (text.lastIndexOf(",") > text.lastIndexOf(".") ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "")) : text.replace(",", ".");const number = Number(normalizedValue);return Number.isFinite(number) ? number : Number.NaN; }
export function importInteger(value) { const number = importDecimal(value);return number === null ? null : Number.isInteger(number) ? number : Number.NaN; }
export const splitImportImages = value => cleanImportValue(value).split(/[,;\n]/).map(normalizeImageFilename).filter(Boolean);
export const productRowImages = row => [...new Set([normalizeImageFilename(row["Foto principal"]), ...splitImportImages(row["Fotos adicionales"])].filter(Boolean))];

const findSheet = (book, name) => book.sheets.find(sheet => normalizeImportValue(sheet.name) === normalizeImportValue(name));
// Las plantillas dejan cientos de filas preparadas con listas y valores por defecto.
// Una fila representa un producto únicamente cuando el usuario completa su código.
const meaningfulProduct = row => Boolean(cleanImportValue(row["Código *"]));

function sameHeaders(received, expected) {
  return received.length === expected.length && expected.every((header, index) => received[index] === header);
}

function checkHeaders(sheet, targetType) {
  const expected = expectedProductImportHeaders(targetType);const received = (sheet?.rows?.[0] || []).map(value => cleanImportValue(value));
  if (targetType === "store" && sameHeaders(received, expectedProductImportHeaders("catalog"))) return { valid: true, missing: [], unexpected: [], sourceType: "catalog" };
  const missing = expected.filter(header => !received.includes(header));const unexpected = received.filter(header => header && !expected.includes(header));
  return { valid: missing.length === 0 && unexpected.length === 0, missing, unexpected, sourceType: targetType };
}

function adaptProductSource(source, sourceType, targetType) {
  if (sourceType !== "catalog" || targetType !== "store") return source;
  const salePrice = cleanImportValue(source["Precio de oferta"]);
  return {
    ...source,
    Precio: source["Precio habitual"],
    Destacado: PRODUCT_IMPORT_UNCHECKED,
    Oferta: salePrice ? PRODUCT_IMPORT_CHECKED : PRODUCT_IMPORT_UNCHECKED,
    Recomendado: PRODUCT_IMPORT_UNCHECKED,
    Novedad: PRODUCT_IMPORT_UNCHECKED,
    Estado: "Publicado"
  };
}

async function existingProducts(target, connection = db) {
  if (target.targetType === "catalog") { const sku = target.migrationReady ? "sku" : "NULL sku";const [rows] = await connection.query(`SELECT id,${sku},title,updated_at FROM tags_qr_page_products WHERE page_id=?`, [target.instanceId]);return rows; }
  const [rows] = await connection.query("SELECT id,sku,title,updated_at FROM tags_store_products WHERE store_id=?", [target.instanceId]);return rows;
}

function workbookCategories(book) { const sheet = findSheet(book, "CATEGORÍAS");if (!sheet) return [];return [...new Set((sheet.records || []).map(row => cleanImportValue(row["Categorías disponibles"])).filter(Boolean))]; }

function imageInventory(files) {
  const inventory = new Map();const errors = [];
  for (const file of files) { const name = normalizeImageFilename(file?.name);if (!name) continue;const extension = name.split(".").pop();if (!IMAGE_EXTENSIONS.has(extension)) errors.push(`${file.name}: usá JPG, PNG, WEBP o AVIF`);if (Number(file.size || 0) > 12 * 1024 * 1024) errors.push(`${file.name}: supera el máximo de 12 MB`);if (inventory.has(name)) errors.push(`${file.name}: hay dos imágenes con el mismo nombre`);inventory.set(name, file); }
  return { inventory, errors };
}

function validateProduct({ source, rowNumber, categories, existingByCode, duplicateCodes, images, mode }) {
  const errors = [];const warnings = [];const code = cleanImportValue(source["Código *"], 120);const codeKey = normalizeProductCode(code);const name = cleanImportValue(source["Nombre *"], 255);const category = cleanImportValue(source["Categoría *"], 150);
  if (!code) errors.push("Falta Código");if (!name) errors.push("Falta Nombre");if (!category) errors.push("Falta Categoría");if (codeKey && duplicateCodes.has(codeKey)) errors.push("El Código está repetido en PRODUCTOS");if (category && !categories.has(normalizeImportValue(category))) errors.push("La Categoría no está incluida en la hoja CATEGORÍAS");
  const currency = normalizePlatformCurrency(source.Moneda);if (!currency) errors.push("Moneda no válida. Usá $ para pesos o U$S / USD para dólares");
  const price = importDecimal(source.Precio ?? source["Precio habitual"]);const salePrice = importDecimal(source["Precio de oferta"]);if (Number.isNaN(price) || (price !== null && price < 0)) errors.push("Precio no válido");if (Number.isNaN(salePrice) || (salePrice !== null && salePrice < 0)) errors.push("Precio de oferta no válido");if (price !== null && salePrice !== null && salePrice >= price) warnings.push("El precio de oferta no es menor que el habitual");
  const stockEnabled = importBoolean(source["Controlar stock"]);if (stockEnabled === null) errors.push("Controlar stock debe ser ☑ Sí o ☐ No");const stock = importInteger(source["Stock disponible"]);if (Number.isNaN(stock) || (stock !== null && stock < 0)) errors.push("Stock no válido");if (stockEnabled && stock === null) errors.push("Completá Stock disponible");
  for (const key of ["Visible", "Destacado", "Oferta", "Recomendado", "Novedad", "Disponible para pedidos", "Requiere preparación"]) if (key in source && importBoolean(source[key]) === null) errors.push(`${key} debe ser ☑ Sí o ☐ No`);if ("Estado" in source && !PRODUCT_IMPORT_STATUSES.includes(cleanImportValue(source.Estado))) errors.push("Estado no válido");
  const requestedImages = productRowImages(source);if (requestedImages.length > 12) errors.push("El producto supera el máximo de 12 imágenes");for (const filename of requestedImages) if (!images.has(filename)) warnings.push(`La imagen ${filename} no fue seleccionada; podrás cargarla después`);const availableImages=requestedImages.filter(filename=>images.has(filename));
  const existing = existingByCode.get(codeKey) || null;let action = existing ? "update" : "create";if (mode === "create_only" && existing) { action = "skip";warnings.push("Ya existe: se omitirá en modo Crear solamente nuevos"); }if (mode === "update_only" && !existing) { action = "skip";warnings.push("No existe: se omitirá en modo Actualizar solamente existentes"); }
  return { source, row: rowNumber, code, codeKey, name, category, existingId: existing ? Number(existing.id) : null, action, valid: errors.length === 0, errors, warnings, imageNames: availableImages, imageCount: availableImages.length };
}

function validateVariants({ book, targetType, productCodes, images }) {
  const sheet = findSheet(book, "VARIANTES");if (!sheet) return [];
  const source = sheet.records.filter(row => ["Código del producto *", "Nombre de opción 1 *", "Valor de opción 1 *", "Código de variante", "Foto"].some(key => cleanImportValue(row[key])));
  const variantCodes = source.map(row => normalizeProductCode(row["Código de variante"])).filter(Boolean);const repeated = new Set(variantCodes.filter((code, index) => variantCodes.indexOf(code) !== index));
  return source.map((item, index) => { const errors = [];const warnings=[];const productCodeKey = normalizeProductCode(item["Código del producto *"]);const variantCodeKey = normalizeProductCode(item["Código de variante"]);if (targetType !== "store") errors.push("Las variantes solamente se importan en Tienda");if (!productCodeKey) errors.push("Falta Código del producto");else if (!productCodes.has(productCodeKey)) errors.push("El producto relacionado también debe estar en la hoja PRODUCTOS");if (!cleanImportValue(item["Nombre de opción 1 *"])) errors.push("Falta Nombre de opción 1");if (!cleanImportValue(item["Valor de opción 1 *"])) errors.push("Falta Valor de opción 1");if (!variantCodeKey) errors.push("Falta Código de variante");else if (repeated.has(variantCodeKey)) errors.push("Código de variante repetido");for (const field of ["Precio", "Precio de oferta"]) { const value = importDecimal(item[field]);if (Number.isNaN(value) || (value !== null && value < 0)) errors.push(`${field} no válido`); }const stock = importInteger(item.Stock);if (Number.isNaN(stock) || (stock !== null && stock < 0)) errors.push("Stock no válido");if (importBoolean(item.Visible) === null) errors.push("Visible debe ser ☑ Sí o ☐ No");const requestedImageName = normalizeImageFilename(item.Foto);if (requestedImageName && !images.has(requestedImageName)) warnings.push(`La imagen ${requestedImageName} no fue seleccionada; podrás cargarla después`);const imageName=images.has(requestedImageName)?requestedImageName:"";return { source: item, row: index + 2, productCode: cleanImportValue(item["Código del producto *"]), productCodeKey, variantCode: cleanImportValue(item["Código de variante"]), variantCodeKey, imageName, valid: errors.length === 0, errors, warnings }; });
}

function publicProductRow(item) { const { source, imageNames, ...publicItem } = item;return publicItem; }
function publicVariantRow(item) { const { source, variantCodeKey, imageName, ...publicItem } = item;return publicItem; }

export async function validateProductImport({ buffer, businessId, targetType, overwriteMode = "create_only", imageFiles = [], connection = db }) {
  const mode = PRODUCT_IMPORT_MODES.has(overwriteMode) ? overwriteMode : "create_only";const target = await resolveProductImportTarget({ businessId, targetType, connection });const book = parseSimpleWorkbookXlsx(buffer);const productSheet = findSheet(book, "PRODUCTOS");const globalErrors = [];const globalWarnings = [];
  if (!productSheet) globalErrors.push("El archivo no contiene la hoja PRODUCTOS");const headerReport = checkHeaders(productSheet, target.targetType);if (productSheet && !headerReport.valid) { if (headerReport.missing.length) globalErrors.push(`Faltan columnas: ${headerReport.missing.join(", ")}`);if (headerReport.unexpected.length) globalErrors.push(`No se reconocen estas columnas: ${headerReport.unexpected.join(", ")}`); }if (!target.migrationReady) globalErrors.push("Falta ejecutar la migración de importación de productos para habilitar Código y stock en Catálogo");if(headerReport.sourceType==="catalog"&&target.targetType==="store")globalWarnings.push("Se detectó una plantilla de Catálogo. Se convertirá a Tienda: los productos quedarán publicados, no destacados y con oferta solamente cuando tengan Precio de oferta.");
  const { inventory: images, errors: imageErrors } = imageInventory(imageFiles);globalErrors.push(...imageErrors);const sheetCategories = workbookCategories(book);const availableCategories = [...new Set([...target.categories, ...sheetCategories])];const categorySet = new Set(availableCategories.map(normalizeImportValue));const existing = await existingProducts(target, connection);const existingByCode = new Map(existing.map(item => [normalizeProductCode(item.sku), item]).filter(([code]) => code));
  const sourceRows = headerReport.valid ? productSheet.records.filter(meaningfulProduct).map(source=>adaptProductSource(source,headerReport.sourceType,target.targetType)) : [];const codes = sourceRows.map(row => normalizeProductCode(row["Código *"])).filter(Boolean);const duplicateCodes = new Set(codes.filter((code, index) => codes.indexOf(code) !== index));const products = sourceRows.map((source, index) => validateProduct({ source, rowNumber: index + 2, categories: categorySet, existingByCode, duplicateCodes, images, mode }));const productCodes = new Set(products.map(row => row.codeKey).filter(Boolean));const variants = validateVariants({ book, targetType: target.targetType, productCodes, images });
  const usedImages = new Set(products.flatMap(item => item.imageNames));for (const item of variants) if (item.imageName) usedImages.add(item.imageName);const unusedImages = [...images.keys()].filter(name => !usedImages.has(name));if (unusedImages.length) globalWarnings.push(`${unusedImages.length} imagen(es) seleccionada(s) no están mencionadas en la planilla`);const skippedProductCodes = new Set(products.filter(item => item.action === "skip").map(item => item.codeKey));const skippedVariants = variants.filter(item => skippedProductCodes.has(item.productCodeKey)).length;if (skippedVariants) globalWarnings.push(`${skippedVariants} variante(s) no se importarán porque su producto se omitirá en el modo seleccionado`);if (!sourceRows.length && headerReport.valid) globalErrors.push("La hoja PRODUCTOS no contiene productos cargados");const creates = products.filter(row => row.action === "create" && row.valid).length;const catalogLimit=Math.max(1,Number(target.productLimit||50));if (target.targetType === "catalog" && target.productCount + creates > catalogLimit) globalErrors.push(`El Catálogo superaría el límite asignado de ${catalogLimit} productos (${target.productCount} existentes + ${creates} nuevos)`);
  const report = { target: { businessId: Number(target.business.id), businessName: target.business.name, targetType: target.targetType, targetLabel: target.label, instanceId: target.instanceId, instanceName: target.instanceName, existingProducts: target.productCount, productLimit: target.targetType === "catalog" ? catalogLimit : null }, overwriteMode: mode, globalErrors, globalWarnings, categories: { existing: target.categories, inWorkbook: sheetCategories, new: sheetCategories.filter(name => !target.categories.some(existingName => normalizeImportValue(existingName) === normalizeImportValue(name))) }, images: { selected: images.size, used: usedImages.size, unused: unusedImages }, products: { total: products.length, valid: products.filter(row => row.valid).length, errors: products.filter(row => !row.valid).length, create: products.filter(row => row.valid && row.action === "create").length, update: products.filter(row => row.valid && row.action === "update").length, skip: products.filter(row => row.action === "skip").length, rows: products.map(publicProductRow) }, variants: { total: variants.length, valid: variants.filter(row => row.valid).length, errors: variants.filter(row => !row.valid).length, rows: variants.map(publicVariantRow) } };
  return { valid: globalErrors.length === 0 && report.products.errors === 0 && report.variants.errors === 0, report, target, book, products, variants, images, existingByCode, sheetCategories };
}
