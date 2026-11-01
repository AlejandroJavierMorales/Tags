export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
  getGuestAdminAccess,
  guestAdminAccessResponse,
} from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { RATE_PRICING_MODE } from "@/app/modules/guest-experience/lib/lodgingRateRules";

function context(value) {
  return {
    businessId: Number(value.businessId || 0),
    guestAppId: Number(value.guestAppId || 0),
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
    const band = bands[index];
    if (band.maximum < band.minimum || !Number.isFinite(band.nightlyRate) || band.nightlyRate < 0) {
      return { error: "Revisá las bandas de ocupación y sus importes" };
    }
    if (index && band.minimum <= bands[index - 1].maximum) {
      return { error: "Las bandas de ocupación no pueden superponerse" };
    }
  }
  return { bands };
}

async function loadPlans(queryDb, guestAppId) {
  const [plans] = await queryDb.query(
    "SELECT * FROM tags_guest_rate_plans WHERE guest_app_id=? ORDER BY is_active DESC,is_default DESC,sort_order,name",
    [guestAppId],
  );
  const [units] = await queryDb.query(
    `SELECT pu.rate_plan_id,pu.unit_id,pu.is_primary,pu.is_active,u.name unit_name,u.code unit_code
       FROM tags_guest_rate_plan_units pu
       INNER JOIN tags_guest_units u ON u.id=pu.unit_id AND u.guest_app_id=pu.guest_app_id
      WHERE pu.guest_app_id=? ORDER BY u.sort_order,u.name`,
    [guestAppId],
  );
  const [prices] = await queryDb.query(
    "SELECT * FROM tags_guest_rate_occupancy_prices WHERE guest_app_id=? ORDER BY rate_plan_id,minimum_occupants,maximum_occupants",
    [guestAppId],
  );
  return plans.map((plan) => ({
    ...plan,
    units: units.filter((unit) => Number(unit.rate_plan_id) === Number(plan.id)),
    occupancyPrices: prices.filter((price) => Number(price.rate_plan_id) === Number(plan.id)),
  }));
}

export async function GET(req) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const ids = context(params);
  const access = await getGuestAdminAccess({ ...ids, permission: "guest.settings.manage" });
  if (!access.allowed) return guestAdminAccessResponse(access);
  return Response.json({ ok: true, plans: await loadPlans(db, ids.guestAppId) });
}

async function save(req, updating) {
  const body = await req.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const ids = context(body);
  const access = await getGuestAdminAccess({ ...ids, permission: "guest.settings.manage" });
  if (!access.allowed) return guestAdminAccessResponse(access);
  const id = Number(body.id || 0);
  if (updating && !id) return guestError("Plan tarifario inválido");
  const name = cleanGuestText(body.name, 190);
  const code = cleanGuestText(body.code, 80).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  const pricingMode = Object.values(RATE_PRICING_MODE).includes(body.pricingMode)
    ? body.pricingMode
    : RATE_PRICING_MODE.PER_UNIT;
  const baseRate = Number(body.baseNightlyRate || 0);
  const minimumNights = Math.max(1, Math.trunc(Number(body.minimumNights || 1)));
  const maximumNights = body.maximumNights ? Math.trunc(Number(body.maximumNights)) : null;
  const minimumAdvance = Math.max(0, Math.trunc(Number(body.minimumAdvanceDays || 0)));
  const maximumAdvance = body.maximumAdvanceDays
    ? Math.trunc(Number(body.maximumAdvanceDays))
    : null;
  const deposit = Math.max(0, Math.min(100, Number(body.depositPercentage || 0)));
  const unitIds = [...new Set((Array.isArray(body.unitIds) ? body.unitIds : []).map(Number).filter(Boolean))];
  const normalizedBands = normalizeBands(body.occupancyPrices);
  if (!name || !code) return guestError("Nombre y código son obligatorios");
  if (!Number.isFinite(baseRate) || baseRate < 0) return guestError("La tarifa base es inválida");
  if (maximumNights !== null && maximumNights < minimumNights) return guestError("La estadía máxima no puede ser menor a la mínima");
  if (maximumAdvance !== null && maximumAdvance < minimumAdvance) return guestError("La anticipación máxima no puede ser menor a la mínima");
  if (normalizedBands.error) return guestError(normalizedBands.error);
  if (pricingMode === RATE_PRICING_MODE.OCCUPANCY && !normalizedBands.bands.length) {
    return guestError("Definí al menos una banda de precio por ocupación");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (unitIds.length) {
      const placeholders = unitIds.map(() => "?").join(",");
      const [validUnits] = await connection.query(
        `SELECT id FROM tags_guest_units WHERE guest_app_id=? AND id IN (${placeholders}) AND is_active=1 FOR UPDATE`,
        [ids.guestAppId, ...unitIds],
      );
      if (validUnits.length !== unitIds.length) {
        await connection.rollback();
        return guestError("Una de las unidades no pertenece al alojamiento");
      }
    }
    const isDefault = body.isDefault === true ? 1 : 0;
    const isActive = body.isActive !== false ? 1 : 0;
    const actorId = access.session?.id || access.session?.userId || null;
    let planId = id;
    if (updating) {
      const [existing] = await connection.query(
        "SELECT id FROM tags_guest_rate_plans WHERE id=? AND guest_app_id=? LIMIT 1 FOR UPDATE",
        [id, ids.guestAppId],
      );
      if (!existing[0]) {
        await connection.rollback();
        return guestError("Plan tarifario no encontrado", 404);
      }
      await connection.query(
        `UPDATE tags_guest_rate_plans SET code=?,name=?,currency=?,pricing_mode=?,base_nightly_rate=?,
          minimum_nights=?,maximum_nights=?,minimum_advance_days=?,maximum_advance_days=?,
          deposit_percentage=?,is_default=?,is_active=?,sort_order=?,updated_by_id=? WHERE id=?`,
        [code, name, cleanGuestText(body.currency, 10) || "ARS", pricingMode, baseRate, minimumNights, maximumNights, minimumAdvance, maximumAdvance, deposit, isDefault, isActive, Number(body.sortOrder || 0), actorId, id],
      );
    } else {
      const [created] = await connection.query(
        `INSERT INTO tags_guest_rate_plans
          (guest_app_id,code,name,currency,pricing_mode,base_nightly_rate,minimum_nights,
           maximum_nights,minimum_advance_days,maximum_advance_days,deposit_percentage,
           is_default,is_active,sort_order,created_by_id,updated_by_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ids.guestAppId, code, name, cleanGuestText(body.currency, 10) || "ARS", pricingMode, baseRate, minimumNights, maximumNights, minimumAdvance, maximumAdvance, deposit, isDefault, isActive, Number(body.sortOrder || 0), actorId, actorId],
      );
      planId = created.insertId;
    }
    if (isDefault) await connection.query("UPDATE tags_guest_rate_plans SET is_default=IF(id=?,1,0) WHERE guest_app_id=?", [planId, ids.guestAppId]);
    await connection.query("DELETE FROM tags_guest_rate_plan_units WHERE rate_plan_id=? AND guest_app_id=?", [planId, ids.guestAppId]);
    for (const unitId of unitIds) {
      await connection.query(
        "UPDATE tags_guest_rate_plan_units SET is_primary=0 WHERE guest_app_id=? AND unit_id=?",
        [ids.guestAppId, unitId],
      );
      await connection.query(
        "INSERT INTO tags_guest_rate_plan_units(guest_app_id,rate_plan_id,unit_id,is_primary,is_active) VALUES (?,?,?,1,1)",
        [ids.guestAppId, planId, unitId],
      );
    }
    await connection.query("DELETE FROM tags_guest_rate_occupancy_prices WHERE rate_plan_id=? AND guest_app_id=?", [planId, ids.guestAppId]);
    for (const band of normalizedBands.bands) {
      await connection.query(
        "INSERT INTO tags_guest_rate_occupancy_prices(guest_app_id,rate_plan_id,minimum_occupants,maximum_occupants,nightly_rate,is_active) VALUES (?,?,?,?,?,1)",
        [ids.guestAppId, planId, band.minimum, band.maximum, band.nightlyRate],
      );
    }
    await connection.query(
      "INSERT INTO tags_guest_audit_log(guest_app_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,'owner',?,?,?,?,?)",
      [ids.guestAppId, actorId, updating ? "rate_plan.updated" : "rate_plan.created", "rate_plan", planId, JSON.stringify({ unitIds, pricingMode })],
    );
    await connection.commit();
    return Response.json({ ok: true, id: planId, plans: await loadPlans(db, ids.guestAppId) }, { status: updating ? 200 : 201 });
  } catch (error) {
    await connection.rollback();
    if (error?.code === "ER_DUP_ENTRY") return guestError("Ya existe un plan con ese código", 409);
    console.error("GUEST RATE PLAN SAVE ERROR", error);
    return guestError("No se pudo guardar el plan tarifario", 500);
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
