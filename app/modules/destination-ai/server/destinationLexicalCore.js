import { normalizeDestinationTerm } from "./destinationTaxonomyCore.js";

const DERIVATIONAL_SUFFIXES = [
  "amientos", "imientos", "aciones", "adoras", "adores",
  "amiento", "imiento", "acion", "adora", "ador",
  "ancias", "encias", "mente", "amos", "emos", "imos"
];

// Stemming liviano para búsquedas comerciales en español. Conserva una raíz
// suficientemente larga para que FULLTEXT resuelva variantes como instalar,
// instalador, instalación e instalamos sin un diccionario por rubro.
export function stemDestinationSearchTerm(value) {
  let term = normalizeDestinationTerm(value).replace(/\s+/g, "");
  if (term.length <= 4) return term;

  for (const suffix of DERIVATIONAL_SUFFIXES) {
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
