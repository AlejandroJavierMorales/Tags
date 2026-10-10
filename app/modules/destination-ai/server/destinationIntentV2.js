import { pruneAncestorTaxonomyIds, resolveTaxonomyTerms, taxonomyCatalogForPrompt } from "./destinationTaxonomyCore.js";

const TASK_TYPES = ["find_business_category", "find_product", "find_dish", "find_service", "find_experience", "find_event", "plan_day", "public_local_info", "inspect_business", "follow_up", "other"];

export const DESTINATION_INTENT_V2_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    conversationalAction: { type: "string", enum: ["search", "follow_up", "clarify", "answer_without_search"] },
    continuesPrevious: { type: "boolean" },
    tasks: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string", enum: TASK_TYPES },
          query: { type: "string" },
          subject: { type: "string" },
          taxonomyNodeIds: { type: "array", maxItems: 6, items: { type: "integer" } },
          locality: { type: "string" },
          localityPreference: { type: "string", enum: ["current", "specified", "other", "any"] },
          resultReferenceKeys: { type: "array", maxItems: 6, items: { type: "string" } },
          constraints: { type: "array", maxItems: 8, items: { type: "string" } },
          needsClarification: { type: "boolean" }
        },
        required: ["type", "query", "subject", "taxonomyNodeIds", "locality", "localityPreference", "resultReferenceKeys", "constraints", "needsClarification"]
      }
    },
    answerDirective: { type: "string" }
  },
  required: ["conversationalAction", "continuesPrevious", "tasks", "answerDirective"]
};

export const DESTINATION_ANSWER_V2_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    recommendationKeys: { type: "array", items: { type: "string" } },
    needsClarification: { type: "boolean" },
    suggestedPrompts: { type: "array", maxItems: 3, items: { type: "string" } }
  },
  required: ["reply", "recommendationKeys", "needsClarification", "suggestedPrompts"]
};

export function fallbackDestinationIntentV2({ message, taxonomyCatalog = [], previousTasks = [] }) {
  const query = String(message || "").trim().slice(0, 500);
  const segments=query.split(/\b(?:además|ademas|también|tambien)\b|\s+y\s+(?=(?:necesito|busco|quiero|tengo|dónde|donde)\b)/iu).map(value=>value.trim()).filter(Boolean).slice(0,5);
  const tasks=(segments.length?segments:[query]).map(segment=>{const resolvedTaxonomyNodeIds=resolveTaxonomyTerms(taxonomyCatalog,segment);const normalized=segment.toLocaleLowerCase("es-AR");const dayPlan=/\b(?:armar|armame|organizar|haceme|quiero)\b.*\b(?:plan|itinerario)\b|\b(?:plan|itinerario)\b.*\b(?:paseo|comida|dia|día|jornada|recorrido|turistico|turístico|romantico|romántico)\b|\b(?:pasar|organizar|armar)\b.*\b(?:dia|día)\b/u.test(normalized);const productAction=/\b(?:comprar|conseguir|vende|venden|producto)\b/u.test(normalized);const serviceAction=!dayPlan&&/\b(?:construir|construccion|fabricar|fabricacion|instalar|instalacion|instalador|reparar|reparacion|mantener|mantenimiento|colocar|montar|armar)\b/u.test(normalized);const taxonomyNodeIds=serviceAction||dayPlan?[]:resolvedTaxonomyNodeIds;return{type:dayPlan?"plan_day":serviceAction?"find_service":taxonomyNodeIds.length?"find_business_category":productAction?"find_product":"other",query:segment,subject:segment,taxonomyNodeIds,locality:"",localityPreference:"any",resultReferenceKeys:[],constraints:[],needsClarification:dayPlan||(!serviceAction&&!taxonomyNodeIds.length&&!productAction)};});
  return {
    conversationalAction: "search",
    continuesPrevious: false,
    tasks,
    answerDirective: tasks.every(task=>task.type!=="other") ? "Respondé cada necesidad con opciones elegibles." : "Pedí una precisión breve sólo para las tareas que no pudieron interpretarse.",
    previousTasks
  };
}

export function normalizeDestinationIntentV2(value, fallback, taxonomyCatalog, previousTasks = []) {
  if (!value || !Array.isArray(value.tasks)) return fallback;
  const continuesPrevious=Boolean(value.continuesPrevious);
  const tasks = value.tasks.map((task,index) => {
    const prior=continuesPrevious?(previousTasks[index]||previousTasks[0]||null):null;
    const rawQuery=String(task?.query||"").trim();
    const rawSubject=String(task?.subject||task?.query||"").trim();
    const requestedType=TASK_TYPES.includes(task?.type)?task.type:"other";
    const resolved=resolveTaxonomyTerms(taxonomyCatalog,`${rawSubject} ${rawQuery}`);
    const validCatalogIds=new Set(taxonomyCatalog.map(node=>Number(node.id)));
    const interpretedIds=(Array.isArray(task?.taxonomyNodeIds)?task.taxonomyNodeIds:[]).map(Number).filter(id=>validCatalogIds.has(id));
    const selectedIds=requestedType==="find_service"?(interpretedIds.length?interpretedIds:(prior?.taxonomyNodeIds||[])):resolved.length?resolved:(prior?.taxonomyNodeIds||[]);
    const taxonomyNodeIds=pruneAncestorTaxonomyIds(taxonomyCatalog,selectedIds).slice(0,6);
    const resultReferenceKeys=(Array.isArray(task?.resultReferenceKeys)?task.resultReferenceKeys:[]).map(item=>String(item||"").slice(0,255)).filter(Boolean).slice(0,6);
    const shortFollowUp=Boolean(prior&&prior.type!=="plan_day"&&!resultReferenceKeys.length&&rawQuery.split(/\s+/).filter(Boolean).length<=8);
    const query=shortFollowUp?`${prior.subject||prior.query||""} ${rawQuery}`.trim():rawQuery;
    return {
      type:prior&&["other","follow_up"].includes(requestedType)?prior.type:requestedType,
      query:query.slice(0,500),subject:(shortFollowUp?`${prior.subject||prior.query||""} ${rawSubject}`:rawSubject).trim().slice(0,255),taxonomyNodeIds,
      locality:String(task?.locality||prior?.locality||"").trim().slice(0,190),
      localityPreference:shortFollowUp&&!task?.locality?(prior?.localityPreference||"any"):(["current","specified","other","any"].includes(task?.localityPreference)?task.localityPreference:(prior?.localityPreference||"any")),
      resultReferenceKeys,
      constraints:[...(prior?.constraints||[]),...(Array.isArray(task?.constraints)?task.constraints:[])].map(item=>String(item||"").slice(0,190)).filter(Boolean).slice(0,8),
      needsClarification:Boolean(task?.needsClarification),
    };
  }).filter(task => task.query || task.resultReferenceKeys.length).slice(0, 5);
  if (!tasks.length) return fallback;
  return {
    conversationalAction: ["search", "follow_up", "clarify", "answer_without_search"].includes(value.conversationalAction) ? value.conversationalAction : "search",
    continuesPrevious,
    tasks,
    answerDirective: String(value.answerDirective || "").trim().slice(0, 800),
  };
}

export function destinationIntentV2Prompt({ message, history = [], mode = "unselected", taxonomyCatalog = [], previousTasks = [], recentRecommendations = [], hasUserLocation = false }) {
  const transcript = history.slice(-8).map(item => `${item.role === "assistant" ? "MUCHI" : "USUARIO"}: ${String(item.content || "").slice(0, 700)}`).join("\n");
  const previous = previousTasks.slice(-5).map(task => `${task.type}: ${task.subject || task.query}; rubros=${(task.taxonomyNodeIds || []).join(",")}`).join("\n");
  const results = recentRecommendations.slice(0, 8).map(item => `${item.entityKey}: ${item.name} (${item.locality || "sin localidad"})`).join("\n");
  return `Interpretá el último mensaje para el motor de búsqueda de Muchi y devolvé JSON estricto.

REGLAS INNEGOCIABLES:
- Si la persona quiere construir, fabricar, instalar, reparar, mantener, colocar, montar o armar algo, usá find_service y elegí el rubro del prestador que realiza ese trabajo. El objeto sobre el que se trabaja no convierte la consulta en una búsqueda de lugares que simplemente lo tengan, vendan o alquilen.
- Si pide que armes, organices o recomiendes un plan, itinerario o recorrido para el día, usá una sola tarea plan_day. No lo interpretes como find_service.
- En plan_day no hace falta elegir rubros: el planificador los resuelve después. Conservá como restricciones compañía, edades, movilidad, presupuesto, intereses y momento del día.
- Separá cada necesidad distinta en una tarea. "Necesito X y también Y" son dos tareas.
- No clasifiques negocios ni deduzcas qué vende cada uno. Sólo clasificá lo que solicita la persona.
- Para búsquedas por rubro elegí IDs exclusivamente del catálogo real incluido abajo. Preferí el nodo específico y no el padre genérico.
- Si la persona quiere realizar una actividad en un lugar, elegí el rubro específico del establecimiento que realmente permite esa actividad. Un fabricante, proveedor o vendedor de equipamiento no equivale a un lugar de consumo aunque comparta una categoría padre.
- No incluyas simultáneamente un rubro padre y uno de sus descendientes: conservá solamente el descendiente pertinente.
- Para productos, platos y servicios, query debe contener el objeto concreto buscado, sin frases sociales.
- Usá find_business_category cuando la persona pide un tipo de establecimiento (por ejemplo un comercio o lugar de un rubro). Usá find_product/find_dish/find_service cuando pide algo concreto que ese lugar debe vender u ofrecer.
- Si expresa que quiere ir, sentarse, alojarse o visitar un tipo de lugar, conservá esa condición y elegí el rubro estructural específico; una simple mención del término no reemplaza al tipo de establecimiento.
- Un mensaje nuevo como "ahora necesito..." crea una tarea nueva; no debe arrastrar el producto anterior.
- Un seguimiento como "el segundo", "cómo llego" o "en otra localidad" conserva la tarea y referencia resultados previos.
- Si la tarea anterior era plan_day y la persona responde con la localidad o movilidad, conservá plan_day, actualizá locality/localityPreference y no dupliques en query ni subject las palabras del mensaje anterior.
- Turista/residente es contexto de preferencia, no cambia la verdad ni elimina resultados válidos.
- Si no se indicó localidad, usá localityPreference=any. La ubicación compartida servirá para ordenar desde lo más cercano.
- Pedí aclaración sólo si cambia materialmente el resultado; no la uses para demorar una búsqueda resoluble.
- No inventes IDs de taxonomía.

MODO: ${mode}. UBICACIÓN COMPARTIDA: ${hasUserLocation ? "sí" : "no"}.

CATÁLOGO DE RUBROS DEL DIRECTORIO (id: nombre):
${taxonomyCatalogForPrompt(taxonomyCatalog)}

TAREAS ACTIVAS ANTERIORES:
${previous || "Ninguna"}

RESULTADOS RECIENTES:
${results || "Ninguno"}

CONVERSACIÓN:
${transcript || "Sin mensajes previos"}

ÚLTIMO MENSAJE:
${String(message || "").slice(0, 1200)}`;
}
