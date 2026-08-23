import { db } from "@/app/lib/tags-db";
import { getDirectoryPublicData } from "./getDirectoryPublicData";

function normalized(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return normalized(value).replace(/\s+/g, "-");
}

function findNode(nodes, predicate) {
  return nodes.find(node => predicate(node)) || null;
}

function mergePages(pages, categories, site, locality, kind) {
  const valid = pages.filter(Boolean);
  if (!valid.length) return null;
  const first = valid[0];
  const listings = [...new Map(valid.flatMap(page => page.listings || []).map(item => [item.id, item])).values()];
  const mapListings = [...new Map(valid.flatMap(page => page.mapListings || []).map(item => [item.id, item])).values()];
  const pagePath = kind === "restaurants" ? "donde-comer-en" : kind === "accommodation" ? "cabanas-en" : "que-regalar-en";
  const titles = { restaurants: "Dónde Comer", accommodation: "Cabañas", gifts: "Qué Regalar" };
  const seo = {
    restaurants: [
      `Uno de los puntos a destacar cuando visites ${locality.name} es su gastronomía. Una importante variedad de alternativas entre las que podrán degustar platos típicos, cabritos, pastas, comida al disco de arado, un buen asado criollo, pizzas y empanadas, comida casera, pescados de la zona como trucha, lomitos, hamburguesas, carlitos y barrolucos, entre otros.`,
      `En un hermoso entorno serrano, ${locality.name} les ofrece tomar una cerveza al atardecer, un aperitivo, un licuado, una rica merienda o un mejor desayuno en alguno de sus bares, paradores o restaurantes y hacer de esta manera que la estadía sea aún más placentera.`,
    ],
    accommodation: [
      `La localidad de ${locality.name} ofrece una gran cantidad de alojamientos con diferentes ofertas y prestaciones que se pueden ajustar a sus gustos, expectativas y presupuesto. Aquí podrá contactar en forma directa y sin intermediarios a cada establecimiento y concretar la reserva de la cabaña para sus próximas vacaciones.`,
      `Las cabañas en ${locality.name} cuentan en general con diversos tipos de equipamiento y confort, pudiendo contratar cabañas para 2, 3, 4 o más pasajeros, con pileta, aire acondicionado, parrilla y cochera cubierta, en cercanías al río, con vista a la montaña y con juegos para niños, entre muchas otras alternativas.`,
      `Contratá el alojamiento en cabaña que más te guste y vení a ${locality.name} a disfrutar de tus próximas vacaciones.`,
    ],
    gifts: [
      `Cuando salimos de vacaciones, a menudo solemos llevarnos un recuerdo o un souvenir, o hacer un regalo a un amigo o familiar. En ${locality.name} vas a encontrar una gran cantidad de comercios, ferias, artesanos y emprendedores que ofrecen artesanías, chocolates, alfajores, vinos, conservas, cervezas artesanales y muchos otros productos regionales.`,
      `En CalamuchitAr vas a encontrar una gran cantidad de prestadores con los que podrás ponerte en contacto o visitar personalmente para conseguir ese hermoso regalo que buscás.`,
    ],
  };
  return {
    ...first,
    site,
    categories,
    listings,
    mapListings,
    selectedLocality: locality,
    localityName: locality.name,
    publicPath: `/${pagePath}/${slugify(locality.slug || locality.name)}`,
    pageTitle: `${titles[kind]} en ${locality.name}`,
    seo: seo[kind] || [],
    pagination: { ...first.pagination, total: listings.length, totalPages: Math.max(1, Math.ceil(listings.length / first.pagination.pageSize)) },
  };
}

export async function getDirectoryLocalityPageData(kind, localitySlug, siteCode = "calamuchitar") {
  const [sites] = await db.execute("SELECT id,code,name,primary_host,brand_config,seo_config FROM tags_directory_sites WHERE code=? AND is_active=1 LIMIT 1", [siteCode]);
  const site = sites[0] || null;
  if (!site) return null;

  const [places] = await db.execute("SELECT id,name,slug FROM tags_geo_places WHERE place_type='locality' AND is_active=1 ORDER BY name");
  const locality = places.find(place => slugify(place.slug || place.name) === slugify(localitySlug));
  if (!locality) return null;

  const [nodes] = await db.execute("SELECT id,parent_id,name,depth,image_url,description,sort_order FROM tags_directory_taxonomy_nodes WHERE is_active=1 ORDER BY depth,sort_order,name");
  const tourism = findNode(nodes, node => Number(node.depth) === 0 && normalized(node.name) === "turismo");
  if (!tourism) return null;

  const category = (names, parentId) => findNode(nodes, node => Number(node.parent_id) === Number(parentId) && names.includes(normalized(node.name)));
  const queryPages = async (categoryIds) => Promise.all(categoryIds.filter(Boolean).map(id => getDirectoryPublicData({ categoria: id, localidad: locality.id, pagina: 1 }, siteCode)));

  if (kind === "accommodation") {
    const accommodation = category(["alojamientos", "alojamiento"], tourism.id);
    return mergePages(await queryPages([accommodation?.id]), accommodation ? [accommodation] : [], site, locality, kind);
  }

  if (kind === "restaurants") {
    const gastronomy = findNode(nodes, node => Number(node.depth) === 0 && normalized(node.name) === "gastronomia")
      || category(["gastronomia", "restaurantes", "restoranes"], tourism.id);
    const restaurants = gastronomy && Number(gastronomy.depth) === 0
      ? category(["restoranes", "restaurantes"], gastronomy.id)
      : gastronomy;
    return mergePages(await queryPages([restaurants?.id]), restaurants ? [restaurants] : [], site, locality, kind);
  }

  if (kind === "gifts") {
    const giftNames = new Set(["regaleria", "regionales", "chocolaterias", "venta de alfajores"]);
    const categories = nodes.filter(node => Number(node.parent_id) === Number(tourism.id) && giftNames.has(normalized(node.name)));
    return mergePages(await queryPages(categories.map(node => node.id)), categories, site, locality, kind);
  }

  return null;
}

export async function getDirectoryLocalitySitemapPaths(siteCode = "calamuchitar") {
  const [sites] = await db.execute("SELECT id FROM tags_directory_sites WHERE code=? AND is_active=1 LIMIT 1", [siteCode]);
  const site = sites[0];
  if (!site) return [];
  const [nodes] = await db.execute("SELECT id,parent_id,name,depth FROM tags_directory_taxonomy_nodes WHERE is_active=1 ORDER BY depth,sort_order,name");
  const tourism = findNode(nodes, node => Number(node.depth) === 0 && normalized(node.name) === "turismo");
  if (!tourism) return [];
  const accommodation = findNode(nodes, node => Number(node.parent_id) === Number(tourism.id) && ["alojamientos", "alojamiento"].includes(normalized(node.name)));
  const gastronomy = findNode(nodes, node => Number(node.depth) === 0 && normalized(node.name) === "gastronomia") || tourism;
  const restaurants = findNode(nodes, node => Number(node.parent_id) === Number(gastronomy.id) && ["restoranes", "restaurantes"].includes(normalized(node.name)));
  const gifts = nodes.filter(node => Number(node.parent_id) === Number(tourism.id) && new Set(["regaleria", "regionales", "chocolaterias", "venta de alfajores"]).has(normalized(node.name)));
  const definitions = [
    ["accommodation", accommodation?.id],
    ["restaurants", restaurants?.id],
    ["gifts", gifts.map(node => node.id)],
  ];
  const result = [];
  for (const [kind, categoryIds] of definitions) {
    const ids = Array.isArray(categoryIds) ? categoryIds.filter(Boolean) : [categoryIds].filter(Boolean);
    if (!ids.length) continue;
    const placeholders = ids.map(() => "?").join(",");
    const [places] = await db.execute(`
      SELECT DISTINCT p.slug,p.name
      FROM tags_geo_places p
      INNER JOIN tags_directory_listing_places lp ON lp.place_id=p.id AND lp.relation_type='location'
      INNER JOIN tags_directory_listings l ON l.id=lp.listing_id AND l.status='published'
      INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.site_id=? AND sl.publication_status='published'
      INNER JOIN tags_directory_listing_taxonomy lt ON lt.listing_id=l.id
      INNER JOIN tags_directory_taxonomy_closure tc ON tc.descendant_id=lt.taxonomy_node_id
      WHERE p.place_type='locality' AND p.is_active=1 AND tc.ancestor_id IN (${placeholders})
      ORDER BY p.name`, [site.id, ...ids]);
    const prefix = kind === "restaurants" ? "donde-comer-en" : kind === "accommodation" ? "cabanas-en" : "que-regalar-en";
    for (const place of places) result.push(`/${prefix}/${slugify(place.slug || place.name)}`);
  }
  return [...new Set(result)];
}
