import { normalizeDestinationTerm } from "./destinationTaxonomyCore.js";
import { stemDestinationSearchTerm } from "./destinationLexicalCore.js";

const STOP_WORDS = new Set(["a","al","algo","con","de","del","donde","el","en","es","hay","la","las","lo","los","me","mi","para","por","que","quiero","un","una","y"]);

function subjectTerms(value) {
  return [...new Set(normalizeDestinationTerm(value).split(" ")
    .filter(term => (term.length > 1 || /^\d+$/u.test(term)) && !STOP_WORDS.has(term))
    .map(stemDestinationSearchTerm).filter(Boolean))].slice(0, 10);
}

export function explicitOfferStrength(value, task = {}) {
  const source = normalizeDestinationTerm(value);
  const subject = normalizeDestinationTerm(task.subject || "").trim();
  const terms = subjectTerms(task.subject || task.query);
  if (!source || !terms.length) return 0;
  const matchedPhrase = subject.split(" ").filter(Boolean).length > 1 && source.includes(subject)
    ? subject
    : terms.slice(0, -1).map((term, index) => `${term} ${terms[index + 1]}`).find(candidate => source.includes(candidate));
  if (matchedPhrase) {
    if (!["find_service", "find_business_category"].includes(task.type)) return 30;
    const phraseIndex = source.indexOf(matchedPhrase);
    const evidenceWindow = source.slice(Math.max(0, phraseIndex - 180), phraseIndex + matchedPhrase.length + 180);
    const serviceEvidence = /\b(?:servicio|servicios|ofrece|ofrecemos|contamos|atencion|tramite|tramites|factura|facturas|cobranza|cobranzas|abonar|abona|enviar|recibir|western union|cobro express|rapi pago)\b/u.test(evidenceWindow);
    return serviceEvidence ? 30 : 18;
  }
  return terms.every(term => source.includes(term)) ? 18 : 0;
}
