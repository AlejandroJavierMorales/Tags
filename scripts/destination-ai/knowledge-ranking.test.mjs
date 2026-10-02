import test from "node:test";
import assert from "node:assert/strict";
import { rankKnowledgeRows } from "../../app/modules/destination-ai/server/knowledgeRanking.js";
import { inferDestinationSearchPolicy } from "../../app/modules/destination-ai/server/destinationSearchPolicy.js";

function row(id, title, searchableText, locality, extra = {}) {
  return {
    id, listing_id: id, business_id: id, canonical_key: `directory_listing:${id}`, entity_type: "business",
    title, summary: searchableText, searchable_text: searchableText, location_json: JSON.stringify({ locality }),
    actions_json: "{}", attributes_json: "{}", commercial_json: "{}", latitude: extra.latitude ?? null,
    longitude: extra.longitude ?? null, lexical_score: extra.lexical_score ?? 5, quality_score: 100,
    relationship: extra.relationship || "free", is_featured: 0, ...extra
  };
}

test("control remoto excluye menciones no comerciales", () => {
  const rows = [
    row(1, "Riegos Calamuchita", "Automatización de riego con control remoto", "Santa Rosa"),
    row(2, "GM Electrónica", "Venta de electrónica y de todo tipo de controles remotos para TV", "Villa General Belgrano"),
    row(3, "Cell Shop", "Venta de accesorios electrónicos y controles remotos para TV y aire acondicionado", "Santa Rosa")
  ];
  const ranked = rankKnowledgeRows(rows, { query: "control remoto", searchIntent: "find_product" });
  assert.deepEqual(ranked.map(item => item.row.title), ["GM Electrónica", "Cell Shop"]);
});

test("termomagnética no devuelve alojamientos ni servicios ajenos", () => {
  const rows = [
    row(1, "Ingematec", "Venta de materiales eléctricos, cables y llaves termomagnéticas", "Santa Rosa"),
    row(2, "Lopresti Electricidad", "Productos eléctricos: térmicas, termomagnéticas y tableros", "Los Reartes"),
    row(3, "Cabañas del Lago", "Alojamiento protegido con llave termomagnética", "Villa Rumipal"),
    row(4, "Asesoría Legal", "Jubilaciones y pensiones", "Santa Rosa")
  ];
  const ranked = rankKnowledgeRows(rows, { query: "termomagnética", searchIntent: "find_product" });
  assert.deepEqual(ranked.map(item => item.row.title), ["Ingematec", "Lopresti Electricidad"]);
});

test("cables exige evidencia de comercialización", () => {
  const rows = [
    row(1, "Ingematec", "Venta de cables, materiales y herramientas eléctricas", "Santa Rosa"),
    row(2, "Cabañas La TV", "Alojamiento con televisión por cable", "Los Reartes"),
    row(3, "Legale", "Asesoría previsional", "Santa Rosa")
  ];
  const ranked = rankKnowledgeRows(rows, { query: "cables", searchIntent: "find_product" });
  assert.deepEqual(ranked.map(item => item.row.title), ["Ingematec"]);
});

test("una localidad explícita filtra y otra localidad excluye lo ya mostrado", () => {
  const rows = [
    row(1, "Electricidad A", "Venta de cables", "Los Reartes"),
    row(2, "Electricidad B", "Venta de cables", "Santa Rosa"),
    row(3, "Electricidad C", "Venta de cables", "Villa General Belgrano")
  ];
  const specified = rankKnowledgeRows(rows, { query: "cables", searchIntent: "find_product", preferredLocality: "Santa Rosa" });
  assert.deepEqual(specified.map(item => item.row.title), ["Electricidad B"]);
  const other = rankKnowledgeRows(rows, { query: "cables", searchIntent: "find_product", excludedLocalities: ["Los Reartes", "Santa Rosa"] });
  assert.deepEqual(other.map(item => item.row.title), ["Electricidad C"]);
  const unavailable = rankKnowledgeRows(rows, { query: "cables", searchIntent: "find_product", preferredLocality: "Yacanto" });
  assert.deepEqual(unavailable, []);
});

test("entre coincidencias equivalentes ordena primero la más cercana", () => {
  const rows = [
    row(1, "Lejana", "Venta de cables", "Santa Rosa", { latitude: -32.1, longitude: -64.5 }),
    row(2, "Cercana", "Venta de cables", "Los Reartes", { latitude: -32.0, longitude: -64.0 })
  ];
  const ranked = rankKnowledgeRows(rows, { query: "cables", searchIntent: "find_product", userLocation: { latitude: -32.001, longitude: -64.001 } });
  assert.equal(ranked[0].row.title, "Cercana");
});

test("buscar ferreterías no convierte en ferretería a un alojamiento que sólo las menciona como referencia", () => {
  const rows = [
    row(1, "Ferretería Los Reartes", "Ferretería y venta de herramientas", "Los Reartes", { attributes_json: JSON.stringify({ categories: "Ferreterías" }) }),
    row(2, "Materiales Calamuchita", "Ferretería, corralón y venta de materiales", "Los Reartes", { attributes_json: JSON.stringify({ categories: "Ferreterías, Corralones" }) }),
    row(3, "Cabañas Ecos del Valle", "Alojamiento junto a la plaza, cerca de comercios y ferreterías", "Los Reartes", { attributes_json: JSON.stringify({ categories: "Cabañas, Alojamientos" }) })
  ];
  const ranked = rankKnowledgeRows(rows, { query: "ferretería", searchIntent: "find_business", preferredLocality: "Los Reartes" });
  assert.deepEqual(ranked.map(item => item.row.title), ["Ferretería Los Reartes", "Materiales Calamuchita"]);
});

test("buscar un tipo de establecimiento no mezcla comercios que sólo venden el producto ni alojamientos que lo mencionan", () => {
  const rows = [
    row(1, "Da Vinci Pizzería", "Pizzería con salón", "Santa Rosa", { attributes_json: JSON.stringify({ categories: "Pizzerías" }) }),
    row(2, "Pollería Oasis", "Pollería y despensa que también vende pizzas", "Los Reartes", { attributes_json: JSON.stringify({ categories: "Pollerías, Despensas" }) }),
    row(3, "La Juana", "Almacén de comidas con pizzas para llevar", "Los Reartes", { attributes_json: JSON.stringify({ categories: "Almacenes de comidas" }) }),
    row(4, "Cabañas del Valle", "Alojamiento cercano a pizzerías", "Los Reartes", { attributes_json: JSON.stringify({ categories: "Cabañas, Alojamientos" }) })
  ];
  const searchPolicy = inferDestinationSearchPolicy({ query: "pizzería", searchIntent: "find_business", mode: "tourist" });
  const ranked = rankKnowledgeRows(rows, { query: "pizzería", searchIntent: "find_business", searchPolicy });
  assert.deepEqual(ranked.map(item => item.row.title), ["Da Vinci Pizzería"]);
});

test("buscar un paseo infantil no devuelve alojamientos que sólo enumeran atractivos cercanos", () => {
  const rows = [
    row(1, "Parque Aventura", "Parque temático con actividades infantiles", "Villa General Belgrano", { attributes_json: JSON.stringify({ categories: "Parques temáticos, Actividades infantiles" }) }),
    row(2, "Cabañas del Valle", "Cabañas cerca de parque acuático, mini zoo y tirolesa", "Los Reartes", { attributes_json: JSON.stringify({ categories: "Cabañas, Alojamientos" }) })
  ];
  const ranked = rankKnowledgeRows(rows, { query: "parque temático", searchIntent: "find_place" });
  assert.deepEqual(ranked.map(item => item.row.title), ["Parque Aventura"]);
});

test("dónde comer devuelve restaurantes y excluye alojamientos aunque mencionen gastronomía", () => {
  const rows = [
    row(1, "Restaurant Los Pinos", "Comidas y atención en salón", "Villa General Belgrano", { listing_categories: "Gastronomía, restoranes" }),
    row(2, "Varesa Food & Beer", "Bar y restaurante", "Santa Rosa", { listing_categories: "Gastronomía, restoranes" }),
    row(3, "Cabañas Ecos del Valle", "Alojamiento cerca de restaurantes y propuestas gastronómicas", "Los Reartes", { listing_categories: "Turismo, alojamientos, cabañas, Chocolaterías" }),
    row(4, "Estudio Web SyM", "Programación y diseño web", "Los Reartes", { listing_categories: "Gastronomía, restoranes", listing_primary_categories: "Gastronomía" })
  ];
  const searchPolicy = inferDestinationSearchPolicy({ query: "dónde comer", searchIntent: "find_business", mode: "tourist" });
  const ranked = rankKnowledgeRows(rows, { query: "dónde comer", searchIntent: "find_business", searchPolicy });
  assert.deepEqual(ranked.map(item => item.row.title), ["Restaurant Los Pinos", "Varesa Food & Beer"]);
});

test("merendar usa el perfil gastronómico y no una mención incidental de un alojamiento", () => {
  const rows = [
    row(1, "Café del Centro", "Cafetería y pastelería", "Santa Rosa", { listing_categories: "Cafeterías" }),
    row(2, "Restaurant Los Pinos", "Restaurante con cafetería", "Villa General Belgrano", { listing_categories: "restoranes" }),
    row(3, "Cabañas del Valle", "Alojamiento con recomendaciones para merendar cerca", "Los Reartes", { listing_categories: "alojamientos, cabañas" })
  ];
  const searchPolicy = inferDestinationSearchPolicy({ query: "un lugar donde merendar", searchIntent: "find_business", mode: "resident" });
  const ranked = rankKnowledgeRows(rows, { query: "un lugar donde merendar", searchIntent: "find_business", searchPolicy });
  assert.deepEqual(ranked.map(item => item.row.title), ["Café del Centro", "Restaurant Los Pinos"]);
});

test("una vez validado el rubro la ubicación ordena estrictamente de cerca a lejos", () => {
  const rows = [
    row(1, "Restaurante Lejano", "Restaurante con gastronomía regional y amplia variedad", "Santa Rosa", { latitude: -32.15, longitude: -64.55, lexical_score: 50, listing_categories: "restoranes" }),
    row(2, "Restaurante Cercano", "Restaurante", "Los Reartes", { latitude: -32.001, longitude: -64.001, lexical_score: 1, listing_categories: "restoranes" })
  ];
  const searchPolicy = inferDestinationSearchPolicy({ query: "dónde comer", searchIntent: "find_business", mode: "tourist" });
  const ranked = rankKnowledgeRows(rows, { query: "dónde comer", searchIntent: "find_business", userLocation: { latitude: -32, longitude: -64 }, searchPolicy });
  assert.equal(ranked[0].row.title, "Restaurante Cercano");
});

test("turista y residente conservan el rubro explícito solicitado", () => {
  const tourist = inferDestinationSearchPolicy({ query: "alojamiento", searchIntent: "find_business", mode: "tourist" });
  const resident = inferDestinationSearchPolicy({ query: "alojamiento", searchIntent: "find_business", mode: "resident" });
  assert.deepEqual(tourist.allowedProfiles, ["lodging"]);
  assert.deepEqual(resident.allowedProfiles, ["lodging"]);
  assert.equal(tourist.mode, "tourist");
  assert.equal(resident.mode, "resident");
});
