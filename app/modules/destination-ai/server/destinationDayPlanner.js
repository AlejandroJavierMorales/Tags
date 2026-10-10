import { normalizeDestinationTerm } from "./destinationTaxonomyCore.js";

const BROAD_LOCALITIES = new Set(["", "calamuchita", "valle de calamuchita", "el valle", "valle"]);

function idsBySlugs(catalog, slugs) {
  const expected = new Set(slugs);
  return catalog.filter(node => expected.has(normalizeDestinationTerm(node.slug).replace(/\s+/g, "-"))).map(node => Number(node.id)).filter(Number.isInteger);
}

function diningSlugs(query) {
  const normalized = normalizeDestinationTerm(query);
  if (/\b(?:meriend|cafe|te|desayun)/u.test(normalized)) {
    return ["cafeterias-y-casas-de-te", "meriendas-y-desayunos", "chocolaterias"];
  }
  if (/\b(?:cerveza|bar|pub|tragos)/u.test(normalized)) {
    return ["bares-y-cervecerias", "cervecerias", "restoranes"];
  }
  return ["restoranes", "parrillas", "pizzerias", "comidas-rapidas", "comida-para-llevar"];
}

function planTask(base, overrides) {
  return {
    ...base,
    resultReferenceKeys: [],
    needsClarification: false,
    ...overrides,
  };
}

export function prepareDestinationDayPlan(intent, taxonomyCatalog, { hasUserLocation = false } = {}) {
  const planTasks = (intent?.tasks || []).filter(task => task.type === "plan_day");
  if (!planTasks.length) return { intent, clarification: null, isDayPlan: false };

  const base = planTasks[0];
  const locality = normalizeDestinationTerm(base.locality);
  const hasSpecificLocality = base.localityPreference === "specified" && !BROAD_LOCALITIES.has(locality);
  if (!hasSpecificLocality && !hasUserLocation) {
    return {
      intent: {
        ...intent,
        conversationalAction: "clarify",
        tasks: [{ ...base, needsClarification: true, locality: "", localityPreference: "any" }],
        answerDirective: "Preguntá solamente desde qué localidad salen y si tienen movilidad para recorrer el Valle.",
      },
      clarification: "¡Claro! ¿Desde qué localidad salen y tienen movilidad para recorrer el Valle?",
      isDayPlan: true,
    };
  }

  const originalText = [base.query, base.subject, ...(base.constraints || [])].join(" ");
  const activityIds = idsBySlugs(taxonomyCatalog, ["atractivos-y-lugares-de-interes", "actividades-de-recreacion"]);
  const diningIds = idsBySlugs(taxonomyCatalog, diningSlugs(originalText));
  const eventIds = idsBySlugs(taxonomyCatalog, ["eventos-y-agenda"]);
  const normalizedOriginal=normalizeDestinationTerm(originalText);
  const inferredAudience=/\bpareja\b/u.test(normalizedOriginal)?"pareja":/\b(?:ninos|ninas|chicos|familia)\b/u.test(normalizedOriginal)?"familia":null;
  const shared = {
    locality: base.locality,
    localityPreference: hasSpecificLocality ? "specified" : base.localityPreference,
    constraints: [...new Set([...(base.constraints || []), "plan para el día", inferredAudience].filter(Boolean))].slice(0, 8),
  };
  const tasks = [
    planTask(shared, {
      type: "find_experience",
      query: "atractivos paseos y actividades",
      subject: "un paseo, atractivo o actividad para el día",
      taxonomyNodeIds: activityIds,
      retrievalMode: "category",
      planSlot: "activity",
    }),
    planTask(shared, {
      type: "find_business_category",
      query: /\b(?:meriend|desayun)/u.test(normalizeDestinationTerm(originalText)) ? "merienda o desayuno" : "lugar para comer",
      subject: "un lugar para comer durante el recorrido",
      taxonomyNodeIds: diningIds,
      retrievalMode: "category",
      planSlot: "dining",
    }),
    planTask(shared, {
      type: "find_event",
      query: "eventos vigentes",
      subject: "un evento vigente que pueda integrarse al recorrido",
      taxonomyNodeIds: eventIds,
      retrievalMode: "category",
      planSlot: "event",
      optional: true,
    }),
  ].filter(task => task.taxonomyNodeIds.length);

  const otherTasks=(intent.tasks||[]).filter(task=>task.type!=="plan_day");
  return {
    intent: {
      ...intent,
      conversationalAction: "search",
      continuesPrevious: false,
      tasks:[...tasks,...otherTasks].slice(0,5),
      isDayPlan: true,
      answerDirective: "Armá un itinerario cronológico y concreto usando solamente las opciones encontradas. Combiná paseo o actividad con gastronomía y sumá un evento sólo si está vigente. No inventes lugares, horarios, traslados ni clima. Si falta un bloque, presentá un plan parcial y explicá en una frase qué falta confirmar.",
    },
    clarification: null,
    isDayPlan: true,
  };
}
