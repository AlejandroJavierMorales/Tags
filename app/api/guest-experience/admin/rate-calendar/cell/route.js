export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
  getGuestAdminAccess,
  guestAdminAccessResponse,
} from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { parseLodgingDateInput } from "@/app/modules/guest-experience/lib/lodgingReservationRules";
import { lodgingDateKey } from "@/app/modules/guest-experience/lib/lodgingRateRules";
import {
  evaluateUnitRateRestrictions,
  loadLodgingRateContext,
} from "@/app/modules/guest-experience/server/lodgingRateService";

function followingDate(value) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return lodgingDateKey(date);
}

export async function GET(req) {
  const params = new URL(req.url).searchParams;
  const businessId = Number(params.get("businessId") || 0);
  const guestAppId = Number(params.get("guestAppId") || 0);
  const unitId = Number(params.get("unitId") || 0);
  const date = params.get("date");
  const parsedDate = parseLodgingDateInput(date);
  const access = await getGuestAdminAccess({
    businessId,
    guestAppId,
    permission: "guest.settings.manage",
  });
  if (!access.allowed) return guestAdminAccessResponse(access);
  if (!unitId || !parsedDate) return guestError("Unidad o fecha inválida");

  const [units] = await db.query(
    `SELECT id,name,capacity_adults,capacity_children
       FROM tags_guest_units
      WHERE id=? AND guest_app_id=? AND is_active=1
      LIMIT 1`,
    [unitId, guestAppId],
  );
  const unit = units[0];
  if (!unit) return guestError("Unidad no encontrada", 404);

  const capacity = Math.max(
    1,
    Number(unit.capacity_adults || 0) + Number(unit.capacity_children || 0),
  );
  const nextDate = followingDate(date);
  const context = await loadLodgingRateContext(db, {
    guestAppId,
    startsOn: date,
    endsOn: nextDate,
  });
  const evaluations = Array.from({ length: capacity }, (_, index) =>
    evaluateUnitRateRestrictions(context, {
      unitId,
      startsOn: date,
      endsOn: nextDate,
      occupants: index + 1,
    }),
  );
  const reference = evaluations.find((item) => item.ratePlan) || evaluations[0];
  const restriction = reference?.restrictions?.days?.[0] || {};

  return Response.json({
    ok: true,
    cell: {
      name: `Ajuste ${unit.name} ${date}`,
      startsOn: date,
      endsOn: date,
      minimumNights: restriction.minimum_nights ?? "",
      maximumNights: restriction.maximum_nights ?? "",
      isOpen: restriction.is_open !== false,
      closedToArrival: restriction.closed_to_arrival === true,
      closedToDeparture: restriction.closed_to_departure === true,
      requiresManualReview: restriction.requires_manual_review === true,
      unitRates: [
        {
          unitId: Number(unit.id),
          unitName: unit.name,
          capacity,
          prices: evaluations.map((evaluation, index) => ({
            occupants: index + 1,
            nightlyRate: evaluation.pricing?.configured
              ? evaluation.pricing.days[0]?.nightlyRate || ""
              : "",
          })),
        },
      ],
    },
  });
}
