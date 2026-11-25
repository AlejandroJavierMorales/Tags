export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { guestError, parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { parseLodgingDateInput } from "@/app/modules/guest-experience/lib/lodgingReservationRules";
import { evaluateLodgingAvailability } from "@/app/modules/guest-experience/server/lodgingAvailabilityEvaluator";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0), unitId = Number(body.unitId || 0);
  const access = await getGuestAdminAccess({ businessId, guestAppId, permission: "guest.stays.manage" });
  if (!access.allowed) return guestAdminAccessResponse(access);
  const startsAt = parseLodgingDateInput(body.startsAt), endsAt = parseLodgingDateInput(body.endsAt);
  if (!unitId || !startsAt || !endsAt || endsAt <= startsAt) return guestError("Seleccioná unidad y un período válido");
  const [apps] = await db.query("SELECT * FROM tags_guest_apps WHERE id=? AND business_id=? LIMIT 1", [guestAppId, businessId]);
  const app = apps[0];
  if (!app) return guestError("Instancia no encontrada", 404);
  const availability = await evaluateLodgingAvailability(db, { app, settings: parseGuestJson(app.settings_json), startsAt, endsAt, adults: Math.max(1, Number(body.adults || 1)), children: Math.max(0, Number(body.children || 0)) });
  const unit = availability.units.find(item => Number(item.unitId) === unitId);
  if (!unit) return guestError("Unidad no encontrada", 404);
  const [unitRows] = await db.query("SELECT features_json FROM tags_guest_units WHERE id=? AND guest_app_id=? LIMIT 1", [unitId, guestAppId]);
  const publicUnitLabel = parseGuestJson(unitRows[0]?.features_json).publicCategory || `Alojamiento para ${Number(unit.capacity?.total || 1)} personas`;
  return Response.json({ ok: true, unit: { unitId, decision: unit.decision, reason: unit.reason || null, configured: Boolean(unit.pricing?.configured), currency: unit.pricing?.currency || app.currency || "ARS", nightlyRate: Number(unit.pricing?.averageNightlyRate || 0), total: Number(unit.pricing?.total || 0), ratePlanId: unit.ratePlan?.id || null, publicUnitLabel, pricingSnapshot: unit.pricing || null } });
}
