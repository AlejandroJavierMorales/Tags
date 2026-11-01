export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
  cleanGuestText,
  guestError,
  parseGuestJson,
} from "@/app/modules/guest-experience/lib/guestExperienceService";
import {
  normalizeGuestCounts,
  normalizeLodgingPolicy,
  parseLodgingDateInput,
  validateStayLength,
} from "@/app/modules/guest-experience/lib/lodgingReservationRules";
import { evaluateLodgingAvailability } from "@/app/modules/guest-experience/server/lodgingAvailabilityEvaluator";
import { createLodgingQuote } from "@/app/modules/guest-experience/server/lodgingQuoteService";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const slug = cleanGuestText(body.slug, 190);
  const unitId = Number(body.unitId || 0);
  const startsAt = parseLodgingDateInput(body.startsOn);
  const endsAt = parseLodgingDateInput(body.endsOn);
  const guests = normalizeGuestCounts(body);
  if (!slug || !unitId || !startsAt || !endsAt || endsAt <= startsAt) {
    return guestError("Unidad o fechas inválidas");
  }
  const [apps] = await db.query(
    "SELECT id,business_id,name,slug,currency,timezone,settings_json FROM tags_guest_apps WHERE BINARY slug=BINARY ? AND status='published' LIMIT 1",
    [slug],
  );
  const app = apps[0];
  if (!app) return guestError("El motor de reservas no está disponible", 404);
  const settings = parseGuestJson(app.settings_json);
  const policy = normalizeLodgingPolicy(settings.lodgingPolicy);
  const length = validateStayLength({ startsAt, endsAt, policy });
  if (!length.ok) return guestError(length.error, 409, length.code);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const availability = await evaluateLodgingAvailability(connection, {
      app,
      settings,
      startsAt,
      endsAt,
      ...guests,
    });
    const selected = availability.units.find((item) => Number(item.unitId) === unitId);
    if (!selected || ["unavailable", "alternative_suggested"].includes(selected.decision)) {
      await connection.rollback();
      return guestError(selected?.reason || "La unidad no está disponible", 409, "UNIT_NOT_AVAILABLE");
    }
    if (!selected.pricing?.configured) {
      await connection.rollback();
      return guestError("La unidad todavía no tiene una tarifa pública configurada", 409, "RATE_NOT_CONFIGURED");
    }
    const quote = await createLodgingQuote(connection, {
      app,
      selected,
      startsOn: body.startsOn,
      endsOn: body.endsOn,
      ...guests,
      bedOccupants:
        body.bedOccupants == null ? null : Math.max(0, Number(body.bedOccupants)),
    });
    await connection.commit();
    return Response.json({ ok: true, quote }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error("GUEST PUBLIC LODGING QUOTE ERROR", error);
    return guestError("No se pudo generar la cotización", 500);
  } finally {
    connection.release();
  }
}
