// Compatibilidad exclusiva con el motor v1 durante la transición.
// El motor v2 no importa este archivo: resuelve rubros desde la taxonomía del canal.
export function normalizeDestinationText(value) {
  return String(value || "").toLocaleLowerCase("es-AR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

const POLICY_DEFINITIONS = [
  {
    domain: "pizzeria",
    query: /\b(pizza|pizzas|pizzeria|pizzerias)\b/,
    profiles: ["pizzeria", "restaurant"],
    matchMode: "offering",
    retrieval: ["pizza", "pizzeria", "restaurante"],
  },
  {
    domain: "cafe",
    query: /\b(merendar|merienda|cafeteria|cafe|te|chocolateria|pasteleria)\b/,
    profiles: ["cafe", "restaurant"],
    matchMode: "category",
    retrieval: ["cafeteria", "cafe", "chocolateria", "restaurante", "gastronomia"],
  },
  {
    domain: "restaurant",
    query: /\b(comer|almorzar|almuerzo|cenar|cena|restaurant|restaurante|restoran|parrilla|gastronomia)\b/,
    profiles: ["restaurant", "pizzeria"],
    matchMode: "category",
    retrieval: ["restaurante", "restoranes", "gastronomia", "parrilla", "comidas"],
  },
  {
    domain: "lodging",
    query: /\b(alojar|alojamiento|alojamientos|dormir|hospedaje|hotel|hoteles|cabanas|cabana|hosteria|hosterias|posada|posadas|camping|campings)\b/,
    profiles: ["lodging"],
    matchMode: "category",
    retrieval: ["alojamiento", "alojamientos", "cabanas", "hoteles", "hosterias", "posadas", "campings"],
  },
  {
    domain: "brewery",
    query: /\b(cerveza|cervezas|cerveceria|cervecerias|birra|birras)\b/,
    profiles: ["brewery"],
    matchMode: "offering",
    retrieval: ["cerveza", "cerveceria", "cervecerias", "birra", "fabricas de cervezas"],
  },
  {
    domain: "recreation",
    query: /\b(ninos|ninas|chicos|familia|divertir|diversion|parque|parques|recreacion|paseo|paseos|actividad|actividades)\b/,
    profiles: ["recreation", "attraction", "excursion"],
    matchMode: "category",
    retrieval: ["actividades de recreacion", "parques recreativos", "paseos", "excursiones"],
  },
];

function unique(values) {
  return [...new Set(values.map(normalizeDestinationText).filter(Boolean))];
}

export function inferDestinationSearchPolicy({ query, searchIntent = "", mode = "unselected" } = {}) {
  const normalizedQuery = normalizeDestinationText(query);
  const definition = POLICY_DEFINITIONS.find(item => item.query.test(normalizedQuery));
  const categoryIntent = ["find_business", "find_place", "general_destination"].includes(searchIntent);
  return {
    domain: definition?.domain || "",
    allowedProfiles: definition?.profiles || [],
    matchMode: definition?.matchMode || (categoryIntent ? "category" : "offering"),
    retrievalTerms: unique([normalizedQuery, ...(definition?.retrieval || [])]),
    mode: ["tourist", "resident"].includes(mode) ? mode : "unselected",
  };
}

function includesAny(value, patterns) {
  return patterns.some(pattern => pattern.test(value));
}

export function inferProviderProfiles(row) {
  const attributes = (() => {
    if (!row?.attributes_json) return {};
    if (typeof row.attributes_json === "object" && !Buffer.isBuffer(row.attributes_json)) return row.attributes_json;
    try { return JSON.parse(Buffer.isBuffer(row.attributes_json) ? row.attributes_json.toString("utf8") : String(row.attributes_json)); } catch { return {}; }
  })();
  const stored = Array.isArray(attributes.providerProfiles) ? attributes.providerProfiles.map(normalizeDestinationText).filter(Boolean) : [];
  if (stored.length) return [...new Set(stored)];

  const businessName = normalizeDestinationText(row?.business_name || (row?.entity_type === "business" ? row?.title : ""));
  const categories = normalizeDestinationText(`${row?.listing_categories || ""} ${row?.listing_primary_categories || ""} ${attributes.categories || ""}`);
  const primaryCategories = normalizeDestinationText(`${row?.listing_primary_categories || ""} ${attributes.primaryCategories || ""}`);
  const summary = normalizeDestinationText(row?.entity_type === "business" ? row?.summary : "");
  const profiles = new Set();

  const lodgingIdentity = includesAny(businessName, [/\bcaban/, /\bhotel/, /\bhosteri/, /\bposada/, /\bcamping/, /\balojamiento/]);
  if (lodgingIdentity) return ["lodging"];

  if (includesAny(businessName, [/\bpizzer/, /\bpizza\b/])) profiles.add("pizzeria");
  if (includesAny(businessName, [/\brestaurant/, /\brestoran/, /\bparrill/, /\bcomedor/, /\bhamburgues/, /\bfood\b/, /\bbar\b/])) profiles.add("restaurant");
  if (includesAny(businessName, [/\bcafe\b/, /\bcafeter/, /\bchocolater/, /\bpasteler/])) profiles.add("cafe");
  if (includesAny(businessName, [/\bcervecer/, /\bbirra\b/, /\bbrew/])) profiles.add("brewery");
  if (includesAny(businessName, [/\bparque\b/, /\baventura\b/, /\brecreativ/, /\bdiversion/])) profiles.add("recreation");

  const identity = `${businessName} ${summary}`;
  if (/\bpizzer/.test(primaryCategories) || (/\bpizzer/.test(categories) && /\b(pizza|pizzeria)\b/.test(identity))) profiles.add("pizzeria");
  if (/\b(restoranes|restaurantes|parrillas|comedores)\b/.test(primaryCategories) || (/\b(restoranes|restaurantes|parrillas|comedores)\b/.test(categories) && includesAny(identity, [/restaur/, /restoran/, /parrill/, /comedor/, /hamburgues/, /gastronomi/, /comida/, /\bfood\b/, /\bbar\b/]))) profiles.add("restaurant");
  if (/\b(cafeterias|chocolaterias|pastelerias)\b/.test(primaryCategories) || (/\b(cafeterias|chocolaterias|pastelerias)\b/.test(categories) && includesAny(identity, [/\bcafe\b/, /cafeter/, /chocolat/, /pasteler/, /merienda/]))) profiles.add("cafe");
  if (/\b(cervecerias|fabricas de cervezas)\b/.test(primaryCategories) || (/\b(cervecerias|fabricas de cervezas)\b/.test(categories) && includesAny(identity, [/cerveza/, /cervecer/, /\bbirra\b/, /\bbrew/]))) profiles.add("brewery");
  if (/\b(parques recreativos|actividades de recreacion|excursiones|paseos)\b/.test(primaryCategories) || (/\b(parques recreativos|actividades de recreacion|excursiones|paseos)\b/.test(categories) && includesAny(identity, [/\bparque\b/, /recreacion/, /excursion/, /paseo/, /aventura/, /actividad/]))) profiles.add("recreation");
  if (/\b(cabanas|hoteles|hosterias|posadas|campings|alojamientos)\b/.test(primaryCategories) || (/\b(cabanas|hoteles|hosterias|posadas|campings|alojamientos)\b/.test(categories) && includesAny(identity, [/cabana/, /\bhotel/, /hosteri/, /posada/, /camping/, /alojamiento/, /hospedaje/]))) profiles.add("lodging");

  if (!profiles.size && /\b(somos|es un|es una)\s+(restaurant|restoran|pizzeria|cafeteria|cerveceria)\b/.test(summary)) profiles.add("restaurant");
  return [...profiles];
}

export function providerMatchesPolicy(row, policy) {
  if (!policy?.allowedProfiles?.length) return true;
  const profiles = inferProviderProfiles(row);
  return profiles.some(profile => policy.allowedProfiles.includes(profile));
}

export function modeProfileBoost(profiles, mode) {
  if (mode === "tourist") return profiles.some(item => ["lodging", "recreation", "attraction", "excursion", "restaurant", "cafe", "brewery"].includes(item)) ? 4 : 0;
  if (mode === "resident") return profiles.some(item => ["commerce", "service", "health", "professional", "restaurant", "cafe"].includes(item)) ? 4 : 0;
  return 0;
}
