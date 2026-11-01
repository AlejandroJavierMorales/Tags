import test from "node:test";
import assert from "node:assert/strict";
import { classifyLodgingConversation, mergeLodgingConversationState } from "../app/modules/ai-chat/server/lodgingConversationState.mjs";

const now = new Date("2026-10-28T12:00:00-03:00");

test("un negocio sin capacidad hotelera nunca activa reservas", () => {
  assert.equal(classifyLodgingConversation({ message: "necesito una cabaña", state: null, hasCapability: false }), "business_information");
});
test("una consulta informativa sobre la cabaña no activa reservas", () => {
  assert.equal(classifyLodgingConversation({ message: "¿Cómo es la cabaña para 4 personas?", state: null, hasCapability: true }), "business_information");
  assert.equal(classifyLodgingConversation({ message: "¿A qué distancia están del río?", state: null, hasCapability: true }), "business_information");
});
test("una intención comercial concreta activa reservas", () => {
  assert.equal(classifyLodgingConversation({ message: "Necesito una cabaña para 5 personas del 28/12 al 3/1", state: null, hasCapability: true }), "lodging_booking");
  assert.equal(classifyLodgingConversation({ message: "¿Hay disponibilidad del 10/1 al 15/1?", state: null, hasCapability: true }), "lodging_booking");
});
test("reconoce variantes habituales sin confundir información", () => {
  const booking = ["¿Tienen lugar para cuatro del 5/1 al 8/1?", "¿Cuánto sale una cabaña?", "Quisiera alojarme tres noches", "Una habitación necesito para enero", "¿Queda libre del 2/2 al 6/2?"];
  const information = ["¿Aceptan mascotas?", "¿La piscina es climatizada?", "¿Qué incluye la cabaña?", "¿Dónde queda el complejo?", "¿Tienen wifi?", "Contame cómo es el alojamiento"];
  for (const message of booking) assert.equal(classifyLodgingConversation({ message, state: null, hasCapability: true }), "lodging_booking", message);
  for (const message of information) assert.equal(classifyLodgingConversation({ message, state: null, hasCapability: true }), "business_information", message);
});
test("una pregunta informativa no secuestra ni elimina una búsqueda incompleta", () => {
  const state = { active: true, completed: false, startsOn: "2027-01-05", endsOn: "2027-01-08", adults: 0, children: 0 };
  assert.equal(classifyLodgingConversation({ message: "Antes de reservar, ¿aceptan mascotas?", state, hasCapability: true }), "business_information");
  assert.equal(classifyLodgingConversation({ message: "2 adultos y 1 menor", state, hasCapability: true }), "lodging_booking");
});
test("después de cotizar permite cambiar fechas o pasajeros sin confundir preguntas informativas", () => {
  const state = { active: true, completed: true, startsOn: "2027-01-05", endsOn: "2027-01-08", adults: 2, children: 1 };
  assert.equal(classifyLodgingConversation({ message: "¿Y del 10/1 al 15/1?", state, hasCapability: true }), "lodging_booking");
  assert.equal(classifyLodgingConversation({ message: "Finalmente somos 3 adultos y 0 menores", state, hasCapability: true }), "lodging_booking");
  assert.equal(classifyLodgingConversation({ message: "¿Cómo es la unidad que me ofreciste?", state, hasCapability: true }), "business_information");
});
test("acumula fechas con cambio de año y luego huéspedes", () => {
  const first = mergeLodgingConversationState({ previous: null, message: "Necesito una cabaña del 28/12 al 3/1", now });
  assert.deepEqual({ startsOn: first.startsOn, endsOn: first.endsOn, adults: first.adults }, { startsOn: "2026-12-28", endsOn: "2027-01-03", adults: 0 });
  const second = mergeLodgingConversationState({ previous: first, message: "3 adultos y 2 menores", userHistory: ["Necesito una cabaña del 28/12 al 3/1"], now });
  assert.deepEqual({ startsOn: second.startsOn, endsOn: second.endsOn, adults: second.adults, children: second.children }, { startsOn: "2026-12-28", endsOn: "2027-01-03", adults: 3, children: 2 });
});
test("permite corregir fechas y declarar cero menores", () => {
  const previous = { active: true, completed: false, startsOn: "2026-12-28", endsOn: "2027-01-03", adults: 3, children: 2 };
  const changed = mergeLodgingConversationState({ previous, message: "Mejor del 29/12 al 4/1, 2 adultos y 0 menores", now });
  assert.deepEqual({ startsOn: changed.startsOn, endsOn: changed.endsOn, adults: changed.adults, children: changed.children }, { startsOn: "2026-12-29", endsOn: "2027-01-04", adults: 2, children: 0 });
});

test("capacidad total reconoce personas sin exigir adultos y menores", () => {
  const state = mergeLodgingConversationState({ previous: null, message: "Necesito una cabaña para 4 personas del 29/12 al 4/1", now: new Date(2026, 9, 28) });
  assert.equal(state.totalGuests, 4);
  assert.deepEqual(state.unitOccupancies, [4]);
});

test("conserva una distribución explícita entre varias unidades", () => {
  const state = mergeLodgingConversationState({ previous: null, message: "Necesito dos cabañas, una para 4 personas y una para 3 personas del 29/12 al 4/1", now: new Date(2026, 9, 28) });
  assert.equal(state.totalGuests, 7);
  assert.deepEqual(state.unitOccupancies, [4, 3]);
});
