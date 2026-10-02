import test from "node:test";
import assert from "node:assert/strict";
import { selectRecommendedCandidates } from "../../app/modules/destination-ai/server/selectRecommendedCandidates.js";

const candidates = [
  { entityKey: "directory_listing:1", name: "Pizzería Uno" },
  { entityKey: "directory_listing:2", name: "Pizzería Dos" },
  { entityKey: "directory_listing:3", name: "Otro Comercio" }
];

test("nombrar un prestador sin recomendar su ID no genera una tarjeta", () => {
  const selected = selectRecommendedCandidates({
    candidates,
    answer: "Te recomiendo Pizzería Uno y Pizzería Dos.",
    recommendationKeys: []
  });
  assert.deepEqual(selected, []);
});

test("los IDs autorizados generan tarjeta aunque la respuesta use una referencia abreviada", () => {
  const selected = selectRecommendedCandidates({
    candidates,
    answer: "La primera es una buena alternativa.",
    recommendationKeys: ["directory_listing:1"]
  });
  assert.deepEqual(selected.map(item => item.entityKey), ["directory_listing:1"]);
});

test("una pregunta aclaratoria sin recomendación no muestra tarjetas arbitrarias", () => {
  const selected = selectRecommendedCandidates({ candidates, answer: "¿En qué localidad preferís buscar?", recommendationKeys: [] });
  assert.deepEqual(selected, []);
});
