import { db } from "@/app/lib/tags-db";
import { getDirectoryPublicData } from "./getDirectoryPublicData";

function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findByName(nodes, parentId, names) {
  const expected = names.map(normalized);
  return nodes.find(node => Number(node.parent_id || 0) === Number(parentId || 0) && expected.includes(normalized(node.name))) || null;
}

export async function getDirectoryTourismPageData(kind, siteCode = "calamuchitar") {
  const [nodes] = await db.execute("SELECT id,parent_id,name,slug,depth,image_url,description,sort_order FROM tags_directory_taxonomy_nodes WHERE is_active=1 ORDER BY depth,sort_order,name");
  const tourism = nodes.find(node => Number(node.depth) === 0 && normalized(node.name) === "turismo");
  if (!tourism) return null;

  let selected = null;
  if (kind === "accommodation") selected = findByName(nodes, tourism.id, ["Alojamientos", "Alojamiento"]);
  if (kind === "restaurants") selected = nodes.find(node => Number(node.depth) === 0 && normalized(node.name) === "gastronomia") || findByName(nodes, tourism.id, ["Restoranes", "Restaurantes", "Gastronomía"]);
  if (kind === "activities") selected = findByName(nodes, tourism.id, ["Actividades de Recreación", "Actividades Recreativas"]);

  if (kind === "activities" && !selected) selected = findByName(nodes, tourism.id, ["Actividades de Recreacion", "Actividades Recreativas"]);
  if (kind === "restaurants" && !selected) selected = nodes.find(node => Number(node.depth) === 0 && normalized(node.name) === "gastronomia") || findByName(nodes, tourism.id, ["Restoranes", "Restaurantes", "Gastronomia"]);

  if (kind === "restaurants" && selected && Number(selected.depth) === 0) {
    const excluded = new Set(["fabrica de cervezas", "fabrica de cerveza", "fabricas de cerveza", "fabrica de alfajores", "fabricas de alfajores"]);
    const gastronomyCategories = nodes.filter(node => Number(node.parent_id) === Number(selected.id) && !excluded.has(normalized(node.name)));
    const pages = await Promise.all(gastronomyCategories.map(category => getDirectoryPublicData({ categoria: category.id, pagina: 1 }, siteCode)));
    const validPages = pages.filter(Boolean);
    if (validPages.length) {
      const first = validPages[0];
      const listings = [...new Map(validPages.flatMap(page => page.listings).map(item => [item.id, item])).values()];
      const mapListings = [...new Map(validPages.flatMap(page => page.mapListings).map(item => [item.id, item])).values()];
      const localities = [...new Map(validPages.flatMap(page => page.localities).map(item => [item.id, item])).values()];
      return { ...first, categories: gastronomyCategories, listings, mapListings, localities, selectedTourismCategory: selected, pagination: { ...first.pagination, total: listings.length, totalPages: Math.max(1, Math.ceil(listings.length / first.pagination.pageSize)) }, tourism };
    }
  }

  if (kind === "gifts") {
    const excluded = new Set(["alojamientos", "alojamiento", "actividades de recreacion", "actividades recreativas"]);
    const giftCategories = nodes.filter(node => Number(node.parent_id) === Number(tourism.id) && !excluded.has(normalized(node.name)));
    const pages = await Promise.all(giftCategories.map(category => getDirectoryPublicData({ categoria: category.id, pagina: 1 }, siteCode)));
    const validPages = pages.filter(Boolean);
    if (!validPages.length) return null;
    const first = validPages[0];
    const listings = [...new Map(validPages.flatMap(page => page.listings).map(item => [item.id, item])).values()];
    const mapListings = [...new Map(validPages.flatMap(page => page.mapListings).map(item => [item.id, item])).values()];
    const localities = [...new Map(validPages.flatMap(page => page.localities).map(item => [item.id, item])).values()];
    return { ...first, categories: giftCategories, listings, mapListings, localities, selectedTourismCategory: null, pagination: { ...first.pagination, total: listings.length, totalPages: Math.max(1, Math.ceil(listings.length / first.pagination.pageSize)) }, tourism };
  }
  const data = await getDirectoryPublicData({ categoria: selected?.id || tourism.id, pagina: 1 }, siteCode);
  if (!data) return null;
  return { ...data, tourism, selectedTourismCategory: selected };
}
