export function normalizeDestinationTerm(value) {
  return String(value || "").toLocaleLowerCase("es-AR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function taxonomyStem(word) {
  let term = word;
  for (const suffix of ["aciones", "adoras", "adores", "acion", "adora", "ador", "amos", "emos", "imos"]) {
    if (term.endsWith(suffix) && term.length - suffix.length >= 4) {
      term = term.slice(0, -suffix.length);
      break;
    }
  }
  if (term.length > 6 && term.endsWith("es")) term = term.slice(0, -2);
  else if (term.length > 5 && term.endsWith("s")) term = term.slice(0, -1);
  if (term.length > 6 && /(?:ar|er|ir)$/u.test(term)) term = term.slice(0, -2);
  if (term.length > 5 && /[aeo]$/u.test(term)) term = term.slice(0, -1);
  return term;
}

export function taxonomyCatalogForPrompt(catalog) {
  return catalog.map(node => `${node.id}: ${node.name}${node.aliases.length ? ` (también: ${node.aliases.join(", ")})` : ""}`).join("\n").slice(0, 14000);
}

export function resolveTaxonomyTerms(catalog, value) {
  const query = normalizeDestinationTerm(value);
  if (!query) return [];
  const queryWords = new Set(query.split(" ").map(taxonomyStem));
  return catalog.map(node => {
    const labels = [node.name, node.slug, ...node.aliases].map(normalizeDestinationTerm).filter(Boolean);
    const exact = labels.some(label => label === query);
    const contained = labels.some(label => query.includes(label) || label.includes(query));
    const overlap = Math.max(0, ...labels.map(label => label.split(" ").map(taxonomyStem).filter(word => queryWords.has(word)).length));
    return { node, score: exact ? 100 : contained ? 50 : overlap };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || b.node.depth - a.node.depth).slice(0, 4).map(item => item.node.id);
}

export function pruneAncestorTaxonomyIds(catalog, values) {
  const byId = new Map(catalog.map(node => [Number(node.id), node]));
  const selected = [...new Set(values.map(Number).filter(id => byId.has(id)))];
  const selectedSet = new Set(selected);
  const ancestorIds = new Set();
  for (const id of selected) {
    let parentId = byId.get(id)?.parentId;
    const visited = new Set();
    while (parentId != null && !visited.has(Number(parentId))) {
      const normalizedParentId = Number(parentId);
      if (selectedSet.has(normalizedParentId)) ancestorIds.add(normalizedParentId);
      visited.add(normalizedParentId);
      parentId = byId.get(normalizedParentId)?.parentId;
    }
  }
  return selected.filter(id => !ancestorIds.has(id));
}
