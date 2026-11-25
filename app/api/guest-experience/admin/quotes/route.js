export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, createGuestToken, guestError, hashGuestToken, parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { countLodgingNights, parseLodgingDateInput } from "@/app/modules/guest-experience/lib/lodgingReservationRules";

const safePrefix = value => String(value || "PRES").toUpperCase().replace(/[^A-Z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "PRES";

export async function GET(req) {
  const params = new URL(req.url).searchParams;
  const businessId = Number(params.get("businessId") || 0), guestAppId = Number(params.get("guestAppId") || 0);
  const access = await getGuestAdminAccess({ businessId, guestAppId, permission: "guest.stays.view" });
  if (!access.allowed) return guestAdminAccessResponse(access);
  const search = String(params.get("search") || "").trim(), status = String(params.get("status") || "all");
  const values = [guestAppId], conditions = ["q.guest_app_id=?", "q.source='manual_admin'"];
  if (status !== "all") { conditions.push("q.status=?"); values.push(status); }
  if (search) { const term = `%${search}%`; conditions.push("(q.quote_code LIKE ? OR q.customer_name LIKE ? OR q.customer_email LIKE ? OR q.customer_phone LIKE ?)"); values.push(term, term, term, term); }
  const [rows] = await db.query(`SELECT q.*,u.name unit_name FROM tags_guest_lodging_quotes q INNER JOIN tags_guest_units u ON u.id=q.unit_id AND u.guest_app_id=q.guest_app_id WHERE ${conditions.join(" AND ")} ORDER BY q.created_at DESC,q.id DESC LIMIT 300`, values);
  return Response.json({ ok: true, items: rows.map(item => ({ ...item, pricing_snapshot: parseGuestJson(item.pricing_snapshot_json), content_snapshot: parseGuestJson(item.content_snapshot_json) })) });
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0), unitId = Number(body.unitId || 0);
  const access = await getGuestAdminAccess({ businessId, guestAppId, permission: "guest.stays.manage" });
  if (!access.allowed) return guestAdminAccessResponse(access);
  const startsAt = parseLodgingDateInput(body.startsAt), endsAt = parseLodgingDateInput(body.endsAt);
  const customerName = cleanGuestText(body.customerName, 190), email = cleanGuestText(body.customerEmail, 190)?.toLowerCase(), phone = cleanGuestText(body.customerPhone, 60);
  if (!unitId || !startsAt || !endsAt || endsAt <= startsAt || !customerName || (!email && !phone)) return guestError("Completá cliente, contacto, unidad y fechas");
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [apps] = await connection.query("SELECT * FROM tags_guest_apps WHERE id=? AND business_id=? LIMIT 1 FOR UPDATE", [guestAppId, businessId]);
    const app = apps[0]; if (!app) { await connection.rollback(); return guestError("Instancia no encontrada", 404); }
    const [units] = await connection.query("SELECT * FROM tags_guest_units WHERE id=? AND guest_app_id=? AND is_active=1 LIMIT 1", [unitId, guestAppId]);
    if (!units[0]) { await connection.rollback(); return guestError("Unidad inválida", 404); }
    const settings = parseGuestJson(app.settings_json), year = startsAt.getFullYear(), prefix = safePrefix(settings.quoteCodePrefix || "PRES");
    await connection.query("INSERT INTO tags_guest_lodging_quote_sequences(guest_app_id,sequence_year,last_number) VALUES (?,?,0) ON DUPLICATE KEY UPDATE last_number=last_number", [guestAppId, year]);
    const [sequences] = await connection.query("SELECT last_number FROM tags_guest_lodging_quote_sequences WHERE guest_app_id=? AND sequence_year=? FOR UPDATE", [guestAppId, year]);
    const next = Number(sequences[0]?.last_number || 0) + 1;
    if (next > 9999) { await connection.rollback(); return guestError(`Se agotó la numeración de presupuestos para ${year}`, 409); }
    await connection.query("UPDATE tags_guest_lodging_quote_sequences SET last_number=? WHERE guest_app_id=? AND sequence_year=?", [next, guestAppId, year]);
    const quoteCode = `${prefix}-${year}-${String(next).padStart(4, "0")}`, nights = countLodgingNights(startsAt, endsAt);
    const total = Math.max(0, Number(body.totalAmount || 0)), nightly = Math.max(0, Number(body.nightlyRate || (nights ? total / nights : 0))), depositPercentage = Math.max(0, Math.min(100, Number(body.depositPercentage ?? settings.depositPercentage ?? 0))), deposit = Number((total * depositPercentage / 100).toFixed(2));
    const validityDays = Math.max(1, Math.min(365, Number(settings.quoteValidityDays || 7))), token = createGuestToken(), actorId = access.session?.id || access.session?.userId || null;
    const calculated = body.calculatedPricing && typeof body.calculatedPricing === "object" ? body.calculatedPricing : null;
    const pricingSnapshot = { version: 2, source: calculated ? "rate_calendar" : "manual", manuallyOverridden: calculated ? Math.abs(Number(calculated.total || 0) - total) > 0.009 : true, calculated, nightlyRate: nightly, lodgingTotal: total, depositPercentage, depositRequiredAmount: deposit };
    const features = parseGuestJson(units[0].features_json), publicLabel = cleanGuestText(body.publicUnitLabel, 190) || features.publicCategory || `Alojamiento para ${Number(units[0].capacity_adults || 0) + Number(units[0].capacity_children || 0)} personas`;
    const contentSnapshot = { bookingBudgetDetails: settings.bookingBudgetDetails || "", sections: Array.isArray(settings.bookingQuoteSections) ? settings.bookingQuoteSections.filter(item => item?.enabled !== false) : [], assignmentNotice: "La unidad definitiva será asignada al organizar la grilla de ocupación. Siempre tendrá la capacidad, características y equipamiento correspondientes a la categoría presupuestada." };
    const [created] = await connection.query(`INSERT INTO tags_guest_lodging_quotes (guest_app_id,unit_id,rate_plan_id,quote_code,access_token_hash,status,availability_decision,starts_on,ends_on,nights,adults,children,bed_occupants,chargeable_occupants,customer_name,customer_email,customer_phone,customer_notes,public_unit_label,currency,lodging_subtotal,extras_total,discounts_total,total_amount,deposit_percentage,deposit_required_amount,pricing_snapshot_json,applied_rules_json,expires_at,source,content_snapshot_json,created_by_id) VALUES (?,?,?,?,?,'active',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL ? DAY),'manual_admin',?,?)`, [guestAppId,unitId,body.ratePlanId||null,quoteCode,hashGuestToken(token),body.availabilityDecision||"available",startsAt,endsAt,nights,Math.max(1,Number(body.adults||1)),Math.max(0,Number(body.children||0)),body.bedOccupants==null?null:Math.max(0,Number(body.bedOccupants)),Math.max(1,Number(body.adults||1)+Number(body.children||0)),customerName,email||null,phone||null,cleanGuestText(body.customerNotes,2000)||null,publicLabel,body.currency||app.currency||"ARS",total,total,depositPercentage,deposit,JSON.stringify(pricingSnapshot),JSON.stringify({}),validityDays,JSON.stringify(contentSnapshot),actorId]);
    await connection.query("INSERT INTO tags_guest_lodging_quote_events(guest_app_id,quote_id,actor_type,actor_id,event_type,metadata_json) VALUES (?,?,'owner',?,'quote.created',?)", [guestAppId,created.insertId,actorId,JSON.stringify({ quoteCode, total, pricingSource: pricingSnapshot.source, manuallyOverridden: pricingSnapshot.manuallyOverridden })]);
    await connection.commit();
    return Response.json({ ok: true, quoteId: created.insertId, quoteCode }, { status: 201 });
  } catch (error) { await connection.rollback(); console.error("GUEST ADMIN QUOTE CREATE ERROR", error); return guestError("No se pudo crear el presupuesto", 500); }
  finally { connection.release(); }
}
