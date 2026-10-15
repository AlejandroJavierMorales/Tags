import { db } from "@/app/lib/tags-db";
import { getDirectoryPublicData } from "./getDirectoryPublicData";
import { getDiningCategoryNodes } from "./directoryGastronomy";

function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function bySlug(nodes, slugs, parentId = null) {
  const expected = new Set(slugs.map(normalized));
  return nodes.find(node => (parentId == null || Number(node.parent_id || 0) === Number(parentId)) && expected.has(normalized(node.slug || node.name))) || null;
}

function uniqueResults(items) {
  return [...new Map(items.map(item => [`${item.result_type || "provider"}:${item.id}`, item])).values()];
}

async function loadAllCategoryPages(categoryId, siteCode) {
  if (!categoryId) return [];
  const first = await getDirectoryPublicData({ categoria:categoryId, pagina:1 }, siteCode);
  if (!first) return [];
  const totalPages = Math.max(1, Number(first.pagination?.totalPages || 1));
  if (totalPages === 1) return [first];
  const remaining = await Promise.all(Array.from({ length:totalPages - 1 }, (_, index) =>
    getDirectoryPublicData({ categoria:categoryId, pagina:index + 2 }, siteCode)
  ));
  return [first, ...remaining.filter(Boolean)];
}

function mergePages(pages, { tourism, selectedTourismCategory = null, categories = null } = {}) {
  const valid = pages.filter(Boolean);
  if (!valid.length) return null;
  const first = valid[0];
  const listings = uniqueResults(valid.flatMap(page => page.listings || []));
  const mapListings = uniqueResults(valid.flatMap(page => page.mapListings || []));
  const localities = [...new Map(valid.flatMap(page => page.localities || []).map(item => [Number(item.id), item])).values()];
  const visibleCategories = categories || [...new Map(valid.flatMap(page => page.categories || []).map(item => [Number(item.id), item])).values()];
  return { ...first,tourism,selectedTourismCategory,categories:visibleCategories,listings,mapListings,localities,
    pagination:{ ...first.pagination,page:1,total:listings.length,totalPages:1 } };
}

export async function getDirectoryTourismPageData(kind, siteCode = "calamuchitar") {
  const [nodes] = await db.execute("SELECT id,parent_id,name,slug,depth,image_url,description,sort_order FROM tags_directory_taxonomy_nodes WHERE is_active=1 ORDER BY depth,sort_order,name");
  const tourism = bySlug(nodes, ["turismo"]);
  if (!tourism) return null;

  if (kind === "accommodation") {
    const category = bySlug(nodes, ["alojamientos", "alojamiento"], tourism.id);
    return mergePages(await loadAllCategoryPages(category?.id, siteCode), { tourism,selectedTourismCategory:category });
  }
  if (kind === "restaurants") {
    const gastronomy = bySlug(nodes, ["gastronomia"]);
    const categories = gastronomy ? getDiningCategoryNodes(nodes, gastronomy.id) : [];
    const pages = (await Promise.all(categories.map(category => loadAllCategoryPages(category.id, siteCode)))).flat();
    return mergePages(pages, { tourism,selectedTourismCategory:gastronomy,categories });
  }
  if (kind === "activities") {
    const roots = [
      bySlug(nodes, ["actividades-de-recreacion", "actividades-recreativas"], tourism.id),
      bySlug(nodes, ["atractivos-y-lugares-de-interes"], tourism.id),
      bySlug(nodes, ["servicios-turisticos"], tourism.id),
    ].filter(Boolean);
    const pages = (await Promise.all(roots.map(category => loadAllCategoryPages(category.id, siteCode)))).flat();
    return mergePages(pages, { tourism,categories:roots });
  }
  if (kind === "gifts") {
    const giftSlugs = new Set(["regaleria","regalerias","regionales","productos-regionales","chocolaterias","venta-de-alfajores","artesanias","artesanias-y-regionales"]);
    const categories = nodes.filter(node => Number(node.parent_id) === Number(tourism.id) && giftSlugs.has(normalized(node.slug || node.name)));
    const pages = (await Promise.all(categories.map(category => loadAllCategoryPages(category.id, siteCode)))).flat();
    return mergePages(pages, { tourism,categories });
  }
  return null;
}
