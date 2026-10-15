import assert from "node:assert/strict";
import { requestedTourismContext, tourismContextEvidence, tourismContextScore } from "./destinationTourismContext.js";

const indoorFamily = {
  audience_json: { text: "Familias con niños y adultos mayores" },
  conditions_json: { weather: "Funciona con lluvia", recommendations: "Reservar previamente" },
  practical_json: { indoor: true, rainSuitable: true, accessibility: "Acceso para silla de ruedas", petsAllowed: false },
  availability_json: { duration: "2 horas", schedule: "Todos los días" },
};

const outdoorOnly = {
  audience_json: { text: "Adultos" },
  conditions_json: {},
  practical_json: { outdoor: true, rainSuitable: false, petsAllowed: true },
  availability_json: {},
};

assert.equal(requestedTourismContext({ query: "¿Qué podemos hacer con chicos si llueve?" }).rain, true);
assert.equal(requestedTourismContext({ query: "¿Qué podemos hacer con chicos si llueve?" }).children, true);
assert.ok(tourismContextScore(indoorFamily, { query: "Plan familiar con lluvia y silla de ruedas" }) > 40);
assert.ok(tourismContextScore(outdoorOnly, { query: "Plan para un día de lluvia" }) < 0);
assert.ok(tourismContextScore(outdoorOnly, { query: "Paseo con mi perro" }) > 0);
assert.match(tourismContextEvidence(indoorFamily).text, /Apto con lluvia/);
assert.match(tourismContextEvidence(indoorFamily).text, /Accesibilidad/);

console.log("destinationTourismContext: compatibilidad turística contextual validada");
