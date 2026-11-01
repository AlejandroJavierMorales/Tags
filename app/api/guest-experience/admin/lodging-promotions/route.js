export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

async function access(body, permission = "guest.settings.manage") {
  const result = await getGuestAdminAccess({ businessId: Number(body.businessId || 0), guestAppId: Number(body.guestAppId || 0), permission });
  return result;
}

export async function GET(req) {
  try {
    const params = new URL(req.url).searchParams;
    const input = { businessId: params.get("businessId"), guestAppId: params.get("guestAppId") };
    const allowed = await access(input, "guest.stays.view");
    if (!allowed.allowed) return guestAdminAccessResponse(allowed);
    const guestAppId = Number(input.guestAppId);
    const [promotions] = await db.query(`SELECT p.*,(SELECT COUNT(*) FROM tags_guest_lodging_promotion_uses u WHERE u.promotion_id=p.id AND u.status='confirmed') confirmed_uses FROM tags_guest_lodging_promotions p WHERE p.guest_app_id=? ORDER BY p.created_at DESC,p.id DESC`, [guestAppId]);
    const [units] = await db.query("SELECT promotion_id,unit_id FROM tags_guest_lodging_promotion_units WHERE guest_app_id=?", [guestAppId]);
    return Response.json({ ok: true, promotions: promotions.map(item => ({ ...item, unitIds: units.filter(scope => Number(scope.promotion_id) === Number(item.id)).map(scope => Number(scope.unit_id)) })) });
  } catch (error) { console.error("GUEST LODGING PROMOTIONS GET ERROR", error); return guestError("No se pudieron cargar las promociones", 500); }
}

export async function POST(req) {
  const body = await req.json().catch(() => null); if (!body) return guestError("Cuerpo JSON inválido");
  const allowed = await access(body); if (!allowed.allowed) return guestAdminAccessResponse(allowed);
  const guestAppId = Number(body.guestAppId), id = Number(body.id || 0), name = cleanGuestText(body.name, 190), description = cleanGuestText(body.description, 1000), applicationMode = body.applicationMode === "coupon" ? "coupon" : "automatic", couponCode = applicationMode === "coupon" ? cleanGuestText(body.couponCode, 80).toUpperCase() : null, discountType = body.discountType === "fixed" ? "fixed" : "percentage", discountValue = Number(body.discountValue), stayStartsOn = String(body.stayStartsOn || ""), stayEndsOn = String(body.stayEndsOn || ""), unitIds = [...new Set((Array.isArray(body.unitIds) ? body.unitIds : []).map(Number).filter(Boolean))];
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(stayStartsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(stayEndsOn) || stayEndsOn < stayStartsOn || !Number.isFinite(discountValue) || discountValue <= 0 || (discountType === "percentage" && discountValue > 100) || (applicationMode === "coupon" && !couponCode)) return guestError("Revisá el nombre, la vigencia y el descuento");
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const values = [name, description || null, couponCode, applicationMode, discountType, discountValue, body.bookingStartsAt ? String(body.bookingStartsAt).replace("T", " ") : null, body.bookingEndsAt ? String(body.bookingEndsAt).replace("T", " ") : null, stayStartsOn, stayEndsOn, body.minimumNights ? Number(body.minimumNights) : null, body.minimumAdvanceDays ? Number(body.minimumAdvanceDays) : null, body.maximumUses ? Number(body.maximumUses) : null, body.status === "archived" ? "archived" : "published", allowed.session?.id || allowed.session?.userId || null];
    let promotionId = id;
    if (id) {
      const [updated] = await connection.query(`UPDATE tags_guest_lodging_promotions SET name=?,description=?,coupon_code=?,application_mode=?,discount_type=?,discount_value=?,booking_starts_at=?,booking_ends_at=?,stay_starts_on=?,stay_ends_on=?,minimum_nights=?,minimum_advance_days=?,maximum_uses=?,status=?,updated_by_id=? WHERE id=? AND guest_app_id=?`, [...values, id, guestAppId]);
      if (!updated.affectedRows) { await connection.rollback(); return guestError("Promoción no encontrada", 404); }
      await connection.query("DELETE FROM tags_guest_lodging_promotion_units WHERE promotion_id=? AND guest_app_id=?", [id, guestAppId]);
    } else {
      const [created] = await connection.query(`INSERT INTO tags_guest_lodging_promotions(guest_app_id,name,description,coupon_code,application_mode,discount_type,discount_value,booking_starts_at,booking_ends_at,stay_starts_on,stay_ends_on,minimum_nights,minimum_advance_days,maximum_uses,status,created_by_id,updated_by_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [guestAppId, ...values, values[14]]);
      promotionId = created.insertId;
    }
    for (const unitId of unitIds) await connection.query("INSERT INTO tags_guest_lodging_promotion_units(promotion_id,guest_app_id,unit_id) SELECT ?,?,id FROM tags_guest_units WHERE id=? AND guest_app_id=?", [promotionId, guestAppId, unitId, guestAppId]);
    await connection.query("INSERT INTO tags_guest_audit_log(guest_app_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,'owner',?,'lodging_promotion.saved','lodging_promotion',?,?)", [guestAppId, values[14], promotionId, JSON.stringify({ name, applicationMode, discountType, discountValue, unitIds })]);
    await connection.commit(); return Response.json({ ok: true, id: promotionId });
  } catch (error) { await connection.rollback(); if (error?.code === "ER_DUP_ENTRY") return guestError("Ese código de cupón ya está utilizado", 409); console.error("GUEST LODGING PROMOTIONS SAVE ERROR", error); return guestError("No se pudo guardar la promoción", 500); } finally { connection.release(); }
}

export async function DELETE(req) {
  const body = await req.json().catch(() => null); if (!body) return guestError("Cuerpo JSON inválido");
  const allowed = await access(body); if (!allowed.allowed) return guestAdminAccessResponse(allowed);
  await db.query("UPDATE tags_guest_lodging_promotions SET status='archived',updated_by_id=? WHERE id=? AND guest_app_id=?", [allowed.session?.id || allowed.session?.userId || null, Number(body.id), Number(body.guestAppId)]);
  return Response.json({ ok: true });
}
