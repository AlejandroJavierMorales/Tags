import test from "node:test";
import assert from "node:assert/strict";
import { parseLodgingBookingSearchParams } from "../app/modules/guest-experience/lib/parseLodgingBookingSearchParams.mjs";
import { resolveBusinessChatCapabilities } from "../app/modules/ai-chat/server/businessChatCapabilities.mjs";

test("un comercio sin Guest Experience nunca recibe herramientas de alojamiento", () => {
  const result = resolveBusinessChatCapabilities({ addonCodes: ["store", "client_reviews"] });
  assert.equal(result.businessKnowledge, true);
  assert.equal(result.lodgingReservations, null);
});

test("la reserva requiere addon activo, aplicación publicada y conexión habilitada", () => {
  const base = { id: 7, slug: "ecos", status: "published", settings_json: "{}" };
  assert.equal(resolveBusinessChatCapabilities({ addonCodes: [], guestApp: base }).lodgingReservations, null);
  assert.equal(resolveBusinessChatCapabilities({ addonCodes: ["guest_experience"], guestApp: { ...base, status: "draft" } }).lodgingReservations, null);
  assert.equal(resolveBusinessChatCapabilities({ addonCodes: ["guest_experience"], guestApp: { ...base, settings_json: '{"connectBookingToChatbot":false}' } }).lodgingReservations, null);
  const active = resolveBusinessChatCapabilities({ addonCodes: ["guest_experience"], guestApp: base, listingSlug: "ecos-del-valle" }).lodgingReservations;
  assert.equal(active.bookingPath, "/ecos-del-valle/reservar");
});

test("el enlace válido precarga exactamente la búsqueda", () => {
  assert.deepEqual(parseLodgingBookingSearchParams("?desde=2026-12-28&hasta=2027-01-03&adultos=3&menores=2"), { startsOn: "2026-12-28", endsOn: "2027-01-03", adults: 3, children: 2, couponCode: "", unitOccupancies: [] });
});
test("el enlace conserva una distribución explícita entre unidades", () => {
  assert.deepEqual(parseLodgingBookingSearchParams("?desde=2026-12-28&hasta=2027-01-03&adultos=7&menores=0&distribucion=4,3").unitOccupancies, [4,3]);
});
test("rechaza enlaces incompletos, períodos inversos y huéspedes inválidos", () => {
  assert.equal(parseLodgingBookingSearchParams("?desde=2026-12-28&adultos=3"), null);
  assert.equal(parseLodgingBookingSearchParams("?desde=2027-01-03&hasta=2026-12-28&adultos=3"), null);
  assert.equal(parseLodgingBookingSearchParams("?desde=2026-12-28&hasta=2027-01-03&adultos=0"), null);
});
