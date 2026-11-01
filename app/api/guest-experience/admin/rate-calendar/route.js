export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
  getGuestAdminAccess,
  guestAdminAccessResponse,
} from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";
import {
  INVENTORY_RELEASED_STATUSES,
  parseLodgingDateInput,
} from "@/app/modules/guest-experience/lib/lodgingReservationRules";
import {
  enumerateLodgingNights,
  lodgingDate,
  lodgingDateKey,
} from "@/app/modules/guest-experience/lib/lodgingRateRules";
import {
  evaluateUnitRateRestrictions,
  loadLodgingRateContext,
} from "@/app/modules/guest-experience/server/lodgingRateService";

function nextDate(value) {
  const date = lodgingDate(value);
  date.setDate(date.getDate() + 1);
  return lodgingDateKey(date);
}

function overlaps(item, date, following) {
  return lodgingDateKey(item.starts_at) < following && lodgingDateKey(item.ends_at) > date;
}

export async function GET(req) {
  const params = new URL(req.url).searchParams;
  const businessId = Number(params.get("businessId") || 0);
  const guestAppId = Number(params.get("guestAppId") || 0);
  const from = params.get("from");
  const to = params.get("to");
  const occupants = Math.max(1, Math.min(30, Math.trunc(Number(params.get("occupants") || 2))));
  const startsAt = parseLodgingDateInput(from);
  const endsAt = parseLodgingDateInput(to);
  if (!startsAt || !endsAt || endsAt <= startsAt) return guestError("Rango de fechas inválido");
  const dates = enumerateLodgingNights(from, to);
  if (dates.length > 120) return guestError("El calendario admite hasta 120 días por consulta");
  const access = await getGuestAdminAccess({ businessId, guestAppId, permission: "guest.stays.view" });
  if (!access.allowed) return guestAdminAccessResponse(access);

  const [units] = await db.query(
    "SELECT id,code,name,capacity_adults,capacity_children,sort_order FROM tags_guest_units WHERE guest_app_id=? AND is_active=1 ORDER BY sort_order,name",
    [guestAppId],
  );
  const released = INVENTORY_RELEASED_STATUSES.map(() => "?").join(",");
  const [stays] = await db.query(
    `SELECT id,unit_id,stay_code,status,starts_at,ends_at FROM tags_guest_stays
      WHERE guest_app_id=? AND status NOT IN (${released}) AND starts_at<? AND ends_at>?`,
    [guestAppId, ...INVENTORY_RELEASED_STATUSES, endsAt, startsAt],
  );
  const [blocks] = await db.query(
    "SELECT id,scope_type,unit_id,block_type,reason,starts_on starts_at,ends_on ends_at FROM tags_guest_unit_blocks WHERE guest_app_id=? AND status='active' AND starts_on<? AND ends_on>?",
    [guestAppId, endsAt, startsAt],
  );
  const [holds] = await db.query(
    `SELECT r.id,r.unit_id,r.request_code,r.starts_on starts_at,r.ends_on ends_at FROM tags_guest_booking_requests r
      WHERE r.guest_app_id=? AND r.status IN ('held','pending_payment') AND r.hold_expires_at>NOW() AND r.starts_on<? AND r.ends_on>?
     UNION ALL
     SELECT r.id,ru.unit_id,r.request_code,r.starts_on starts_at,r.ends_on ends_at
       FROM tags_guest_booking_request_units ru INNER JOIN tags_guest_booking_requests r ON r.id=ru.request_id AND r.guest_app_id=ru.guest_app_id
      WHERE ru.guest_app_id=? AND ru.status='held' AND r.status IN ('held','pending_payment') AND r.hold_expires_at>NOW() AND r.starts_on<? AND r.ends_on>?`,
    [guestAppId, endsAt, startsAt, guestAppId, endsAt, startsAt],
  );
  const rateContext = await loadLodgingRateContext(db, {
    guestAppId,
    startsOn: from,
    endsOn: to,
  });
  const calendarUnits = units.map((unit) => ({
    ...unit,
    cells: dates.map((date) => {
      const following = nextDate(date);
      const stay = stays.find((item) => Number(item.unit_id) === Number(unit.id) && overlaps(item, date, following));
      const block = blocks.find(
        (item) =>
          (item.scope_type === "property" || Number(item.unit_id) === Number(unit.id)) &&
          overlaps(item, date, following),
      );
      const hold = holds.find((item) => Number(item.unit_id) === Number(unit.id) && overlaps(item, date, following));
      const rate = evaluateUnitRateRestrictions(rateContext, {
        unitId: unit.id,
        startsOn: date,
        endsOn: following,
        occupants,
      });
      return {
        date,
        inventory: stay
          ? { status: "occupied", id: stay.id, code: stay.stay_code }
          : block
            ? { status: "blocked", id: block.id, reason: block.reason }
            : hold
              ? { status: "held", id: hold.id, code: hold.request_code }
              : { status: "free" },
        ratePlan: rate.ratePlan
          ? { id: Number(rate.ratePlan.id), name: rate.ratePlan.name, code: rate.ratePlan.code }
          : null,
        restriction: rate.restrictions.configured
          ? {
              isOpen: rate.restrictions.days[0]?.is_open !== false,
              closedToArrival: rate.restrictions.arrival?.closed_to_arrival === true,
              closedToDeparture: rate.restrictions.departure?.closed_to_departure === true,
              minimumNights: rate.restrictions.minimumNights,
              maximumNights: rate.restrictions.maximumNights,
              requiresManualReview: rate.restrictions.requiresManualReview,
              appliedRuleIds: rate.restrictions.appliedRuleIds,
            }
          : null,
        price: rate.pricing.configured
          ? {
              currency: rate.pricing.currency,
              nightlyRate: rate.pricing.days[0]?.nightlyRate || 0,
              source: rate.pricing.days[0]?.source || null,
            }
          : null,
      };
    }),
  }));
  return Response.json({ ok: true, from, to, occupants, dates, units: calendarUnits });
}
