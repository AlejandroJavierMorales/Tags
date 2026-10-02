import { createSimpleWorkbookXlsx } from "../../destination-ai/server/simpleXlsx.js";

export const PRODUCT_IMPORT_TEMPLATE_VERSION = "1.0";
export const PRODUCT_IMPORT_TARGETS = new Set(["catalog", "store", "resto"]);
export const PRODUCT_IMPORT_CHECKED = "☑ Sí";
export const PRODUCT_IMPORT_UNCHECKED = "☐ No";
export const PRODUCT_IMPORT_CURRENCIES = ["ARS", "USD"];
export const PRODUCT_IMPORT_STATUSES = ["Publicado", "Borrador", "Desactivado"];

const CHECKS = [PRODUCT_IMPORT_CHECKED, PRODUCT_IMPORT_UNCHECKED];
const PRODUCT_ROWS = 250;
const CATEGORY_FORMULA = `INDIRECT("'CATEGORÍAS'!$A$2:$A$200")`;

const COMMON_INSTRUCTIONS = [
  ["CÓMO COMPLETAR LA PLANILLA"],
  ["1", "Cada fila de PRODUCTOS corresponde a un producto, servicio o plato."],
  ["2", "No cambies los nombres de las columnas ni agregues columnas nuevas."],
  ["3", "Las columnas con asterisco (*) son obligatorias."],
  ["4", "Código debe ser corto y único. Ejemplos: REM-TV-01 o PIZZA-MUZZA."],
  ["5", "Escribí los importes solamente con números. Ejemplo: 12500,50."],
  ["6", "Las casillas tienen un valor inicial. Elegí ☑ Sí o ☐ No desde la lista."],
  ["7", "En Foto principal escribí el nombre exacto del archivo, por ejemplo pizza-muzza.jpg."],
  ["8", "En Fotos adicionales escribí nombres separados por coma. Se admiten hasta 12 imágenes por producto."],
  ["9", "Entregá las imágenes junto con el Excel. No pegues imágenes dentro de las celdas."],
  ["10", "Las categorías disponibles aparecen en la hoja CATEGORÍAS y se eligen desde PRODUCTOS."],
  ["11", "La plataforma revisará los datos y las imágenes antes de permitir la importación."],
  ["12", "Las imágenes se optimizarán automáticamente al confirmar la importación."],
];

const CONFIG = {
  catalog: {
    label: "Catálogo",
    headers: ["Código *", "Nombre *", "Categoría *", "Descripción", "Precio habitual", "Precio de oferta", "Moneda", "Etiqueta de oferta", "Controlar stock", "Stock disponible", "Foto principal", "Fotos adicionales", "Mensaje para WhatsApp", "Visible", "Título para buscadores", "Descripción para buscadores"],
    widths: [18, 34, 26, 60, 18, 18, 12, 22, 18, 18, 30, 48, 55, 14, 40, 60],
    defaults: { 7: "ARS", 9: PRODUCT_IMPORT_UNCHECKED, 14: PRODUCT_IMPORT_CHECKED },
    validations: [
      { column: 3, formula: CATEGORY_FORMULA, allowBlank: false },
      { column: 7, values: PRODUCT_IMPORT_CURRENCIES, allowBlank: false },
      { column: 9, values: CHECKS, allowBlank: false },
      { column: 14, values: CHECKS, allowBlank: false },
    ],
    instructions: [
      ["CATÁLOGO", "Precio habitual es el valor normal. Si existe una promoción, completá también Precio de oferta."],
      ["CATÁLOGO", "El mensaje para WhatsApp puede personalizar la consulta de cada producto."],
    ],
    example: ["REM-TV-01", "Control remoto universal para TV", "Electrónica", "Compatible con distintas marcas de televisores.", "18500", "15900", "ARS", "Oferta especial", PRODUCT_IMPORT_CHECKED, "8", "control-remoto-frente.jpg", "control-remoto-dorso.jpg, control-remoto-caja.jpg", "Hola, quiero consultar por el control remoto universal.", PRODUCT_IMPORT_CHECKED, "Control remoto universal para TV", "Consultá disponibilidad y precio del control remoto universal."],
  },
  store: {
    label: "Tienda",
    headers: ["Código *", "Nombre *", "Categoría *", "Descripción", "Precio", "Precio de oferta", "Moneda", "Controlar stock", "Stock disponible", "Foto principal", "Fotos adicionales", "Visible", "Destacado", "Oferta", "Recomendado", "Novedad", "Estado", "Título para buscadores", "Descripción para buscadores"],
    widths: [18, 34, 26, 60, 16, 18, 12, 18, 18, 30, 48, 14, 14, 14, 16, 14, 18, 40, 60],
    defaults: { 7: "ARS", 8: PRODUCT_IMPORT_UNCHECKED, 12: PRODUCT_IMPORT_CHECKED, 13: PRODUCT_IMPORT_UNCHECKED, 14: PRODUCT_IMPORT_UNCHECKED, 15: PRODUCT_IMPORT_UNCHECKED, 16: PRODUCT_IMPORT_UNCHECKED, 17: "Publicado" },
    validations: [
      { column: 3, formula: CATEGORY_FORMULA, allowBlank: false },
      { column: 7, values: PRODUCT_IMPORT_CURRENCIES, allowBlank: false },
      { column: 8, values: CHECKS, allowBlank: false },
      ...[12, 13, 14, 15, 16].map(column => ({ column, values: CHECKS, allowBlank: false })),
      { column: 17, values: PRODUCT_IMPORT_STATUSES, allowBlank: false },
    ],
    instructions: [
      ["TIENDA", "Si un producto no tiene variantes, no completes la hoja VARIANTES."],
      ["TIENDA", "Para variantes repetí el Código del producto en cada combinación, por ejemplo Talle M / Color Negro."],
    ],
    example: ["REM-AIRE-01", "Control remoto universal para aire acondicionado", "Controles remotos", "Compatible con múltiples marcas. Incluye instrucciones.", "22500", "19900", "ARS", PRODUCT_IMPORT_CHECKED, "12", "control-aire.jpg", "control-aire-caja.jpg", PRODUCT_IMPORT_CHECKED, PRODUCT_IMPORT_CHECKED, PRODUCT_IMPORT_CHECKED, PRODUCT_IMPORT_CHECKED, PRODUCT_IMPORT_UNCHECKED, "Publicado", "Control remoto universal para aire acondicionado", "Comprá un control remoto universal para aire acondicionado."],
  },
  resto: {
    label: "Carta",
    headers: ["Código *", "Nombre *", "Categoría *", "Descripción", "Precio", "Precio de oferta", "Moneda", "Controlar stock", "Stock disponible", "Foto principal", "Fotos adicionales", "Visible", "Disponible para pedidos", "Requiere preparación", "Destacado", "Oferta", "Recomendado", "Novedad", "Estado", "Título para buscadores", "Descripción para buscadores"],
    widths: [18, 34, 26, 60, 16, 18, 12, 18, 18, 30, 48, 14, 24, 22, 14, 14, 16, 14, 18, 40, 60],
    defaults: { 7: "ARS", 8: PRODUCT_IMPORT_UNCHECKED, 12: PRODUCT_IMPORT_CHECKED, 13: PRODUCT_IMPORT_CHECKED, 14: PRODUCT_IMPORT_CHECKED, 15: PRODUCT_IMPORT_UNCHECKED, 16: PRODUCT_IMPORT_UNCHECKED, 17: PRODUCT_IMPORT_UNCHECKED, 18: PRODUCT_IMPORT_UNCHECKED, 19: "Publicado" },
    validations: [
      { column: 3, formula: CATEGORY_FORMULA, allowBlank: false },
      { column: 7, values: PRODUCT_IMPORT_CURRENCIES, allowBlank: false },
      { column: 8, values: CHECKS, allowBlank: false },
      ...[12, 13, 14, 15, 16, 17, 18].map(column => ({ column, values: CHECKS, allowBlank: false })),
      { column: 19, values: PRODUCT_IMPORT_STATUSES, allowBlank: false },
    ],
    instructions: [
      ["CARTA", "Disponible para pedidos permite mostrar un plato como agotado temporalmente sin ocultarlo."],
      ["CARTA", "Requiere preparación debe marcarse cuando el producto tenga que enviarse a cocina."],
    ],
    example: ["PIZZA-MUZZA", "Pizza de muzzarella", "Pizzas", "Salsa de tomate, muzzarella, aceitunas y orégano.", "14500", "12900", "ARS", PRODUCT_IMPORT_UNCHECKED, "", "pizza-muzzarella.jpg", "pizza-muzzarella-2.jpg", PRODUCT_IMPORT_CHECKED, PRODUCT_IMPORT_CHECKED, PRODUCT_IMPORT_CHECKED, PRODUCT_IMPORT_CHECKED, PRODUCT_IMPORT_CHECKED, PRODUCT_IMPORT_CHECKED, PRODUCT_IMPORT_UNCHECKED, "Publicado", "Pizza de muzzarella", "Pizza preparada en el momento."],
  },
};

const VARIANT_HEADERS = ["Código del producto *", "Nombre de opción 1 *", "Valor de opción 1 *", "Nombre de opción 2", "Valor de opción 2", "Código de variante", "Nombre de variante", "Precio", "Precio de oferta", "Stock", "Foto", "Visible"];
const VARIANT_WIDTHS = [24, 24, 24, 24, 24, 22, 32, 16, 18, 14, 30, 14];

function preparedRows(headers, defaults = {}) {
  return Array.from({ length: PRODUCT_ROWS }, () => headers.map((_, index) => defaults[index + 1] || ""));
}

function cleanCategories(categories) {
  const values = [...new Set((categories || []).map(value => String(value || "").trim()).filter(Boolean))];
  return values.length ? values.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })) : ["General"];
}

export function productImportTargetLabel(targetType) {
  return CONFIG[targetType]?.label || targetType;
}

export function productImportTemplateFilename(targetType, businessName = "prestador") {
  const safe = String(businessName || "prestador").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").toLowerCase();
  const targetName = { catalog: "catalogo", store: "tienda", resto: "carta" }[targetType] || targetType;
  return `plantilla-${targetName}-${safe || "prestador"}.xlsx`;
}

export function buildProductImportWorkbook({ targetType, categories }) {
  const config = CONFIG[targetType];
  if (!config) throw new Error("Aplicativo no válido");
  const categoryRows = cleanCategories(categories);
  const sheets = [
    { name: "PRODUCTOS", rows: [config.headers, ...preparedRows(config.headers, config.defaults)], header: true, freezeHeader: true, widths: config.widths, validations: config.validations },
    { name: "CÓMO COMPLETAR", rows: [...COMMON_INSTRUCTIONS, [], ...config.instructions], title: true, widths: [12, 105] },
    { name: "CATEGORÍAS", rows: [["Categorías disponibles"], ...categoryRows.map(name => [name])], header: true, freezeHeader: true, widths: [70] },
  ];
  if (targetType === "store") {
    sheets.push({ name: "VARIANTES", rows: [VARIANT_HEADERS, ...preparedRows(VARIANT_HEADERS, { 12: PRODUCT_IMPORT_CHECKED })], header: true, freezeHeader: true, widths: VARIANT_WIDTHS, validations: [{ column: 12, values: CHECKS, allowBlank: false }] });
  }
  sheets.push({ name: "EJEMPLO", rows: [config.headers, config.example], header: true, freezeHeader: true, widths: config.widths });
  if (targetType === "store") sheets.push({ name: "EJEMPLO VARIANTES", rows: [VARIANT_HEADERS, ["REM-AIRE-01", "Color", "Blanco", "", "", "REM-AIRE-BLA", "Blanco", "22500", "19900", "7", "control-aire-blanco.jpg", PRODUCT_IMPORT_CHECKED]], header: true, freezeHeader: true, widths: VARIANT_WIDTHS });
  return createSimpleWorkbookXlsx(sheets);
}

export function expectedProductImportHeaders(targetType) {
  return CONFIG[targetType]?.headers || [];
}
