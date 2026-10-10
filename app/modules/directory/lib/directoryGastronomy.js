const GASTRONOMY_GROUPS = [
  ["restoranes", "restaurantes"],
  ["comida-para-llevar", "comidas-para-llevar"],
  ["parrillas"],
  ["cervecerias", "bares-y-cervecerias"],
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
  return GASTRONOMY_GROUPS.map(aliases => children.find(node => aliases.includes(normalizedSlug(node.slug || node.name))))
    .filter(Boolean);
}

