import assert from "node:assert/strict";
import { fallbackDestinationIntentV2, normalizeDestinationIntentV2 } from "./destinationIntentV2.js";

const taxonomy = [
  { id: 1, parentId: null, name: "Alojamientos", slug: "alojamientos", depth: 0, aliases: [] },
  { id: 2, parentId: 1, name: "Cabañas", slug: "cabanas", depth: 1, aliases: ["cabaña"] },
  { id: 3, parentId: null, name: "Oficios", slug: "oficios", depth: 0, aliases: [] },
  { id: 4, parentId: 3, name: "Constructoras", slug: "constructoras", depth: 1, aliases: ["constructora"] },
];

const fallback = fallbackDestinationIntentV2({ message: "Quiero construir una cabaña alpina", taxonomyCatalog: taxonomy });
assert.equal(fallback.tasks[0].type, "find_service");
assert.deepEqual(fallback.tasks[0].taxonomyNodeIds, [], "el objeto construido no debe clasificarse como alojamiento");

const interpreted = normalizeDestinationIntentV2({
  conversationalAction: "search",
  continuesPrevious: false,
  answerDirective: "",
  tasks: [{
    type: "find_service",
    query: "construcción de cabaña alpina",
    subject: "empresa que construya una cabaña alpina",
    taxonomyNodeIds: [4],
    locality: "",
    localityPreference: "any",
    resultReferenceKeys: [],
    constraints: [],
    needsClarification: false,
  }],
}, fallback, taxonomy);
assert.deepEqual(interpreted.tasks[0].taxonomyNodeIds, [4], "la clasificación semántica del servicio debe prevalecer sobre la palabra cabaña");

console.log("destinationServiceIntent: acciones sobre objetos no se confunden con el rubro del objeto");
