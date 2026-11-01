import test from "node:test";
import assert from "node:assert/strict";
import { presentLodgingBookingResult } from "../app/modules/ai-chat/server/lodgingBookingPresenter.mjs";

const setup = { bookingPath: "/ecos-del-valle/reservar" };
const intent = { startsOn: "2026-12-28", endsOn: "2027-01-03", adults: 3, children: 2 };

test("presenta precio verificado y enlace completamente precargado", () => {
  const result = presentLodgingBookingResult({ setup, intent, nights: 6, actionable: [{ name: "Cabaña para 5 personas", pricing: { total: 600000, averageNightlyRate: 100000, currency: "ARS" }, ratePlan: { depositPercentage: 35 } }] });
  assert.match(result.answer, /total \$ 600\.000/);
  assert.match(result.answer, /\$ 100\.000 por noche/);
  assert.match(result.answer, /Reserva 35%: \$ 210\.000/);
  assert.equal(result.action.href, "/ecos-del-valle/reservar?desde=2026-12-28&hasta=2027-01-03&adultos=3&menores=2");
  assert.doesNotMatch(result.answer, /WhatsApp|llam/i);
});

test("presenta combinaciones sin inventar una unidad individual", () => {
  const result = presentLodgingBookingResult({ setup, intent: { ...intent, adults: 10, children: 2 }, nights: 6, groups: [{ units: [{ name: "Cabaña 1" }, { name: "Cabaña 2" }, { name: "Cabaña 3" }], total: 900000, currency: "ARS", depositPercentage: 35, depositRequiredAmount: 315000 }] });
  assert.match(result.answer, /Cabaña 1 \+ Cabaña 2 \+ Cabaña 3/);
  assert.match(result.answer, /Total \$ 900\.000/);
});

test("sin disponibilidad informa el resultado real y conserva la búsqueda", () => {
  const result = presentLodgingBookingResult({ setup, intent, nights: 6 });
  assert.match(result.answer, /No encontré unidades disponibles/);
  assert.ok(result.action.href.includes("adultos=3"));
  assert.doesNotMatch(result.answer, /consultar por WhatsApp|llamar/i);
});
