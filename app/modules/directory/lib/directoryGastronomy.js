const GASTRONOMY_GROUPS = [
  ["restoranes", "restaurantes"],
  ["comidas-para-llevar"],
  ["parrillas"],
  ["cervecerias", "bares-y-cervecerias"],
  ["bar-cafeteria", "bares-y-cafeterias", "cafeterias-y-casas-de-te"],
  ["casas-de-te", "casa-de-te"],
  ["pizzerias", "pizzeria"],
];

function normalizedSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getDiningCategoryNodes(nodes, gastronomyId) {
  const children = nodes.filter(node => Number(node.parent_id) === Number(gastronomyId));
  const acceptedSlugs = new Set(GASTRONOMY_GROUPS.flat());
  return children.filter(node => acceptedSlugs.has(normalizedSlug(node.slug || node.name)));
}
