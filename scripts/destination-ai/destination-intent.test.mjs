import test from "node:test";
import assert from "node:assert/strict";
import { fallbackDestinationIntent, normalizeDestinationIntent } from "../../app/modules/destination-ai/server/destinationIntent.js";

test("una pregunta sobre ubicación no dispara búsqueda comercial", () => {
  const intent = fallbackDestinationIntent({ message: "¿Estás teniendo en cuenta mi ubicación?", hasUserLocation: true });
  assert.equal(intent.intent, "conversation_meta");
  assert.equal(intent.shouldSearch, false);
  assert.equal(intent.useUserLocation, true);
});

test("una búsqueda de cables inicia una búsqueda de producto", () => {
  const intent = fallbackDestinationIntent({ message: "¿Dónde puedo comprar cables?", hasUserLocation: true });
  assert.equal(intent.intent, "find_product");
  assert.equal(intent.shouldSearch, true);
  assert.match(intent.searchQuery, /cables/i);
});

test("una consulta por un prestador se interpreta como inspección del negocio", () => {
  const intent = fallbackDestinationIntent({ message: "¿Y qué vende Ingematec?" });
  assert.equal(intent.intent, "inspect_business");
  assert.equal(intent.businessName, "Ingematec");
  assert.equal(intent.searchQuery, "Ingematec");
});

test("una aclaración breve conserva la búsqueda anterior", () => {
  const intent = fallbackDestinationIntent({
    message: "Es lo mismo",
    history: [
      { role: "user", content: "Ahora necesito comprar una termomagnética" },
      { role: "assistant", content: "¿Es para una casa o para uso industrial?" }
    ]
  });
  assert.equal(intent.continuesPrevious, true);
  assert.match(intent.searchQuery, /termomagnética/i);
});

test("un resultado estructurado inválido cae al fallback seguro", () => {
  const fallback = fallbackDestinationIntent({ message: "¿Dónde compro cables?" });
  const normalized = normalizeDestinationIntent({ intent: "invented", shouldSearch: true }, fallback);
  assert.deepEqual(normalized, fallback);
});

test("conversation_meta nunca conserva una consulta de búsqueda", () => {
  const fallback = fallbackDestinationIntent({ message: "hola" });
  const normalized = normalizeDestinationIntent({
    intent: "conversation_meta", shouldSearch: true, searchQuery: "cabañas", subject: "ubicación",
    businessName: "", locationText: "", useUserLocation: true, isNewTopic: false,
    continuesPrevious: true, answerDirective: "confirmar ubicación"
  }, fallback);
  assert.equal(normalized.shouldSearch, false);
  assert.equal(normalized.searchQuery, "");
});

test("otra localidad conserva el producto y excluye las localidades ya mostradas", () => {
  const intent = fallbackDestinationIntent({
    message: "No, decime en otra localidad",
    history: [{ role: "user", content: "¿Dónde puedo comprar un control remoto?" }, { role: "assistant", content: "Te mostré opciones." }],
    recentRecommendations: [{ entityKey: "directory_listing:1", name: "Comercio A", locality: "Los Reartes" }]
  });
  assert.equal(intent.locationPreference, "other");
  assert.match(intent.searchQuery, /control remoto/i);
  assert.deepEqual(intent.excludedLocalities, ["Los Reartes"]);
});

test("una referencia ordinal se resuelve contra los resultados mostrados", () => {
  const intent = fallbackDestinationIntent({
    message: "¿El segundo tiene WhatsApp?",
    recentRecommendations: [
      { entityKey: "directory_listing:1", name: "Primero" },
      { entityKey: "directory_listing:2", name: "Segundo" }
    ]
  });
  assert.equal(intent.intent, "follow_up_result");
  assert.equal(intent.resultReferenceKey, "directory_listing:2");
  assert.equal(intent.shouldSearch, false);
});

test("una intención estructurada conserva búsquedas independientes para dos necesidades", () => {
  const fallback = fallbackDestinationIntent({ message: "Necesito una ferretería y un lugar para almorzar" });
  const intent = normalizeDestinationIntent({
    intent: "find_business", shouldSearch: true, searchQuery: "ferretería", alternativeQuery: "corralón",
    searchQueries: [
      { intent: "find_business", query: "ferretería", alternativeQuery: "corralón", label: "comprar en ferretería" },
      { intent: "find_business", query: "restaurante", alternativeQuery: "gastronomía", label: "almorzar" }
    ],
    subject: "ferretería y almuerzo", businessName: "", locationText: "Los Reartes", locationPreference: "specified",
    excludedLocalities: [], useUserLocation: true, resultReferenceKey: "", isNewTopic: true,
    continuesPrevious: false, answerDirective: "Responder ambas necesidades por separado"
  }, fallback);
  assert.deepEqual(intent.searchQueries.map(item => item.query), ["ferretería", "restaurante"]);
  assert.equal(intent.locationText, "Los Reartes");
});

test("cuestionar una recomendación no inicia una búsqueda del rubro mencionado en la corrección", () => {
  const intent = fallbackDestinationIntent({
    message: "Me estás recomendando un complejo de cabañas",
    recentRecommendations: [{ entityKey: "directory_listing:9", name: "Complejo equivocado", locality: "Los Reartes" }]
  });
  assert.equal(intent.intent, "challenge_recommendation");
  assert.equal(intent.shouldSearch, false);
  assert.equal(intent.resultReferenceKey, "directory_listing:9");
});

test("el fallback busca gastronomía aunque falle el intérprete de IA", () => {
  const intent = fallbackDestinationIntent({ message: "¿Dónde puedo ir a comer?", hasUserLocation: true });
  assert.equal(intent.intent, "find_business");
  assert.equal(intent.shouldSearch, true);
  assert.match(intent.searchQuery, /comer/i);
});

test("el fallback reconoce merienda y alojamiento como rubros", () => {
  const merienda = fallbackDestinationIntent({ message: "Quiero un lugar para merendar" });
  const alojamiento = fallbackDestinationIntent({ message: "¿Dónde me puedo alojar?" });
  assert.equal(merienda.intent, "find_business");
  assert.equal(merienda.shouldSearch, true);
  assert.equal(alojamiento.intent, "find_business");
  assert.equal(alojamiento.shouldSearch, true);
});
