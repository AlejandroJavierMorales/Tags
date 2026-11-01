export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
  getGuestAdminAccess,
  guestAdminAccessResponse,
} from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { parseLodgingDateInput } from "@/app/modules/guest-experience/lib/lodgingReservationRules";

const ADJUSTMENTS = ["fixed", "amount_delta", "percentage_delta"];
const nullableBoolean = (value) =>
  value === null || value === undefined || value === "" ? null : value === true || Number(value) === 1 ? 1 : 0;
const nullableUnsigned = (value, minimum = 0) =>
  value === null || value === undefined || value === ""
    ? null
    : Math.max(minimum, Math.trunc(Number(value)));

function ids(source) {
  return {
    businessId: Number(source.businessId || 0),
    guestAppId: Number(source.guestAppId || 0),
  };
}

function normalizeBands(value) {
  const bands = (Array.isArray(value) ? value : [])
    .map((item) => ({
      minimum: Math.max(1, Math.trunc(Number(item.minimumOccupants || 0))),
      maximum: Math.max(1, Math.trunc(Number(item.maximumOccupants || 0))),
      nightlyRate: Number(item.nightlyRate),
    }))
    .sort((left, right) => left.minimum - right.minimum || left.maximum - right.maximum);
  for (let index = 0; index < bands.length; index += 1) {
    if (
      bands[index].maximum < bands[index].minimum ||
      !Number.isFinite(bands[index].nightlyRate) ||
      bands[index].nightlyRate < 0 ||
      (index && bands[index].minimum <= bands[index - 1].maximum)
    ) {
      return { error: "Las bandas de ocupación son inválidas o se superponen" };
    }
  }
  return { bands };
}

async function loadRules(queryDb, guestAppId, from = null, to = null) {
  const params = [guestAppId];
  let range = "";
  if (from && to) {
    range = " AND r.starts_on<=? AND r.ends_on>=?";
    params.push(to, from);
  }
  const [rules] = await queryDb.query(
    `SELECT r.*,p.name rate_plan_name,u.name unit_name
       FROM tags_guest_rate_rules r
       LEFT JOIN tags_guest_rate_plans p ON p.id=r.rate_plan_id AND p.guest_app_id=r.guest_app_id
       LEFT JOIN tags_guest_units u ON u.id=r.unit_id AND u.guest_app_id=r.guest_app_id
      WHERE r.guest_app_id=?${range}
      ORDER BY r.status='active' DESC,r.starts_on,r.priority DESC,r.name`,
    params,
  );
  const [prices] = await queryDb.query(
    "SELECT * FROM tags_guest_rate_rule_occupancy_prices WHERE guest_app_id=? ORDER BY rate_rule_id,minimum_occupants,maximum_occupants",
    [guestAppId],
  );
  return rules.map((rule) => ({
    ...rule,
    occupancyPrices: prices.filter((price) => Number(price.rate_rule_id) === Number(rule.id)),
  }));
}

export async function GET(req) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const context = ids(params);
  const access = await getGuestAdminAccess({ ...context, permission: "guest.settings.manage" });
  if (!access.allowed) return guestAdminAccessResponse(access);
  return Response.json({
    ok: true,
    rules: await loadRules(db, context.guestAppId, params.from || null, params.to || null),
  });
}

async function save(req, updating) {
  const body = await req.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const context = ids(body);
  const access = await getGuestAdminAccess({ ...context, permission: "guest.settings.manage" });
  if (!access.allowed) return guestAdminAccessResponse(access);
  const id = Number(body.id || 0);
  const ratePlanId = body.ratePlanId ? Number(body.ratePlanId) : null;
  const unitId = body.unitId ? Number(body.unitId) : null;
  const name = cleanGuestText(body.name, 190);
  const startsAt = parseLodgingDateInput(body.startsOn);
  const endsAt = parseLodgingDateInput(body.endsOn);
  const weekdaysMask = /^[01]{7}$/.test(String(body.weekdaysMask || ""))
    ? String(body.weekdaysMask)
    : "1111111";
  const adjustmentType = ADJUSTMENTS.includes(body.priceAdjustmentType)
    ? body.priceAdjustmentType
    : null;
  const adjustmentValue = adjustmentType ? Number(body.priceAdjustmentValue) : null;
  const minimumNights = nullableUnsigned(body.minimumNights, 1);
  const maximumNights = nullableUnsigned(body.maximumNights, 1);
  const minimumAdvance = nullableUnsigned(body.minimumAdvanceDays, 0);
  const maximumAdvance = nullableUnsigned(body.maximumAdvanceDays, 0);
  const bands = normalizeBands(body.occupancyPrices);
  if (updating && !id) return guestError("Regla inválida");
  if (!name || !startsAt || !endsAt || endsAt < startsAt) return guestError("Nombre y rango de fechas son obligatorios");
  if (adjustmentType && !Number.isFinite(adjustmentValue)) return guestError("El ajuste de precio es inválido");
  if (minimumNights && maximumNights && maximumNights < minimumNights) return guestError("La estadía máxima no puede ser menor a la mínima");
  if (minimumAdvance !== null && maximumAdvance !== null && maximumAdvance < minimumAdvance) return guestError("La anticipación máxima no puede ser menor a la mínima");
  if (bands.error) return guestError(bands.error);
  if ((adjustmentType || bands.bands.length) && !ratePlanId) return guestError("Los cambios de precio requieren seleccionar un plan tarifario");

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (ratePlanId) {
      const [plans] = await connection.query("SELECT id FROM tags_guest_rate_plans WHERE id=? AND guest_app_id=? LIMIT 1 FOR UPDATE", [ratePlanId, context.guestAppId]);
      if (!plans[0]) {
        await connection.rollback();
        return guestError("Plan tarifario no encontrado", 404);
      }
    }
    if (unitId) {
      const [units] = await connection.query("SELECT id FROM tags_guest_units WHERE id=? AND guest_app_id=? LIMIT 1 FOR UPDATE", [unitId, context.guestAppId]);
      if (!units[0]) {
        await connection.rollback();
        return guestError("Unidad no encontrada", 404);
      }
    }
    const actorId = access.session?.id || access.session?.userId || null;
    const values = [
      ratePlanId,
      unitId,
      name,
      body.startsOn,
      body.endsOn,
      weekdaysMask,
      Number(body.priority || 0),
      adjustmentType,
      adjustmentValue,
      nullableBoolean(body.isOpen),
      nullableBoolean(body.closedToArrival),
      nullableBoolean(body.closedToDeparture),
      minimumNights,
      maximumNights,
      minimumAdvance,
      maximumAdvance,
      cleanGuestText(body.gapPolicyMode, 40) || null,
      nullableBoolean(body.requiresManualReview),
      body.isActive === false ? "inactive" : "active",
      actorId,
    ];
    let ruleId = id;
    if (updating) {
      const [existing] = await connection.query("SELECT id FROM tags_guest_rate_rules WHERE id=? AND guest_app_id=? LIMIT 1 FOR UPDATE", [id, context.guestAppId]);
      if (!existing[0]) {
        await connection.rollback();
        return guestError("Regla no encontrada", 404);
      }
      await connection.query(
        `UPDATE tags_guest_rate_rules SET rate_plan_id=?,unit_id=?,name=?,starts_on=?,ends_on=?,
          weekdays_mask=?,priority=?,price_adjustment_type=?,price_adjustment_value=?,is_open=?,
          closed_to_arrival=?,closed_to_departure=?,minimum_nights=?,maximum_nights=?,
          minimum_advance_days=?,maximum_advance_days=?,gap_policy_mode=?,requires_manual_review=?,
          status=?,updated_by_id=? WHERE id=?`,
        [...values, id],
      );
    } else {
      const [created] = await connection.query(
        `INSERT INTO tags_guest_rate_rules
          (guest_app_id,rate_plan_id,unit_id,name,starts_on,ends_on,weekdays_mask,priority,
           price_adjustment_type,price_adjustment_value,is_open,closed_to_arrival,
           closed_to_departure,minimum_nights,maximum_nights,minimum_advance_days,
           maximum_advance_days,gap_policy_mode,requires_manual_review,status,created_by_id,updated_by_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [context.guestAppId, ...values.slice(0, -1), actorId, actorId],
      );
      ruleId = created.insertId;
    }
    await connection.query("DELETE FROM tags_guest_rate_rule_occupancy_prices WHERE guest_app_id=? AND rate_rule_id=?", [context.guestAppId, ruleId]);
    for (const band of bands.bands) {
      await connection.query(
        "INSERT INTO tags_guest_rate_rule_occupancy_prices(guest_app_id,rate_rule_id,minimum_occupants,maximum_occupants,nightly_rate) VALUES (?,?,?,?,?)",
        [context.guestAppId, ruleId, band.minimum, band.maximum, band.nightlyRate],
      );
    }
    await connection.query(
      "INSERT INTO tags_guest_audit_log(guest_app_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,'owner',?,?,?,?,?)",
      [context.guestAppId, actorId, updating ? "rate_rule.updated" : "rate_rule.created", "rate_rule", ruleId, JSON.stringify({ ratePlanId, unitId, startsOn: body.startsOn, endsOn: body.endsOn })],
    );
    await connection.commit();
    return Response.json({ ok: true, id: ruleId }, { status: updating ? 200 : 201 });
  } catch (error) {
    await connection.rollback();
    console.error("GUEST RATE RULE SAVE ERROR", error);
    return guestError("No se pudo guardar la regla", 500);
  } finally {
    connection.release();
  }
}

export function POST(req) {
  return save(req, false);
}

export function PATCH(req) {
  return save(req, true);
}

export async function DELETE(req) {
  const body = await req.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const context = ids(body);
  const access = await getGuestAdminAccess({ ...context, permission: "guest.settings.manage" });
  if (!access.allowed) return guestAdminAccessResponse(access);
  const ruleIds = [...new Set(
    (Array.isArray(body.ids) ? body.ids : [body.id]).map(Number).filter((id) => id > 0),
  )];
  if (!ruleIds.length) return guestError("Regla no encontrada", 404);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const placeholders = ruleIds.map(() => "?").join(",");
    const [result] = await connection.query(
      `UPDATE tags_guest_rate_rules
          SET status='inactive',updated_by_id=?,updated_at=NOW()
        WHERE guest_app_id=? AND id IN (${placeholders})`,
      [access.session?.id || access.session?.userId || null, context.guestAppId, ...ruleIds],
    );
    if (result.affectedRows !== ruleIds.length) {
      await connection.rollback();
      return guestError("Una de las reglas no fue encontrada", 404);
    }
    await connection.query(
      "INSERT INTO tags_guest_audit_log(guest_app_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,'owner',?,'rate_rule.disabled','rate_rule',?,?)",
      [context.guestAppId, access.session?.id || access.session?.userId || null, ruleIds[0], JSON.stringify({ ruleIds })],
    );
    await connection.commit();
    return Response.json({ ok: true, disabled: ruleIds.length });
  } catch (error) {
    await connection.rollback();
    console.error("GUEST RATE RULE DELETE ERROR", error);
    return guestError("No se pudo desactivar el período", 500);
  } finally {
    connection.release();
  }
}
