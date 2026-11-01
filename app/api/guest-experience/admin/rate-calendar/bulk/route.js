export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
  getGuestAdminAccess,
  guestAdminAccessResponse,
} from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { parseLodgingDateInput } from "@/app/modules/guest-experience/lib/lodgingReservationRules";

const optionalNumber = (value, minimum = 0) => {
  if (value === "" || value === null || value === undefined) return null;
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? Math.max(minimum, number) : null;
};

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const businessId = Number(body.businessId || 0);
  const guestAppId = Number(body.guestAppId || 0);
  let ratePlanId = Number(body.ratePlanId || 0);
  const startsAt = parseLodgingDateInput(body.startsOn);
  const endsAt = parseLodgingDateInput(body.endsOn);
  const name = cleanGuestText(body.name, 190) || `Tarifa ${String(body.startsOn || "").slice(0, 10)} a ${String(body.endsOn || "").slice(0, 10)}`;
  const unitRates = Array.isArray(body.unitRates) ? body.unitRates : [];
  const access = await getGuestAdminAccess({
    businessId,
    guestAppId,
    permission: "guest.settings.manage",
  });
  if (!access.allowed) return guestAdminAccessResponse(access);
  if (!startsAt || !endsAt || endsAt < startsAt || !unitRates.length) {
    return guestError("Seleccioná las fechas y al menos una unidad");
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (!ratePlanId) {
      const [apps] = await connection.query(
        "SELECT currency FROM tags_guest_apps WHERE id=? AND business_id=? LIMIT 1 FOR UPDATE",
        [guestAppId, businessId],
      );
      if (!apps[0]) {
        await connection.rollback();
        return guestError("Alojamiento no encontrado", 404);
      }
      await connection.query(
        `INSERT INTO tags_guest_rate_plans
          (guest_app_id,code,name,currency,pricing_mode,base_nightly_rate,is_default,is_active)
         VALUES (?,'standard','Tarifa estándar',?,'per_unit',0,1,1)
         ON DUPLICATE KEY UPDATE currency=VALUES(currency),is_default=1,is_active=1,updated_at=NOW()`,
        [guestAppId, apps[0].currency || "ARS"],
      );
      const [standardPlans] = await connection.query(
        "SELECT id FROM tags_guest_rate_plans WHERE guest_app_id=? AND code='standard' LIMIT 1 FOR UPDATE",
        [guestAppId],
      );
      ratePlanId = Number(standardPlans[0]?.id || 0);
    } else {
      const [plans] = await connection.query(
        "SELECT id FROM tags_guest_rate_plans WHERE id=? AND guest_app_id=? AND is_active=1 LIMIT 1 FOR UPDATE",
        [ratePlanId, guestAppId],
      );
      if (!plans[0]) {
        await connection.rollback();
        return guestError("Tarifa interna no encontrada", 404);
      }
    }
    const unitIds = [...new Set(unitRates.map((item) => Number(item.unitId || 0)).filter(Boolean))];
    const placeholders = unitIds.map(() => "?").join(",");
    const [units] = await connection.query(
      `SELECT id,name,capacity_adults,capacity_children
         FROM tags_guest_units
        WHERE guest_app_id=? AND is_active=1 AND id IN (${placeholders}) FOR UPDATE`,
      [guestAppId, ...unitIds],
    );
    if (units.length !== unitIds.length) {
      await connection.rollback();
      return guestError("Una de las unidades no pertenece al alojamiento");
    }
    const normalized = [];
    for (const item of unitRates) {
      const unit = units.find((candidate) => Number(candidate.id) === Number(item.unitId));
      const capacity = Math.max(1, Number(unit.capacity_adults || 0) + Number(unit.capacity_children || 0));
      const prices = (Array.isArray(item.prices) ? item.prices : []).map((price) => ({
        occupants: Math.trunc(Number(price.occupants || 0)),
        nightlyRate: Number(price.nightlyRate),
      }));
      for (let occupants = 1; occupants <= capacity; occupants += 1) {
        const price = prices.find((candidate) => candidate.occupants === occupants);
        if (!price || !Number.isFinite(price.nightlyRate) || price.nightlyRate <= 0) {
          await connection.rollback();
          return guestError(`Completá el precio de ${unit.name} para ${occupants} huésped${occupants === 1 ? "" : "es"}`);
        }
      }
      normalized.push({ unit, capacity, prices });
    }
    const minimumNights = optionalNumber(body.minimumNights, 1);
    const maximumNights = optionalNumber(body.maximumNights, 1);
    if (minimumNights && maximumNights && maximumNights < minimumNights) {
      await connection.rollback();
      return guestError("La estadía máxima no puede ser menor a la mínima");
    }
    const actorId = access.session?.id || access.session?.userId || null;
    const ruleIds = [];
    for (const item of normalized) {
      await connection.query(
        "UPDATE tags_guest_rate_plan_units SET is_primary=0 WHERE guest_app_id=? AND unit_id=?",
        [guestAppId, item.unit.id],
      );
      await connection.query(
        `INSERT INTO tags_guest_rate_plan_units
          (guest_app_id,rate_plan_id,unit_id,is_primary,is_active)
         VALUES (?,?,?,1,1)
         ON DUPLICATE KEY UPDATE is_primary=1,is_active=1,updated_at=NOW()`,
        [guestAppId, ratePlanId, item.unit.id],
      );
      const [created] = await connection.query(
        `INSERT INTO tags_guest_rate_rules
          (guest_app_id,rate_plan_id,unit_id,name,starts_on,ends_on,weekdays_mask,priority,
           is_open,closed_to_arrival,closed_to_departure,minimum_nights,maximum_nights,
           requires_manual_review,status,created_by_id,updated_by_id)
         VALUES (?,?,?,?,?,?,'1111111',?,?,?,?,?,?,?,'active',?,?)`,
        [
          guestAppId,
          ratePlanId,
          item.unit.id,
          name,
          body.startsOn,
          body.endsOn,
          Number(body.priority || 0),
          body.isOpen === false ? 0 : 1,
          body.closedToArrival === true ? 1 : 0,
          body.closedToDeparture === true ? 1 : 0,
          minimumNights,
          maximumNights,
          body.requiresManualReview === true ? 1 : 0,
          actorId,
          actorId,
        ],
      );
      ruleIds.push(created.insertId);
      for (let occupants = 1; occupants <= item.capacity; occupants += 1) {
        const price = item.prices.find((candidate) => candidate.occupants === occupants);
        await connection.query(
          "INSERT INTO tags_guest_rate_rule_occupancy_prices(guest_app_id,rate_rule_id,minimum_occupants,maximum_occupants,nightly_rate) VALUES (?,?,?,?,?)",
          [guestAppId, created.insertId, occupants, occupants, price.nightlyRate],
        );
      }
    }
    await connection.query(
      "INSERT INTO tags_guest_audit_log(guest_app_id,actor_type,actor_id,action,entity_type,metadata_json) VALUES (?,'owner',?,'rate_period.created','rate_rule',?)",
      [guestAppId, actorId, JSON.stringify({ name, ratePlanId, startsOn: body.startsOn, endsOn: body.endsOn, unitIds, ruleIds })],
    );
    await connection.commit();
    return Response.json({ ok: true, ruleIds }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error("GUEST RATE CALENDAR BULK ERROR", error);
    return guestError("No se pudieron guardar los precios y restricciones", 500);
  } finally {
    connection.release();
  }
}
