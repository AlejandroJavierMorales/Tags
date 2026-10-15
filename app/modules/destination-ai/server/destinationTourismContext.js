import { normalizeDestinationTerm } from "./destinationTaxonomyCore.js";

function objectValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return {};
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; }
  catch { return {}; }
}

function text(value) {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "sí" : "no";
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(", ");
  if (typeof value === "object") return Object.values(value).map(text).filter(Boolean).join(", ");
  return String(value).replace(/\s+/g, " ").trim();
}

export function requestedTourismContext(task = {}) {
  const value = normalizeDestinationTerm([task.query, task.subject, ...(task.constraints || [])].join(" "));
  return {
    rain: /\b(?:lluvia|llueve|lloviendo|tormenta|mal tiempo)\b/u.test(value),
    heat: /\b(?:calor|caluroso|mucho sol)\b/u.test(value),
    cold: /\b(?:frio|helada|invierno)\b/u.test(value),
    children: /\b(?:ninos|ninas|chicos|familia|bebe|bebes)\b/u.test(value),
    olderAdults: /\b(?:adultos mayores|persona mayor|jubilados)\b/u.test(value),
    accessibility: /\b(?:accesible|accesibilidad|silla de ruedas|movilidad reducida)\b/u.test(value),
    noCar: /\b(?:sin auto|sin movilidad|caminando|a pie|transporte publico)\b/u.test(value),
    pets: /\b(?:mascota|mascotas|perro|perros)\b/u.test(value),
  };
}

export function tourismContextEvidence(row) {
  const audience = objectValue(row.audience_json);
  const conditions = objectValue(row.conditions_json);
  const practical = objectValue(row.practical_json);
  const availability = objectValue(row.availability_json);
  return {
    audience, conditions, practical, availability,
    text: [
      text(audience.text) && `Público recomendado: ${text(audience.text)}`,
      audience.minimumAge != null && `Edad mínima: ${text(audience.minimumAge)}`,
      text(practical.activity) && `Actividad: ${text(practical.activity)}`,
      text(practical.features) && `Características: ${text(practical.features)}`,
      practical.indoor === true && "Bajo techo",
      practical.outdoor === true && "Al aire libre",
      practical.rainSuitable === true && "Apto con lluvia",
      practical.rainSuitable === false && "No apto con lluvia",
      practical.petsAllowed === true && "Admite mascotas",
      text(practical.accessibility) && `Accesibilidad: ${text(practical.accessibility)}`,
      text(practical.difficulty) && `Dificultad: ${text(practical.difficulty)}`,
      text(conditions.weather) && `Clima: ${text(conditions.weather)}`,
      text(conditions.restrictions) && `Restricciones: ${text(conditions.restrictions)}`,
      text(conditions.recommendations) && `Recomendaciones: ${text(conditions.recommendations)}`,
      text(conditions.equipment) && `Conviene llevar: ${text(conditions.equipment)}`,
      text(availability.duration) && `Duración: ${text(availability.duration)}`,
      text(availability.schedule) && `Horarios: ${text(availability.schedule)}`,
    ].filter(Boolean).join(". "),
  };
}

export function tourismContextScore(row, task) {
  const requested = requestedTourismContext(task);
  const { audience, conditions, practical } = tourismContextEvidence(row);
  const source = normalizeDestinationTerm([text(audience), text(conditions), text(practical)].join(" "));
  let score = 0;
  if (requested.rain) score += practical.rainSuitable === true || practical.indoor === true ? 24 : practical.rainSuitable === false ? -40 : 0;
  if (requested.children) score += /\b(?:ninos|ninas|chicos|familia|familiar)\b/u.test(source) ? 16 : 0;
  if (requested.olderAdults) score += /\b(?:adultos mayores|baja dificultad|facil|accesible)\b/u.test(source) ? 12 : 0;
  if (requested.accessibility) score += text(practical.accessibility) ? 18 : 0;
  if (requested.pets) score += practical.petsAllowed === true ? 12 : practical.petsAllowed === false ? -20 : 0;
  if (requested.heat) score += practical.indoor === true || /\b(?:sombra|agua|rio|balneario)\b/u.test(source) ? 8 : 0;
  if (requested.cold) score += practical.indoor === true ? 8 : 0;
  return score;
}
