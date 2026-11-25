export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
  getGuestAdminAccess,
  guestAdminAccessResponse,
} from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import {
  cleanGuestText,
  createGuestToken,
  guestError,
  hashGuestToken,
  parseGuestJson,
} from "@/app/modules/guest-experience/lib/guestExperienceService";
import { countLodgingNights, normalizeGuestCounts, parseLodgingDateInput, validateUnitCapacity } from "@/app/modules/guest-experience/lib/lodgingReservationRules";
import { findBlockingStay, findBlockingUnitBlock, lockActiveGuestUnit, lockGuestInventory } from "@/app/modules/guest-experience/server/lodgingAvailabilityService";
import { evaluateLodgingAvailability } from "@/app/modules/guest-experience/server/lodgingAvailabilityEvaluator";

async function loadGroupRequestUnits(connection,item,metadata){
  let [rows]=await connection.query("SELECT * FROM tags_guest_booking_request_units WHERE request_id=? AND guest_app_id=? ORDER BY id FOR UPDATE",[item.id,item.guest_app_id]);
  if(!rows.length&&Array.isArray(metadata?.groupProposal?.units)){
    for(const unit of metadata.groupProposal.units)await connection.query(`INSERT IGNORE INTO tags_guest_booking_request_units
      (guest_app_id,request_id,unit_id,suggested_guests,amount,currency,status) VALUES (?,?,?,?,?,?,?)`,[item.guest_app_id,item.id,Number(unit.unitId),Math.max(1,Number(unit.suggestedGuests||1)),0,item.currency||metadata.groupProposal.currency||"ARS","proposed"]);
    [rows]=await connection.query("SELECT * FROM tags_guest_booking_request_units WHERE request_id=? AND guest_app_id=? ORDER BY id FOR UPDATE",[item.id,item.guest_app_id]);
  }
  return rows;
}

async function evaluateGroupRequestUnits(connection,{app,settings,item,rows}){
  const startsAt=parseLodgingDateInput(String(item.starts_on).slice(0,10)),endsAt=parseLodgingDateInput(String(item.ends_on).slice(0,10)),evaluated=[];
  for(const row of rows){
    const availability=await evaluateLodgingAvailability(connection,{app,settings,startsAt,endsAt,adults:Math.max(1,Number(row.suggested_guests)),children:0,excludeRequestId:item.id});
    const unit=availability.units.find(candidate=>Number(candidate.unitId)===Number(row.unit_id));
    if(!unit||["unavailable","alternative_suggested"].includes(unit.decision)||!unit.pricing?.configured)return {ok:false,error:unit?.reason||"Una de las unidades ya no está disponible"};
    evaluated.push({row,unit});
  }
  return {ok:true,startsAt,endsAt,evaluated};
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0), unitId = Number(body.unitId || 0);
  const access = await getGuestAdminAccess({ businessId, guestAppId, permission: "guest.stays.manage" });
  if (!access.allowed) return guestAdminAccessResponse(access);
  const startsAt = parseLodgingDateInput(body.startsAt), endsAt = parseLodgingDateInput(body.endsAt);
  const firstName = cleanGuestText(body.firstName, 100), lastName = cleanGuestText(body.lastName, 100);
  const customerName = `${firstName} ${lastName}`.trim(), customerEmail = cleanGuestText(body.email, 190)?.toLowerCase(), customerPhone = cleanGuestText(body.phone, 60);
  if (!unitId || !startsAt || !endsAt || endsAt <= startsAt || !customerName || !customerEmail || !customerPhone) return guestError("Completá correctamente titular, unidad y fechas");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || customerPhone.replace(/\D/g, "").length < 8) return guestError("Email o teléfono inválidos");
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const app = await lockGuestInventory(connection, { guestAppId, businessId });
    if (!app) { await connection.rollback(); return guestError("Instancia no encontrada", 404); }
    const settings = parseGuestJson(app.settings_json), unit = await lockActiveGuestUnit(connection, { guestAppId, unitId });
    if (!unit) { await connection.rollback(); return guestError("Unidad inválida", 404); }
    const guests = normalizeGuestCounts(body), capacity = validateUnitCapacity({ unit, ...guests, settings });
    if (!capacity.ok) { await connection.rollback(); return guestError(capacity.error, 409, capacity.code); }
    const overlap = await findBlockingStay(connection, { guestAppId, unitId, startsAt, endsAt });
    if (overlap) { await connection.rollback(); return guestError("La unidad ya está ocupada en ese período", 409); }
    const block = await findBlockingUnitBlock(connection, { guestAppId, unitId, startsAt, endsAt });
    if (block) { await connection.rollback(); return guestError(`La unidad está bloqueada en esas fechas${block.reason ? `: ${block.reason}` : ""}`, 409); }
    const [holds] = await connection.query("SELECT id FROM tags_guest_booking_requests WHERE guest_app_id=? AND unit_id=? AND status IN ('held','pending_payment') AND hold_expires_at>NOW() AND starts_on<? AND ends_on>? LIMIT 1 FOR UPDATE", [guestAppId, unitId, endsAt, startsAt]);
    if (holds.length) { await connection.rollback(); return guestError("La unidad está retenida por otra reserva pendiente", 409); }
    const nights = countLodgingNights(startsAt, endsAt), nightlyRate = Math.max(0, Number(body.nightlyRate || 0));
    const lodgingTotal = Number((nightlyRate * nights).toFixed(2)), depositPercentage = Math.max(0, Math.min(100, Number(body.depositPercentage ?? settings.depositPercentage ?? 0)));
    const depositRequired = Number((lodgingTotal * depositPercentage / 100).toFixed(2)), paymentHours = Math.max(1, Math.min(720, Math.trunc(Number(settings.reservationPaymentHours || 48))));
    const requestCode = `M-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
    const metadata = { manualEntry: true, documentNumber: cleanGuestText(body.documentNumber, 80), expectedArrivalText: cleanGuestText(body.expectedArrivalText, 120), arrivalNotes: cleanGuestText(body.arrivalNotes, 2000), internalNotes: cleanGuestText(body.internalNotes, 2000) };
    const token = createGuestToken();
    const [created] = await connection.query(`INSERT INTO tags_guest_booking_requests
      (guest_app_id,unit_id,request_code,status,availability_decision,starts_on,ends_on,adults,children,customer_name,customer_email,customer_phone,customer_notes,source,hold_expires_at,access_token_hash,idempotency_key,currency,average_nightly_rate,lodging_total,deposit_percentage,deposit_required_amount,pricing_snapshot_json,metadata_json)
      VALUES (?,?,?,'pending_payment','available',?,?,?,?,?,?,?,?,'manual_admin',DATE_ADD(NOW(),INTERVAL ? HOUR),?,?,?,?,?,?,?,?,?)`,
    [guestAppId, unitId, requestCode, startsAt, endsAt, guests.adults, guests.children, customerName, customerEmail, customerPhone, metadata.arrivalNotes || null, paymentHours, hashGuestToken(token), `manual:${guestAppId}:${requestCode}`, app.currency || "ARS", nightlyRate, lodgingTotal, depositPercentage, depositRequired, JSON.stringify({ source: "manual_admin", nightlyRate, nights }), JSON.stringify(metadata)]);
    const actorId = access.session?.id || access.session?.userId || null;
    if (Number(body.quoteId || 0)) {
      const [linked] = await connection.query("UPDATE tags_guest_lodging_quotes SET status='consumed',consumed_at=NOW() WHERE id=? AND guest_app_id=? AND status='active'", [Number(body.quoteId), guestAppId]);
      if (!linked.affectedRows) { await connection.rollback(); return guestError("El presupuesto ya fue convertido o no está vigente", 409); }
      await connection.query("UPDATE tags_guest_booking_requests SET quote_id=? WHERE id=?", [Number(body.quoteId), created.insertId]);
      await connection.query("INSERT INTO tags_guest_lodging_quote_events(guest_app_id,quote_id,actor_type,actor_id,event_type,metadata_json) VALUES (?,?,'owner',?,'quote.converted_pending',?)", [guestAppId, Number(body.quoteId), actorId, JSON.stringify({ requestId: created.insertId })]);
    }
    await connection.query("INSERT INTO tags_guest_booking_request_events(guest_app_id,request_id,actor_type,actor_id,event_type,to_status,metadata_json) VALUES (?,?,'owner',?,'request.manual_created','pending_payment',?)", [guestAppId, created.insertId, actorId, JSON.stringify({ paymentHours, lodgingTotal, depositRequired })]);
    await connection.commit();
    return Response.json({ ok: true, requestId: created.insertId, requestCode, status: "pending_payment", holdExpiresAt: new Date(Date.now() + paymentHours * 3600000).toISOString(), lodgingTotal, depositRequired, currency: app.currency || "ARS" }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error("GUEST MANUAL BOOKING REQUEST CREATE ERROR", error);
    return guestError("No se pudo registrar la reserva pendiente", 500);
  } finally { connection.release(); }
}

export async function GET(req) {
  try {
    const params = new URL(req.url).searchParams;
    const businessId = Number(params.get("businessId") || 0);
    const guestAppId = Number(params.get("guestAppId") || 0);
    const statusFilter = String(params.get("status") || "pending");
    const from = String(params.get("from") || "").trim();
    const to = String(params.get("to") || "").trim();
    const access = await getGuestAdminAccess({
      businessId,
      guestAppId,
      permission: "guest.stays.view",
    });
    if (!access.allowed) return guestAdminAccessResponse(access);
    await db.query(
      "UPDATE tags_guest_booking_requests SET status='expired',resolved_at=NOW(),updated_at=NOW() WHERE guest_app_id=? AND status IN ('held','pending_payment') AND hold_expires_at<=NOW()",
      [guestAppId],
    );
    await db.query(`UPDATE tags_guest_booking_request_units ru INNER JOIN tags_guest_booking_requests r ON r.id=ru.request_id AND r.guest_app_id=ru.guest_app_id
      SET ru.status='released' WHERE ru.guest_app_id=? AND ru.status='held' AND r.status IN ('expired','cancelled','rejected')`,[guestAppId]);
    await db.query("UPDATE tags_guest_lodging_promotion_uses u INNER JOIN tags_guest_booking_requests r ON r.id=u.booking_request_id AND r.guest_app_id=u.guest_app_id SET u.status='released',u.released_at=NOW() WHERE u.guest_app_id=? AND u.status='reserved' AND r.status IN ('expired','cancelled','rejected')", [guestAppId]);
    const statusSql = statusFilter === "confirmed"
      ? "AND r.status='confirmed'"
      : statusFilter === "rejected"
        ? "AND r.status='rejected'"
        : statusFilter === "closed"
          ? "AND r.status IN ('expired','cancelled')"
          : statusFilter === "all"
            ? ""
            : "AND r.status IN ('held','review_required','pending_payment')";
    const dateValues = [];
    let dateSql = "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      dateSql += " AND r.created_at>=?";
      dateValues.push(`${from} 00:00:00`);
      const endDate = /^\d{4}-\d{2}-\d{2}$/.test(to) && to >= from ? to : from;
      dateSql += " AND r.created_at<DATE_ADD(?,INTERVAL 1 DAY)";
      dateValues.push(`${endDate} 00:00:00`);
    }
    const [requests] = await db.query(
      `SELECT r.*,u.name unit_name,u.code unit_code
         FROM tags_guest_booking_requests r
         INNER JOIN tags_guest_units u ON u.id=r.unit_id AND u.guest_app_id=r.guest_app_id
        WHERE r.guest_app_id=?
          ${statusSql}${dateSql}
        ORDER BY FIELD(r.status,'review_required','held','pending_payment','confirmed','rejected','cancelled','expired'),
                 r.created_at DESC LIMIT 500`,
      [guestAppId, ...dateValues],
    );
    return Response.json({ ok: true, requests });
  } catch (error) {
    console.error("GUEST BOOKING REQUESTS ADMIN GET ERROR", error);
    return guestError("No se pudieron cargar las solicitudes", 500);
  }
}

export async function PATCH(req) {
  const body = await req.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const businessId = Number(body.businessId || 0);
  const guestAppId = Number(body.guestAppId || 0);
  const requestId = Number(body.requestId || 0);
  const action = body.action;
  const access = await getGuestAdminAccess({
    businessId,
    guestAppId,
    permission: "guest.stays.manage",
  });
  if (!access.allowed) return guestAdminAccessResponse(access);
  if (action === "payment_received") {
    const paymentAccess = await getGuestAdminAccess({ businessId, guestAppId, permission: "guest.payments.register" });
    if (!paymentAccess.allowed) return guestAdminAccessResponse(paymentAccess);
  }
  if (!requestId || !["approve", "payment_received", "reject", "cancel", "expire"].includes(action)) return guestError("Acción inválida");

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const app = await lockGuestInventory(connection, { guestAppId, businessId });
    if (!app) {
      await connection.rollback();
      return guestError("Instancia no encontrada", 404);
    }
    const [rows] = await connection.query(
      "SELECT * FROM tags_guest_booking_requests WHERE id=? AND guest_app_id=? LIMIT 1 FOR UPDATE",
      [requestId, guestAppId],
    );
    const item = rows[0];
    if (!item) {
      await connection.rollback();
      return guestError("Solicitud no encontrada", 404);
    }
    if (!(["held", "review_required"].includes(item.status) || (item.status === "pending_payment" && ["payment_received", "cancel", "expire"].includes(action)) || (item.status === "expired" && ["payment_received", "cancel"].includes(action)))) {
      await connection.rollback();
      return guestError("La solicitud ya fue resuelta", 409);
    }
    const requestMetadata = parseGuestJson(item.metadata_json);
    const groupRows=requestMetadata.groupProposal?await loadGroupRequestUnits(connection,item,requestMetadata):[];
    const actorId = access.session?.id || access.session?.userId || null;
    const notes = cleanGuestText(body.notes, 2000);
    if (["reject", "cancel", "expire"].includes(action)) {
      const nextStatus = action === "reject" ? "rejected" : action === "cancel" ? "cancelled" : "expired";
      await connection.query(
        "UPDATE tags_guest_booking_requests SET status=?,hold_expires_at=NULL,resolved_at=NOW(),resolved_by_id=?,resolution_notes=? WHERE id=?",
        [nextStatus, actorId, notes || null, requestId],
      );
      await connection.query(
        "INSERT INTO tags_guest_booking_request_events(guest_app_id,request_id,actor_type,actor_id,event_type,from_status,to_status,notes) VALUES (?,?,'owner',?,?,?,?,?)",
        [guestAppId, requestId, actorId, `request.${nextStatus}`, item.status, nextStatus, notes || null],
      );
      await connection.query("UPDATE tags_guest_lodging_promotion_uses SET status='released',released_at=NOW() WHERE booking_request_id=? AND guest_app_id=? AND status='reserved'", [requestId, guestAppId]);
      if(groupRows.length)await connection.query("UPDATE tags_guest_booking_request_units SET status='released' WHERE request_id=? AND guest_app_id=?",[requestId,guestAppId]);
      await connection.commit();
      return Response.json({ ok: true, status: nextStatus });
    }
    if (action === "approve") {
      const settings = parseGuestJson(app.settings_json);
      if(groupRows.length){
        const checked=await evaluateGroupRequestUnits(connection,{app,settings,item,rows:groupRows});
        if(!checked.ok){await connection.rollback();return guestError(checked.error,409,"GROUP_NOT_AVAILABLE")}
        let total=0;for(const entry of checked.evaluated){const amount=Number(entry.unit.pricing.total||0);total+=amount;await connection.query("UPDATE tags_guest_booking_request_units SET status='held',amount=?,currency=?,pricing_snapshot_json=? WHERE id=?",[amount,entry.unit.pricing.currency||app.currency||"ARS",JSON.stringify(entry.unit.pricing),entry.row.id])}
        const paymentHours=Math.max(1,Math.min(720,Math.trunc(Number(settings.reservationPaymentHours||48)))),depositPercentage=Math.max(0,Math.min(100,Number(settings.depositPercentage||0))),depositRequired=Number((total*depositPercentage/100).toFixed(2));
        await connection.query("UPDATE tags_guest_booking_requests SET status='pending_payment',hold_expires_at=DATE_ADD(NOW(),INTERVAL ? HOUR),currency=?,lodging_total=?,deposit_percentage=?,deposit_required_amount=?,resolved_at=NULL,resolved_by_id=?,resolution_notes=? WHERE id=?",[paymentHours,app.currency||"ARS",total,depositPercentage,depositRequired,actorId,notes||null,requestId]);
        await connection.query("INSERT INTO tags_guest_booking_request_events(guest_app_id,request_id,actor_type,actor_id,event_type,from_status,to_status,notes,metadata_json) VALUES (?,?,'owner',?,'request.approved',?,'pending_payment',?,?)",[guestAppId,requestId,actorId,item.status,notes||null,JSON.stringify({paymentHours,units:groupRows.length})]);
        await connection.commit();return Response.json({ok:true,status:"pending_payment",paymentHours,groupRequest:true});
      }
      const startsAt = parseLodgingDateInput(String(item.starts_on).slice(0, 10));
      const endsAt = parseLodgingDateInput(String(item.ends_on).slice(0, 10));
      const availability = await evaluateLodgingAvailability(connection, { app, settings, startsAt, endsAt, adults: item.adults, children: item.children, excludeRequestId: requestId });
      const unit = availability.units.find(candidate => Number(candidate.unitId) === Number(item.unit_id));
      if (!unit || unit.decision === "unavailable") { await connection.rollback(); return guestError(unit?.reason || "La unidad ya no está disponible", 409, "UNIT_NOT_AVAILABLE"); }
      const paymentHours = Math.max(1, Math.min(720, Math.trunc(Number(settings.reservationPaymentHours || 48))));
      await connection.query("UPDATE tags_guest_booking_requests SET status='pending_payment',hold_expires_at=DATE_ADD(NOW(),INTERVAL ? HOUR),resolved_at=NULL,resolved_by_id=?,resolution_notes=? WHERE id=?", [paymentHours, actorId, notes || null, requestId]);
      await connection.query("INSERT INTO tags_guest_booking_request_events(guest_app_id,request_id,actor_type,actor_id,event_type,from_status,to_status,notes,metadata_json) VALUES (?,?,'owner',?,'request.approved',?,'pending_payment',?,?)", [guestAppId, requestId, actorId, item.status, notes || null, JSON.stringify({ paymentHours })]);
      await connection.commit();
      return Response.json({ ok: true, status: "pending_payment", paymentHours });
    }
    if (["held", "pending_payment"].includes(item.status) && item.hold_expires_at && new Date(item.hold_expires_at) <= new Date()) {
      if(groupRows.length)await connection.query("UPDATE tags_guest_booking_request_units SET status='released' WHERE request_id=? AND guest_app_id=?",[requestId,guestAppId]);
      await connection.query(
        "UPDATE tags_guest_booking_requests SET status='expired',resolved_at=NOW() WHERE id=?",
        [requestId],
      );
      await connection.commit();
      return guestError(
        "La retención venció. Volvé a comprobar la disponibilidad",
        409,
        "HOLD_EXPIRED",
      );
    }

    const settings = parseGuestJson(app.settings_json);
    if(action==="payment_received"&&groupRows.length){
      const checked=await evaluateGroupRequestUnits(connection,{app,settings,item,rows:groupRows});
      if(!checked.ok){await connection.rollback();return guestError(checked.error,409,"GROUP_NOT_AVAILABLE")}
      const [people]=await connection.query("SELECT id FROM tags_guest_people WHERE business_id=? AND ((?<>'' AND LOWER(email)=LOWER(?)) OR (?<>'' AND phone=?)) ORDER BY id DESC LIMIT 1 FOR UPDATE",[businessId,item.customer_email||"",item.customer_email||"",item.customer_phone||"",item.customer_phone||""]);
      let guestId=people[0]?.id;
      if(guestId)await connection.query("UPDATE tags_guest_people SET name=?,email=?,phone=?,updated_at=NOW() WHERE id=?",[item.customer_name,item.customer_email,item.customer_phone,guestId]);
      else{const[created]=await connection.query("INSERT INTO tags_guest_people(business_id,name,email,phone) VALUES (?,?,?,?)",[businessId,item.customer_name,item.customer_email,item.customer_phone]);guestId=created.insertId}
      const prefix=String(settings.reservationCodePrefix||"R"),padding=Math.max(1,Number(settings.reservationCodePadding||3)),currency=item.currency||app.currency||"ARS",depositPercentage=Number(item.deposit_percentage||settings.depositPercentage||0),stayResults=[];
      const evaluatedTotal=checked.evaluated.reduce((sum,entry)=>sum+Number(entry.row.amount||entry.unit.pricing.total||0),0),requestedPayment=Math.max(0,Number(body.paymentAmount||item.deposit_required_amount||0)),paymentMethod=cleanGuestText(body.paymentMethod,40)||"transfer";
      let counter=Number(settings.reservationCodeCounter||0),remainingPayment=requestedPayment;
      for(const [entryIndex,entry] of checked.evaluated.entries()){
        counter+=1;const stayCode=`${prefix}${String(counter).padStart(padding,"0")}`.toUpperCase(),amount=Number(entry.row.amount||entry.unit.pricing.total||0),depositRequired=Number((amount*depositPercentage/100).toFixed(2)),nightlyRate=Number(entry.unit.pricing.averageNightlyRate||0),snapshot=entry.row.pricing_snapshot_json&&typeof entry.row.pricing_snapshot_json!=="string"?JSON.stringify(entry.row.pricing_snapshot_json):entry.row.pricing_snapshot_json||JSON.stringify(entry.unit.pricing||{});
        const[stay]=await connection.query(`INSERT INTO tags_guest_stays
          (guest_app_id,unit_id,rate_plan_id,primary_guest_id,stay_code,status,starts_at,ends_at,adults,children,nightly_rate,lodging_total,deposit_percentage,deposit_required_amount,pricing_snapshot_json,source,internal_notes,created_by_id)
          VALUES (?,?,?,?,?,'reserved',?,?,?,?,?,?,?,?,?,'public_web',?,?)`,[guestAppId,entry.row.unit_id,entry.unit.ratePlan?.id||null,guestId,stayCode,checked.startsAt,checked.endsAt,entry.row.suggested_guests,0,nightlyRate,amount,depositPercentage,depositRequired,snapshot,notes||item.customer_notes||null,actorId]);
        await connection.query("INSERT INTO tags_guest_stay_people(stay_id,guest_id,role) VALUES (?,?,'primary')",[stay.insertId,guestId]);
        const[account]=await connection.query("INSERT INTO tags_guest_accounts(guest_app_id,stay_id,currency,status) VALUES (?,?,?,'open')",[guestAppId,stay.insertId,currency]);
        if(amount>0)await connection.query(`INSERT INTO tags_guest_account_entries(account_id,entry_type,source_type,description,quantity,unit_amount,total_amount,currency,status,occurred_at,created_by_type,created_by_id) VALUES (?,'charge','lodging_quote','Alojamiento',1,?,?,?,'confirmed',NOW(),'owner',?)`,[account.insertId,amount,amount,currency,actorId]);
        const allocatedPayment=entryIndex===checked.evaluated.length-1?remainingPayment:Number(Math.min(remainingPayment,requestedPayment*(evaluatedTotal?amount/evaluatedTotal:0)).toFixed(2));
        if(allocatedPayment>0){const[paymentEntry]=await connection.query("INSERT INTO tags_guest_account_entries(account_id,entry_type,source_type,idempotency_key,description,quantity,unit_amount,total_amount,currency,status,created_by_type,created_by_id) VALUES (?,'payment','manual',?,'Pago de confirmación de reserva grupal',1,?,? ,?,'confirmed','owner',?)",[account.insertId,`booking-request-payment:${requestId}:${entry.row.id}`,allocatedPayment,-allocatedPayment,currency,actorId]);await connection.query("INSERT INTO tags_guest_payments(account_id,account_entry_id,payment_method,amount,currency,reference,notes,received_by_id) VALUES (?,?,?,?,?,?,?,?)",[account.insertId,paymentEntry.insertId,paymentMethod,allocatedPayment,currency,cleanGuestText(body.paymentReference,190)||null,cleanGuestText(body.paymentNotes,2000)||null,actorId]);remainingPayment=Number((remainingPayment-allocatedPayment).toFixed(2));}
        await connection.query("UPDATE tags_guest_booking_request_units SET status='confirmed',confirmed_stay_id=? WHERE id=?",[stay.insertId,entry.row.id]);
        stayResults.push({stayId:stay.insertId,stayCode,unitId:entry.row.unit_id,amount});
      }
      settings.reservationCodeCounter=counter;await connection.query("UPDATE tags_guest_apps SET settings_json=? WHERE id=?",[JSON.stringify(settings),guestAppId]);
      await connection.query("UPDATE tags_guest_booking_requests SET status='confirmed',confirmed_stay_id=?,resolved_at=NOW(),resolved_by_id=?,resolution_notes=? WHERE id=?",[stayResults[0].stayId,actorId,notes||null,requestId]);
      await connection.query("UPDATE tags_guest_lodging_promotion_uses SET stay_id=?,status='confirmed',confirmed_at=NOW() WHERE booking_request_id=? AND guest_app_id=? AND status='reserved'",[stayResults[0].stayId,requestId,guestAppId]);
      await connection.query("INSERT INTO tags_guest_booking_request_events(guest_app_id,request_id,actor_type,actor_id,event_type,from_status,to_status,metadata_json) VALUES (?,?,'owner',?,'request.confirmed',?,'confirmed',?)",[guestAppId,requestId,actorId,item.status,JSON.stringify({stays:stayResults})]);
      for(const stay of stayResults)await connection.query("INSERT INTO tags_guest_audit_log(guest_app_id,stay_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,?,'owner',?,'booking_request.confirmed','booking_request',?,?)",[guestAppId,stay.stayId,actorId,requestId,JSON.stringify({stayCode:stay.stayCode,groupRequest:true})]);
      await connection.commit();return Response.json({ok:true,status:"confirmed",stayId:stayResults[0].stayId,stayCode:stayResults[0].stayCode,stayCodes:stayResults.map(stay=>stay.stayCode),stayCount:stayResults.length,lodgingTotal:Number(item.lodging_total||0),currency,groupRequest:true});
    }
    const startsAt = parseLodgingDateInput(String(item.starts_on).slice(0, 10));
    const endsAt = parseLodgingDateInput(String(item.ends_on).slice(0, 10));
    let unit;
    if (item.source === "manual_admin") {
      const rawUnit = await lockActiveGuestUnit(connection, { guestAppId, unitId: item.unit_id });
      const capacity = rawUnit && validateUnitCapacity({ unit: rawUnit, adults: item.adults, children: item.children, settings });
      const occupied = rawUnit && await findBlockingStay(connection, { guestAppId, unitId: item.unit_id, startsAt, endsAt });
      const blocked = rawUnit && await findBlockingUnitBlock(connection, { guestAppId, unitId: item.unit_id, startsAt, endsAt });
      const [otherHolds] = rawUnit ? await connection.query("SELECT id FROM tags_guest_booking_requests WHERE guest_app_id=? AND unit_id=? AND id<>? AND status IN ('held','pending_payment') AND hold_expires_at>NOW() AND starts_on<? AND ends_on>? LIMIT 1 FOR UPDATE", [guestAppId, item.unit_id, requestId, endsAt, startsAt]) : [[]];
      if (rawUnit && capacity?.ok && !occupied && !blocked && !otherHolds.length) unit = { unitId: rawUnit.id, ratePlan: null };
    } else {
      const availability = await evaluateLodgingAvailability(connection, { app, settings, startsAt, endsAt, adults: item.adults, children: item.children, excludeRequestId: requestId });
      unit = availability.units.find(candidate => Number(candidate.unitId) === Number(item.unit_id));
    }
    if (!unit || unit.decision === "unavailable") {
      await connection.rollback();
      return guestError(unit?.reason || "La unidad ya no está disponible", 409, "UNIT_NOT_AVAILABLE");
    }

    let quote = null;
    if (item.quote_id) {
      const [quotes] = await connection.query(
        "SELECT * FROM tags_guest_lodging_quotes WHERE id=? AND guest_app_id=? AND unit_id=? LIMIT 1 FOR UPDATE",
        [item.quote_id, guestAppId, item.unit_id],
      );
      quote = quotes[0] || null;
    }
    let guestId;
    const [people] = await connection.query(
      "SELECT id FROM tags_guest_people WHERE business_id=? AND ((?<>'' AND LOWER(email)=LOWER(?)) OR (?<>'' AND phone=?)) ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [
        businessId,
        item.customer_email || "",
        item.customer_email || "",
        item.customer_phone || "",
        item.customer_phone || "",
      ],
    );
    guestId = people[0]?.id;
    if (guestId) {
      await connection.query(
        "UPDATE tags_guest_people SET name=?,email=?,phone=?,document_type=IF(?<>'','DNI',document_type),document_number=COALESCE(NULLIF(?,''),document_number),updated_at=NOW() WHERE id=?",
        [item.customer_name, item.customer_email, item.customer_phone, requestMetadata.documentNumber || "", requestMetadata.documentNumber || "", guestId],
      );
    } else {
      const [created] = await connection.query(
        "INSERT INTO tags_guest_people(business_id,name,email,phone,document_type,document_number) VALUES (?,?,?,?,'DNI',?)",
        [businessId, item.customer_name, item.customer_email, item.customer_phone, requestMetadata.documentNumber || null],
      );
      guestId = created.insertId;
    }

    const prefix = String(settings.reservationCodePrefix || "R");
    const padding = Math.max(1, Number(settings.reservationCodePadding || 3));
    const counter = Number(settings.reservationCodeCounter || 0) + 1;
    const stayCode = `${prefix}${String(counter).padStart(padding, "0")}`.toUpperCase();
    const currency = item.currency || quote?.currency || app.currency || "ARS";
    const nightlyRate = Number(item.average_nightly_rate || 0);
    const lodgingTotal = Number(item.lodging_total || 0);
    const depositPercentage = Number(item.deposit_percentage || 0);
    const depositRequired = Number(item.deposit_required_amount || 0);
    const rawPricingSnapshot = item.pricing_snapshot_json || quote?.pricing_snapshot_json || null;
    const pricingSnapshot =
      rawPricingSnapshot && typeof rawPricingSnapshot !== "string"
        ? JSON.stringify(rawPricingSnapshot)
        : rawPricingSnapshot;
    const [stay] = await connection.query(
      `INSERT INTO tags_guest_stays
        (guest_app_id,unit_id,rate_plan_id,lodging_quote_id,primary_guest_id,stay_code,status,
         starts_at,ends_at,adults,children,nightly_rate,lodging_total,deposit_percentage,
         deposit_required_amount,pricing_snapshot_json,source,internal_notes,created_by_id)
       VALUES (?,?,?,?,?,?,'reserved',?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        guestAppId,
        item.unit_id,
        quote?.rate_plan_id || unit.ratePlan?.id || null,
        quote?.id || item.quote_id || null,
        guestId,
        stayCode,
        startsAt,
        endsAt,
        item.adults,
        item.children,
        nightlyRate,
        lodgingTotal,
        depositPercentage,
        depositRequired,
        pricingSnapshot,
        item.source || "public_web",
        notes || item.customer_notes || null,
        actorId,
      ],
    );
    await connection.query("UPDATE tags_guest_lodging_promotion_uses SET stay_id=?,status='confirmed',confirmed_at=NOW() WHERE booking_request_id=? AND guest_app_id=? AND status='reserved'", [stay.insertId, requestId, guestAppId]);
    await connection.query(
      "INSERT INTO tags_guest_stay_people(stay_id,guest_id,role) VALUES (?,?,'primary')",
      [stay.insertId, guestId],
    );
    const [account] = await connection.query(
      "INSERT INTO tags_guest_accounts(guest_app_id,stay_id,currency,status) VALUES (?,?,?,'open')",
      [guestAppId, stay.insertId, currency],
    );
    if (lodgingTotal > 0) {
      await connection.query(
        `INSERT INTO tags_guest_account_entries
          (account_id,entry_type,source_type,source_id,description,quantity,unit_amount,
           total_amount,currency,status,occurred_at,created_by_type,created_by_id)
         VALUES (?,'charge','lodging_quote',?,'Alojamiento',1,?,?,?,'confirmed',NOW(),'owner',?)`,
        [account.insertId, quote?.id || item.quote_id || null, lodgingTotal, lodgingTotal, currency, actorId],
      );
    }
    const paymentAmount = Math.max(0, Number(body.paymentAmount || depositRequired || 0));
    if (paymentAmount > 0) {
      const paymentMethod = cleanGuestText(body.paymentMethod, 40) || "transfer";
      const paymentReference = cleanGuestText(body.paymentReference, 190) || null;
      const paymentNotes = cleanGuestText(body.paymentNotes, 2000) || null;
      const [paymentEntry] = await connection.query(
        "INSERT INTO tags_guest_account_entries(account_id,entry_type,source_type,idempotency_key,description,quantity,unit_amount,total_amount,currency,status,created_by_type,created_by_id) VALUES (?,'payment','manual',?,'Pago de confirmación de reserva',1,?,? ,?,'confirmed','owner',?)",
        [account.insertId, `booking-request-payment:${requestId}`, paymentAmount, -paymentAmount, currency, actorId],
      );
      await connection.query("INSERT INTO tags_guest_payments(account_id,account_entry_id,payment_method,amount,currency,reference,notes,received_by_id) VALUES (?,?,?,?,?,?,?,?)", [account.insertId, paymentEntry.insertId, paymentMethod, paymentAmount, currency, paymentReference, paymentNotes, actorId]);
      await connection.query("INSERT INTO tags_guest_audit_log(guest_app_id,stay_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,?,'owner',?,'payment.recorded','account_entry',?,?)", [guestAppId, stay.insertId, actorId, paymentEntry.insertId, JSON.stringify({ amount: paymentAmount, method: paymentMethod, bookingRequestId: requestId })]);
    }
    if (quote) {
      await connection.query(
        "UPDATE tags_guest_lodging_quotes SET status='consumed',consumed_at=NOW() WHERE id=?",
        [quote.id],
      );
    }
    settings.reservationCodeCounter = counter;
    await connection.query("UPDATE tags_guest_apps SET settings_json=? WHERE id=?", [
      JSON.stringify(settings),
      guestAppId,
    ]);
    await connection.query(
      "UPDATE tags_guest_booking_requests SET status='confirmed',confirmed_stay_id=?,resolved_at=NOW(),resolved_by_id=?,resolution_notes=? WHERE id=?",
      [stay.insertId, actorId, notes || null, requestId],
    );
    await connection.query(
      "INSERT INTO tags_guest_booking_request_events(guest_app_id,request_id,actor_type,actor_id,event_type,from_status,to_status,metadata_json) VALUES (?,?,'owner',?,'request.confirmed',?,'confirmed',?)",
      [
        guestAppId,
        requestId,
        actorId,
        item.status,
        JSON.stringify({ stayId: stay.insertId, stayCode, quoteId: quote?.id || null, lodgingTotal }),
      ],
    );
    await connection.query(
      "INSERT INTO tags_guest_audit_log(guest_app_id,stay_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,?,'owner',?,'booking_request.confirmed','booking_request',?,?)",
      [
        guestAppId,
        stay.insertId,
        actorId,
        requestId,
        JSON.stringify({ stayCode, quoteId: quote?.id || null, lodgingTotal }),
      ],
    );
    await connection.commit();
    return Response.json({
      ok: true,
      status: "confirmed",
      stayId: stay.insertId,
      stayCode,
      lodgingTotal,
      currency,
    });
  } catch (error) {
    await connection.rollback();
    console.error("GUEST BOOKING REQUEST PATCH ERROR", error);
    return guestError("No se pudo resolver la solicitud", 500);
  } finally {
    connection.release();
  }
}
