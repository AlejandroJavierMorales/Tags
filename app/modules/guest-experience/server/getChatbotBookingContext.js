import { db } from "@/app/lib/tags-db";
import { countLodgingNights, parseLodgingDateInput, resolveCapacityMode, LODGING_CAPACITY_MODE } from "../lib/lodgingReservationRules.js";
import { evaluateLodgingAvailability } from "./lodgingAvailabilityEvaluator.js";
import { evaluateLodgingGroupAvailability } from "./lodgingGroupAvailabilityEvaluator.js";
import { presentLodgingBookingResult } from "@/app/modules/ai-chat/server/lodgingBookingPresenter.mjs";

export async function resolveChatbotBookingFlow({ setup, intent }) {
  if (!setup || !intent?.bookingIntent) return null;
  const missing = [];
  const totalCapacityMode = resolveCapacityMode(setup.settings) === LODGING_CAPACITY_MODE.TOTAL_OCCUPANCY;
  if (!intent.startsOn) missing.push("fecha de ingreso");
  if (!intent.endsOn) missing.push("fecha de egreso");
  if (totalCapacityMode && !Number(intent.totalGuests || intent.adults || 0)) missing.push("cantidad de huéspedes");
  if (!totalCapacityMode && !Number(intent.adults || 0)) missing.push("cantidad de adultos");
  if (missing.length) {
    const labels = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} y ${missing.at(-1)}`;
    return { answer: `Para consultar disponibilidad me falta ${labels}.`, context: `Faltan estos datos de la reserva: ${missing.join(", ")}.`, action: null };
  }
  const startsAt = parseLodgingDateInput(intent.startsOn), endsAt = parseLodgingDateInput(intent.endsOn);
  if (!startsAt || !endsAt || endsAt <= startsAt) return { answer: "Las fechas no forman un período válido. Indicame nuevamente la fecha de ingreso y la de egreso.", context: "Las fechas de la búsqueda son inválidas.", action: null };

  const adults = totalCapacityMode ? Math.max(1, Number(intent.totalGuests || intent.adults)) : Math.max(1, Number(intent.adults));
  const children = totalCapacityMode ? 0 : Math.max(0, Number(intent.children || 0));
  const availability = await evaluateLodgingAvailability(db, { app: setup.app, settings: setup.settings, startsAt, endsAt, adults, children });
  const actionable = availability.units.filter(item => !["unavailable", "alternative_suggested"].includes(item.decision) && item.pricing?.configured);
  const requested = adults + children;
  const maxCapacity = availability.units.reduce((maximum, item) => Math.max(maximum, Number(item.capacity?.total || 0)), 0);
  let groups = [];
  const explicitDistribution = Array.isArray(intent.unitOccupancies) && intent.unitOccupancies.length > 1 ? intent.unitOccupancies : [];
  if (setup.settings.groupBookingEnabled !== false && (explicitDistribution.length || (!actionable.length && (requested > maxCapacity || setup.settings.groupSuggestionMode === "when_no_single_available")))) groups = await evaluateLodgingGroupAvailability(db, { app: setup.app, settings: setup.settings, startsAt, endsAt, adults, children, requestedUnitOccupancies: explicitDistribution, maximumOptions: setup.settings.groupMaximumOptions || 3 });
  const nights = countLodgingNights(startsAt, endsAt);
  return presentLodgingBookingResult({ setup, intent: { ...intent, adults, children, totalCapacityMode }, actionable: explicitDistribution.length ? [] : actionable, groups, nights });
}
