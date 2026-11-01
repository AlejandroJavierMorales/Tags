export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

async function optionalDelete(connection, sql, values) {
  try { await connection.query(sql, values); }
  catch (error) { if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code)) throw error; }
}

export async function DELETE(req) {
  return guestError("La eliminación definitiva está deshabilitada hasta que los registros puedan marcarse explícitamente como datos de prueba", 403, "TEST_DELETE_DISABLED");
  /*
  const body = await req.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0);
  let stayId = Number(body.stayId || 0), requestId = Number(body.requestId || 0);
  const access = await getGuestAdminAccess({ businessId, guestAppId, permission: "guest.stays.manage" });
  if (!access.allowed) return guestAdminAccessResponse(access);
  if (!stayId && !requestId) return guestError("Indicá la reserva o solicitud a eliminar");
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (requestId) {
      const [requests] = await connection.query("SELECT id,confirmed_stay_id,quote_id FROM tags_guest_booking_requests WHERE id=? AND guest_app_id=? LIMIT 1 FOR UPDATE", [requestId, guestAppId]);
      if (!requests[0]) { await connection.rollback(); return guestError("Solicitud no encontrada", 404); }
      stayId ||= Number(requests[0].confirmed_stay_id || 0);
    }
    let guestId = 0, quoteId = 0;
    if (stayId) {
      const [stays] = await connection.query("SELECT id,primary_guest_id,lodging_quote_id FROM tags_guest_stays WHERE id=? AND guest_app_id=? LIMIT 1 FOR UPDATE", [stayId, guestAppId]);
      if (!stays[0]) { await connection.rollback(); return guestError("Reserva no encontrada", 404); }
      guestId = Number(stays[0].primary_guest_id || 0); quoteId = Number(stays[0].lodging_quote_id || 0);
      const [payments] = await connection.query("SELECT COUNT(*) total FROM tags_guest_payments p INNER JOIN tags_guest_accounts a ON a.id=p.account_id WHERE a.stay_id=?", [stayId]);
      if (Number(payments[0]?.total || 0) > 0) { await connection.rollback(); return guestError("Esta reserva tiene pagos registrados y no puede eliminarse definitivamente", 409); }
      const [accounts] = await connection.query("SELECT id FROM tags_guest_accounts WHERE stay_id=?", [stayId]);
      const accountIds = accounts.map(item => Number(item.id));
      if (accountIds.length) {
        const marks = accountIds.map(() => "?").join(",");
        await connection.query(`DELETE FROM tags_guest_payments WHERE account_id IN (${marks})`, accountIds);
        await connection.query(`DELETE FROM tags_guest_account_entries WHERE account_id IN (${marks})`, accountIds);
        await connection.query(`DELETE FROM tags_guest_accounts WHERE id IN (${marks})`, accountIds);
      }
      const [serviceRequests] = await connection.query("SELECT id FROM tags_guest_service_requests WHERE stay_id=?", [stayId]).catch(error => [[], error]);
      const serviceRequestIds = serviceRequests.map(item => Number(item.id));
      if (serviceRequestIds.length) {
        const marks = serviceRequestIds.map(() => "?").join(",");
        await optionalDelete(connection, `DELETE FROM tags_guest_request_status_history WHERE request_id IN (${marks})`, serviceRequestIds);
      }
      const [coupons] = await connection.query("SELECT id FROM tags_benefit_coupons WHERE stay_id=?", [stayId]).catch(error => [[], error]);
      const couponIds = coupons.map(item => Number(item.id));
      if (couponIds.length) {
        const marks = couponIds.map(() => "?").join(",");
        await optionalDelete(connection, `DELETE FROM tags_benefit_redemptions WHERE coupon_id IN (${marks})`, couponIds);
        await optionalDelete(connection, `DELETE FROM tags_benefit_audit_log WHERE coupon_id IN (${marks})`, couponIds);
      }
      for (const table of ["tags_guest_messages", "tags_guest_service_requests", "tags_guest_conversations", "tags_guest_precheckins", "tags_guest_communications", "tags_guest_access_tokens", "tags_guest_sessions", "tags_guest_turnos_bookings", "tags_guest_commerce_orders", "tags_guest_external_links", "tags_guest_audit_log", "tags_guest_stay_people"]) {
        await optionalDelete(connection, `DELETE FROM ${table} WHERE stay_id=?`, [stayId]);
      }
      await optionalDelete(connection, "DELETE FROM tags_benefit_coupons WHERE stay_id=?", [stayId]);
      const [linkedRequests] = await connection.query("SELECT id,quote_id FROM tags_guest_booking_requests WHERE confirmed_stay_id=? AND guest_app_id=?", [stayId, guestAppId]);
      const linkedIds = linkedRequests.map(item => Number(item.id));
      if (linkedIds.length) {
        const marks = linkedIds.map(() => "?").join(",");
        await connection.query(`DELETE FROM tags_guest_booking_request_units WHERE request_id IN (${marks})`, linkedIds);
        await connection.query(`DELETE FROM tags_guest_booking_request_events WHERE request_id IN (${marks})`, linkedIds);
        await connection.query(`DELETE FROM tags_guest_booking_requests WHERE id IN (${marks})`, linkedIds);
      }
      await connection.query("DELETE FROM tags_guest_stays WHERE id=? AND guest_app_id=?", [stayId, guestAppId]);
    }
    if (requestId) {
      const [requestRows] = await connection.query("SELECT quote_id FROM tags_guest_booking_requests WHERE id=? AND guest_app_id=?", [requestId, guestAppId]);
      quoteId ||= Number(requestRows[0]?.quote_id || 0);
      await connection.query("DELETE FROM tags_guest_booking_request_units WHERE request_id=? AND guest_app_id=?", [requestId, guestAppId]);
      await connection.query("DELETE FROM tags_guest_booking_request_events WHERE request_id=? AND guest_app_id=?", [requestId, guestAppId]);
      await connection.query("DELETE FROM tags_guest_booking_requests WHERE id=? AND guest_app_id=?", [requestId, guestAppId]);
    }
    if (quoteId) await optionalDelete(connection, "DELETE FROM tags_guest_lodging_quotes WHERE id=? AND guest_app_id=?", [quoteId, guestAppId]);
    if (guestId) {
      const [uses] = await connection.query("SELECT COUNT(*) total FROM tags_guest_stays WHERE primary_guest_id=?", [guestId]);
      if (!Number(uses[0]?.total || 0)) await optionalDelete(connection, "DELETE FROM tags_guest_people WHERE id=? AND business_id=?", [guestId, businessId]);
    }
    await connection.commit();
    return Response.json({ ok: true, deleted: { stayId: stayId || null, requestId: requestId || null } });
  } catch (error) {
    await connection.rollback();
    console.error("GUEST TEST RECORD DELETE ERROR", error);
    return guestError("No se pudieron eliminar definitivamente los datos de prueba", 500);
  } finally { connection.release(); }
  */
}
