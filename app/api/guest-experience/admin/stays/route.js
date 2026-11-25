export const runtime = "nodejs";

export const dynamic = "force-dynamic";


import { db } from "@/app/lib/tags-db";

import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";

import { cleanGuestText, createGuestToken, getGuestVerificationUrl, guestError, hashGuestToken, parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { GUEST_STAY_STATUS, countLodgingNights, normalizeGuestCounts, parseLodgingDateInput, validateUnitCapacity } from "@/app/modules/guest-experience/lib/lodgingReservationRules";
import { findBlockingStay, findBlockingUnitBlock, lockActiveGuestUnit, lockGuestInventory } from "@/app/modules/guest-experience/server/lodgingAvailabilityService";
import { sendMail } from "@/app/lib/sendMail";

async function sendReservationAccessEmail(stayId, guestAppId, createdById = null) {
    const [rows] = await db.query(`
        SELECT s.id,s.stay_code,s.starts_at,s.ends_at,s.adults,s.children,s.expected_arrival_text,
               a.id guest_app_id,a.slug,a.name app_name,a.logo_url,a.settings_json,
               g.id guest_id,g.name guest_name,g.email,g.phone
        FROM tags_guest_stays s
        INNER JOIN tags_guest_apps a ON a.id=s.guest_app_id
        INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id
        WHERE s.id=? AND s.guest_app_id=?
        LIMIT 1
    `, [stayId, guestAppId]);
    const stay = rows[0];
    if (!stay?.email) return { sent: false, reason: "El titular no tiene email." };
    const settings = parseGuestJson(stay.settings_json), grace = Math.max(1, Number(settings.sessionGraceDays || 7));
    const token = createGuestToken();
    const connection = await db.getConnection();
    let tokenId;
    try {
        await connection.beginTransaction();
        await connection.query("UPDATE tags_guest_access_tokens SET revoked_at=NOW() WHERE stay_id=? AND revoked_at IS NULL", [stay.id]);
        const [result] = await connection.query("INSERT INTO tags_guest_access_tokens (guest_app_id,stay_id,guest_id,token_hash,channel,expires_at) VALUES (?,?,?,?, 'email',DATE_ADD(?,INTERVAL ? DAY))", [stay.guest_app_id, stay.id, stay.guest_id, hashGuestToken(token), stay.ends_at, grace]);
        tokenId = result.insertId;
        await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    const link = await getGuestVerificationUrl(db, stay.slug, token);
    const people = Number(stay.adults || 0) + Number(stay.children || 0);
    const formatDate = value => new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const formatTime = value => { const [hour, minute] = String(value || "").split(":"); return hour ? `${Number(hour)}${minute && Number(minute) ? `:${String(minute).padStart(2, "0")}` : ""}hs` : "A confirmar"; };
    const checkinLabel = `${formatDate(stay.starts_at)} ${formatTime(settings.checkinTime || "15:00")}`;
    const checkoutLabel = `${formatDate(stay.ends_at)} ${formatTime(settings.checkoutTime || "10:00")}`;
    const subject = `Acceso a Mi Estadía · ${stay.app_name}`;
    const delivery = await sendMail({
        to: stay.email,
        subject,
        html: `<div style="max-width:620px;margin:auto;font-family:Arial,sans-serif;color:#183226;border:1px solid #dfe9e4;border-radius:18px;overflow:hidden"><div style="padding:24px;background:#f4f8f5;text-align:center">${stay.logo_url ? `<img src="${stay.logo_url}" alt="${stay.app_name}" style="max-width:150px;max-height:90px">` : ""}<h1>Tu reserva fue confirmada</h1></div><div style="padding:24px"><p>Hola <strong>${stay.guest_name}</strong>.</p><p>Tu reserva <strong>${stay.stay_code}</strong> es para ${people} pasajero${people === 1 ? "" : "s"}.</p><p><strong>Ingreso:</strong> ${checkinLabel}<br><strong>Egreso:</strong> ${checkoutLabel}</p><p style="text-align:center;margin:28px 0"><a href="${link}" style="display:inline-block;padding:13px 20px;background:#22a35a;color:#fff;text-decoration:none;border-radius:9px;font-weight:bold">Acceder a Mi Estadía</a></p><p style="font-size:12px;color:#63746a">El enlace estará disponible durante la estadía y el período de gracia configurado.</p></div></div>`,
        text: `Tu reserva ${stay.stay_code} fue confirmada. Acceder a Mi Estadía: ${link}`
    });
    await db.query("INSERT INTO tags_guest_communications (guest_app_id,stay_id,guest_id,access_token_id,event_code,direction,channel,recipient,subject,message_text,status,sent_at,failed_at,attempts,provider_reference,last_error,created_by_type,created_by_id) VALUES (?,?,?,?,'access_link','outbound','email',?,?,?,?,?,?,?,1,?,?, 'system',?)", [stay.guest_app_id, stay.id, stay.guest_id, tokenId, stay.email, subject, `Acceso a Mi Estadía: ${link}`, delivery.ok ? "sent" : "failed", delivery.ok ? new Date() : null, delivery.ok ? null : new Date(), delivery.result?.id || delivery.result?.message || null, delivery.error || null, createdById]);
    return { sent: delivery.ok, link, reason: delivery.ok ? null : delivery.error };
}


export async function POST(req) {
    const body = await req.json().catch(() => null);

    if (!body) return guestError("Cuerpo JSON inválido");

    const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0), unitId = Number(body.unitId || 0);

    const firstName = cleanGuestText(body.firstName, 100), lastName = cleanGuestText(body.lastName, 100);

    const documentNumber = cleanGuestText(body.documentNumber, 80), email = cleanGuestText(body.email, 190)?.toLowerCase(), phone = cleanGuestText(body.phone, 60);

    const starts = parseLodgingDateInput(body.startsAt), ends = parseLodgingDateInput(body.endsAt);

    const access = await getGuestAdminAccess({ businessId, guestAppId, permission: "guest.stays.manage" });

    if (!access.allowed) return guestAdminAccessResponse(access);

    const initialPaymentAmount = Math.max(0, Number(body.initialPaymentAmount || 0));
    if (initialPaymentAmount > 0) {
        const paymentAccess = await getGuestAdminAccess({ businessId, guestAppId, permission: "guest.payments.register" });
        if (!paymentAccess.allowed) return guestAdminAccessResponse(paymentAccess);
    }

    if (!firstName || !lastName || !documentNumber || !email || !phone) return guestError("Nombre, apellido, DNI, teléfono y email del titular son obligatorios");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return guestError("El email no tiene un formato válido");

    if (phone.replace(/\D/g, "").length < 8) return guestError("El teléfono no tiene un formato válido");

    if (!unitId || !starts || !ends || ends <= starts) return guestError("Unidad y fechas válidas son requeridas");

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const app = await lockGuestInventory(connection, { guestAppId, businessId });

        const settings = parseGuestJson(app?.settings_json), prefix = cleanGuestText(settings.reservationCodePrefix, 40), padding = Math.max(1, Number(settings.reservationCodePadding || 0));

        if (!app) { await connection.rollback(); return guestError("Instancia no encontrada", 404); }

        if (!prefix || !padding) { await connection.rollback();
 return guestError("Configurá primero la base automática del código de reservas", 409);
 }
        const nextCounter = Number(settings.reservationCodeCounter || 0) + 1;

        const code = `${prefix}${String(nextCounter).padStart(padding, "0")}`.toUpperCase();

        const nights = countLodgingNights(starts, ends), nightlyRate = Math.max(0, Number(body.nightlyRate || 0)), lodgingTotal = Number((nightlyRate * nights).toFixed(2));

        if (initialPaymentAmount > 0 && lodgingTotal > 0 && initialPaymentAmount > lodgingTotal) { await connection.rollback(); return guestError("El pago inicial no puede superar el total de la estadía", 409); }

        const depositPercentage = Math.max(0, Math.min(100, Number(body.depositPercentage ?? settings.depositPercentage ?? 0))), depositRequired = Number((lodgingTotal * depositPercentage / 100).toFixed(2));

        const unit = await lockActiveGuestUnit(connection, { guestAppId, unitId });

        if (!unit) { await connection.rollback();
 return guestError("Unidad inválida", 404);
 }
        const guests = normalizeGuestCounts(body);
        const capacity = validateUnitCapacity({ unit, ...guests, settings });
        if (!capacity.ok) { await connection.rollback(); return guestError(capacity.error, 409, capacity.code); }
        const overlap = await findBlockingStay(connection, { guestAppId, unitId, startsAt: starts, endsAt: ends });

        if (overlap) { await connection.rollback();
 return guestError("La unidad ya está ocupada en ese período", 409);
 }
        const unitBlock = await findBlockingUnitBlock(connection, { guestAppId, unitId, startsAt: starts, endsAt: ends });
        if (unitBlock) { await connection.rollback(); return guestError(`La unidad está bloqueada en esas fechas${unitBlock.reason ? `: ${unitBlock.reason}` : ""}`, 409, "UNIT_BLOCKED"); }
        const [holds] = await connection.query("SELECT id FROM tags_guest_booking_requests WHERE guest_app_id=? AND unit_id=? AND status IN ('held','pending_payment') AND hold_expires_at>NOW() AND starts_on<? AND ends_on>? LIMIT 1 FOR UPDATE", [guestAppId, unitId, ends, starts]);
        if (holds.length) { await connection.rollback(); return guestError("La unidad está retenida por una reserva pendiente", 409, "UNIT_HELD"); }
        const [codes] = await connection.query("SELECT id FROM tags_guest_stays WHERE guest_app_id=? AND stay_code=? LIMIT 1 FOR UPDATE", [guestAppId, code]);

        if (codes.length) { await connection.rollback();
 return guestError("Ese código de reserva ya está utilizado", 409);
 }
        const [people] = await connection.query("SELECT id FROM tags_guest_people WHERE business_id=? AND document_number=? LIMIT 1 FOR UPDATE", [businessId, documentNumber]);

        let guestId = people[0]?.id;

        if (guestId) await connection.query("UPDATE tags_guest_people SET name=?,email=?,phone=?,document_type='DNI',updated_at=NOW() WHERE id=?", [`${firstName} ${lastName}`, email, phone, guestId]);

        else {
            const [created] = await connection.query("INSERT INTO tags_guest_people (business_id,name,email,phone,document_type,document_number) VALUES (?,?,?,?, 'DNI',?)", [businessId, `${firstName} ${lastName}`, email, phone, documentNumber]);

            guestId = created.insertId;

        }
        const [result] = await connection.query("INSERT INTO tags_guest_stays (guest_app_id,unit_id,primary_guest_id,stay_code,status,starts_at,ends_at,adults,children,nightly_rate,lodging_total,deposit_percentage,deposit_required_amount,arrival_notes,expected_arrival_text,internal_notes,created_by_id) VALUES (?,?,?,?,'reserved',?,?,?,?,?,?,?,?,?,?,?,?)", [guestAppId, unitId, guestId, code, starts, ends, guests.adults, guests.children, nightlyRate, lodgingTotal, depositPercentage, depositRequired, cleanGuestText(body.arrivalNotes, 2000) || null, cleanGuestText(body.expectedArrivalText, 120) || null, cleanGuestText(body.internalNotes, 2000) || null, access.session?.id || access.session?.userId || null]);

        if (Number(body.quoteId || 0)) {
            const actorId = access.session?.id || access.session?.userId || null;
            const [linked] = await connection.query("UPDATE tags_guest_lodging_quotes SET status='consumed',consumed_at=NOW() WHERE id=? AND guest_app_id=? AND status='active'", [Number(body.quoteId), guestAppId]);
            if (!linked.affectedRows) { await connection.rollback(); return guestError("El presupuesto ya fue convertido o no está vigente", 409); }
            await connection.query("UPDATE tags_guest_stays SET lodging_quote_id=? WHERE id=?", [Number(body.quoteId), result.insertId]);
            await connection.query("INSERT INTO tags_guest_lodging_quote_events(guest_app_id,quote_id,actor_type,actor_id,event_type,metadata_json) VALUES (?,?,'owner',?,'quote.converted_confirmed',?)", [guestAppId, Number(body.quoteId), actorId, JSON.stringify({ stayId: result.insertId })]);
        }
        settings.reservationCodeCounter = nextCounter;

        await connection.query("UPDATE tags_guest_apps SET settings_json=?,updated_at=NOW() WHERE id=?", [JSON.stringify(settings), guestAppId]);

        await connection.query("INSERT INTO tags_guest_stay_people (stay_id,guest_id,role) VALUES (?,?,'primary')", [result.insertId, guestId]);

        const [account] = await connection.query("INSERT INTO tags_guest_accounts (guest_app_id,stay_id,currency,status) SELECT id,?,currency,'open' FROM tags_guest_apps WHERE id=?", [result.insertId, guestAppId]);

        await connection.query("INSERT INTO tags_guest_account_entries (account_id,entry_type,source_type,source_id,idempotency_key,description,quantity,unit_amount,total_amount,currency,status,created_by_type,created_by_id) SELECT id,'charge','lodging',?,?,?, ?,?,?,?,'confirmed','owner',? FROM tags_guest_accounts WHERE stay_id=?", [String(result.insertId), `lodging:${result.insertId}`, `Reserva confirmada ${code} · total de alojamiento`, nights, nightlyRate, lodgingTotal, app.currency || "ARS", access.session?.id || access.session?.userId || null, result.insertId]);

        if (initialPaymentAmount > 0) {
            const paymentMethod = cleanGuestText(body.initialPaymentMethod, 40) || "transfer";
            const paymentReference = cleanGuestText(body.initialPaymentReference, 190) || null;
            const paymentNotes = cleanGuestText(body.initialPaymentNotes, 2000) || null;
            const actorId = access.session?.id || access.session?.userId || null;
            const [paymentEntry] = await connection.query("INSERT INTO tags_guest_account_entries (account_id,entry_type,source_type,idempotency_key,description,quantity,unit_amount,total_amount,currency,status,created_by_type,created_by_id) VALUES (?,'payment','manual',?,'Pago inicial de la reserva',1,?,? ,?,'confirmed','owner',?)", [account.insertId, `initial-payment:${result.insertId}`, initialPaymentAmount, -initialPaymentAmount, app.currency || "ARS", actorId]);
            await connection.query("INSERT INTO tags_guest_payments (account_id,account_entry_id,payment_method,amount,currency,reference,notes,received_by_id) VALUES (?,?,?,?,?,?,?,?)", [account.insertId, paymentEntry.insertId, paymentMethod, initialPaymentAmount, app.currency || "ARS", paymentReference, paymentNotes, actorId]);
            await connection.query("INSERT INTO tags_guest_audit_log (guest_app_id,stay_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,?,'owner',?,'payment.recorded','account_entry',?,?)", [guestAppId, result.insertId, actorId, paymentEntry.insertId, JSON.stringify({ amount: initialPaymentAmount, method: paymentMethod, initial: true })]);
        }

        await connection.query("INSERT INTO tags_guest_audit_log (guest_app_id,stay_id,actor_type,actor_id,action,entity_type,entity_id) VALUES (?,?,'owner',?,'reservation.created','reservation',?)", [guestAppId, result.insertId, access.session?.id || access.session?.userId || null, result.insertId]);

        await connection.commit();

        let accessEmail = { sent: false, reason: "Envío pendiente de confirmación." };
        if (body.sendAccessEmail === true) {
            try { accessEmail = await sendReservationAccessEmail(result.insertId, guestAppId, access.session?.id || access.session?.userId || null); }
            catch (emailError) { console.error("GUEST RESERVATION ACCESS EMAIL ERROR:", emailError); accessEmail = { sent: false, reason: emailError.message }; }
        }

        return Response.json({ ok: true, reservationId: result.insertId, stayCode: code, paymentRecorded: initialPaymentAmount, accessEmail }, { status: 201 });

    } catch (error) {
        await connection.rollback();

        console.error("GUEST RESERVATION CREATE ERROR:", error);

        return Response.json({ ok: false, error: "No se pudo crear la reserva" }, { status: 500 });

    } finally { connection.release();
 }
}

export async function PATCH(req) {
    const body=await req.json().catch(()=>null);
if(!body)return guestError("Cuerpo JSON inválido");

    const businessId=Number(body.businessId||0),guestAppId=Number(body.guestAppId||0),stayId=Number(body.stayId||0),unitId=Number(body.unitId||0),starts=parseLodgingDateInput(body.startsAt),ends=parseLodgingDateInput(body.endsAt);

    const firstName=cleanGuestText(body.firstName,100),lastName=cleanGuestText(body.lastName,100),documentNumber=cleanGuestText(body.documentNumber,80),email=cleanGuestText(body.email,190)?.toLowerCase(),phone=cleanGuestText(body.phone,60);

    const access=await getGuestAdminAccess({businessId,guestAppId,permission:"guest.stays.manage"});
if(!access.allowed)return guestAdminAccessResponse(access);

    if(!stayId||!unitId||!firstName||!lastName||!documentNumber||!email||!phone||!starts||!ends||ends<=starts)return guestError("Completá correctamente titular, unidad y fechas");

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||phone.replace(/\D/g,"").length<8)return guestError("Email o teléfono inválidos");

    const connection=await db.getConnection();
try{await connection.beginTransaction();
const app=await lockGuestInventory(connection,{guestAppId,businessId});
if(!app){await connection.rollback();return guestError("Instancia no encontrada",404)}
const[rows]=await connection.query("SELECT primary_guest_id,status,stay_code FROM tags_guest_stays WHERE id=? AND guest_app_id=? LIMIT 1 FOR UPDATE",[stayId,guestAppId]);
if(!rows[0]){await connection.rollback();
return guestError("Reserva no encontrada",404)}if(rows[0].status===GUEST_STAY_STATUS.ACTIVE||rows[0].status===GUEST_STAY_STATUS.CHECKED_OUT){await connection.rollback();
return guestError("Una reserva con check-in confirmado ya no puede modificarse",409)}
const[currentGuests]=await connection.query("SELECT id,document_number FROM tags_guest_people WHERE id=? AND business_id=? LIMIT 1 FOR UPDATE",[rows[0].primary_guest_id,businessId]);
if(!currentGuests[0]){await connection.rollback();return guestError("El titular actual de la reserva no existe",409)}
const unit=await lockActiveGuestUnit(connection,{guestAppId,unitId});
if(!unit){await connection.rollback();return guestError("Unidad inválida",404)}
const settings=parseGuestJson(app.settings_json),guests=normalizeGuestCounts(body),capacity=validateUnitCapacity({unit,...guests,settings});
if(!capacity.ok){await connection.rollback();return guestError(capacity.error,409,capacity.code)}
const overlap=await findBlockingStay(connection,{guestAppId,unitId,startsAt:starts,endsAt:ends,excludeStayId:stayId});
if(overlap){await connection.rollback();
return guestError("La unidad ya está ocupada en ese período",409)}
const unitBlock=await findBlockingUnitBlock(connection,{guestAppId,unitId,startsAt:starts,endsAt:ends});
if(unitBlock){await connection.rollback();return guestError(`La unidad está bloqueada en esas fechas${unitBlock.reason?`: ${unitBlock.reason}`:""}`,409,"UNIT_BLOCKED")}
const nights=countLodgingNights(starts,ends),nightlyRate=Math.max(0,Number(body.nightlyRate||0)),lodgingTotal=Number((nightlyRate*nights).toFixed(2)),depositPercentage=Math.max(0,Math.min(100,Number(body.depositPercentage||0))),depositRequired=Number((lodgingTotal*depositPercentage/100).toFixed(2));
const currentGuest=currentGuests[0];
let primaryGuestId=Number(currentGuest.id);
const holderChanged=String(currentGuest.document_number||"").trim()!==documentNumber;
if(holderChanged){
const[matchingGuests]=await connection.query("SELECT id FROM tags_guest_people WHERE business_id=? AND document_number=? LIMIT 1 FOR UPDATE",[businessId,documentNumber]);
primaryGuestId=Number(matchingGuests[0]?.id||0);
if(primaryGuestId){
await connection.query("UPDATE tags_guest_people SET name=?,email=?,phone=?,document_type='DNI',updated_at=NOW() WHERE id=?",[`${firstName} ${lastName}`,email,phone,primaryGuestId]);
}else{
const[createdGuest]=await connection.query("INSERT INTO tags_guest_people (business_id,name,email,phone,document_type,document_number) VALUES (?,?,?,?, 'DNI',?)",[businessId,`${firstName} ${lastName}`,email,phone,documentNumber]);
primaryGuestId=Number(createdGuest.insertId);
}
await connection.query("DELETE FROM tags_guest_stay_people WHERE stay_id=? AND role='primary'",[stayId]);
await connection.query("INSERT INTO tags_guest_stay_people (stay_id,guest_id,role) VALUES (?,?,'primary') ON DUPLICATE KEY UPDATE role='primary'",[stayId,primaryGuestId]);
await connection.query("UPDATE tags_guest_access_tokens SET revoked_at=NOW() WHERE stay_id=? AND guest_id=? AND revoked_at IS NULL",[stayId,currentGuest.id]);
await connection.query("UPDATE tags_guest_sessions SET revoked_at=NOW() WHERE stay_id=? AND guest_id=? AND revoked_at IS NULL",[stayId,currentGuest.id]);
await connection.query("INSERT INTO tags_guest_audit_log (guest_app_id,stay_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,?,'owner',?,'reservation.primary_guest_changed','reservation',?,?)",[guestAppId,stayId,access.session?.id||access.session?.userId||null,stayId,JSON.stringify({previousGuestId:Number(currentGuest.id),primaryGuestId})]);
}else{
await connection.query("UPDATE tags_guest_people SET name=?,email=?,phone=?,document_type='DNI',document_number=?,updated_at=NOW() WHERE id=?",[`${firstName} ${lastName}`,email,phone,documentNumber,primaryGuestId]);
}
await connection.query("UPDATE tags_guest_stays SET unit_id=?,primary_guest_id=?,starts_at=?,ends_at=?,adults=?,children=?,nightly_rate=?,lodging_total=?,deposit_percentage=?,deposit_required_amount=?,arrival_notes=?,expected_arrival_text=?,internal_notes=?,status=IF(status='no_show_rebooking','reserved',status),updated_at=NOW() WHERE id=?",[unitId,primaryGuestId,starts,ends,guests.adults,guests.children,nightlyRate,lodgingTotal,depositPercentage,depositRequired,cleanGuestText(body.arrivalNotes,2000)||null,cleanGuestText(body.expectedArrivalText,120)||null,cleanGuestText(body.internalNotes,2000)||null,stayId]);
const[accounts]=await connection.query("SELECT id FROM tags_guest_accounts WHERE stay_id=? LIMIT 1",[stayId]);
if(accounts[0]){
if(rows[0].status==='no_show_rebooking'){
const[[noShowAdjustment]]=await connection.query("SELECT COALESCE(SUM(total_amount),0) total FROM tags_guest_account_entries WHERE account_id=? AND source_type='no_show' AND source_id=? AND status='confirmed'",[accounts[0].id,String(stayId)]),amount=Number(noShowAdjustment?.total||0);
if(Math.abs(amount)>0.009)await connection.query("INSERT INTO tags_guest_account_entries (account_id,entry_type,source_type,source_id,idempotency_key,description,quantity,unit_amount,total_amount,currency,status,metadata_json,created_by_type,created_by_id) VALUES (?,'adjustment','no_show_reactivation',?,?,?,1,?,?,?,'confirmed',?,'owner',?) ON DUPLICATE KEY UPDATE id=id",[accounts[0].id,String(stayId),`no-show-reactivation:${stayId}`,`Reactivación de reserva ${rows[0].stay_code}`,-amount,-amount,app.currency||"ARS",JSON.stringify({reversedNoShowAdjustment:amount}),access.session?.id||access.session?.userId||null]);
}
await connection.query("INSERT INTO tags_guest_account_entries (account_id,entry_type,source_type,source_id,idempotency_key,description,quantity,unit_amount,total_amount,currency,status,created_by_type,created_by_id) VALUES (?,'charge','lodging',?,?,?,?,?,?,?,'confirmed','owner',?) ON DUPLICATE KEY UPDATE description=VALUES(description),quantity=VALUES(quantity),unit_amount=VALUES(unit_amount),total_amount=VALUES(total_amount)",[accounts[0].id,String(stayId),`lodging:${stayId}`,`Alojamiento ${rows[0].stay_code} · ${nights} noches`,nights,nightlyRate,lodgingTotal,app.currency||"ARS",access.session?.id||access.session?.userId||null]);
}
await connection.commit();
return Response.json({ok:true})}catch(error){await connection.rollback();
console.error("GUEST RESERVATION UPDATE ERROR:",error);
return Response.json({ok:false,error:"No se pudo modificar la reserva"},{status:500})}finally{connection.release()}
}

export async function DELETE(req) {
    const body=await req.json().catch(()=>null);
if(!body)return guestError("Cuerpo JSON inválido");
const businessId=Number(body.businessId||0),guestAppId=Number(body.guestAppId||0),stayId=Number(body.stayId||0),reason=cleanGuestText(body.reason,1000)||"Cancelación manual desde la administración",access=await getGuestAdminAccess({businessId,guestAppId,permission:"guest.stays.manage"});
if(!access.allowed)return guestAdminAccessResponse(access);

    const connection=await db.getConnection();
try{await connection.beginTransaction();
const app=await lockGuestInventory(connection,{guestAppId,businessId});
if(!app){await connection.rollback();return guestError("Instancia no encontrada",404)}
const[rows]=await connection.query("SELECT stay_code,status FROM tags_guest_stays WHERE id=? AND guest_app_id=? LIMIT 1 FOR UPDATE",[stayId,guestAppId]);
if(!rows[0]){await connection.rollback();
return guestError("Reserva no encontrada",404)}if(rows[0].status===GUEST_STAY_STATUS.ACTIVE||rows[0].status===GUEST_STAY_STATUS.CHECKED_OUT){await connection.rollback();
return guestError("No se puede cancelar una estadía iniciada o concluida",409)}
if(rows[0].status===GUEST_STAY_STATUS.CANCELLED){await connection.commit();return Response.json({ok:true,status:GUEST_STAY_STATUS.CANCELLED,alreadyCancelled:true})}
const actorId=access.session?.id||access.session?.userId||null;
await connection.query("UPDATE tags_guest_stays SET status='cancelled',updated_at=NOW() WHERE id=? AND guest_app_id=?",[stayId,guestAppId]);
await connection.query("UPDATE tags_guest_sessions SET revoked_at=NOW() WHERE stay_id=? AND revoked_at IS NULL",[stayId]);
await connection.query("UPDATE tags_guest_access_tokens SET revoked_at=NOW() WHERE stay_id=? AND revoked_at IS NULL",[stayId]);
await connection.query("INSERT INTO tags_guest_audit_log (guest_app_id,stay_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,?,'owner',?,'reservation.cancelled','reservation',?,?)",[guestAppId,stayId,actorId,stayId,JSON.stringify({reason,previousStatus:rows[0].status,stayCode:rows[0].stay_code})]);
await connection.commit();
return Response.json({ok:true,status:GUEST_STAY_STATUS.CANCELLED})}catch(error){await connection.rollback();
console.error("GUEST RESERVATION CANCEL ERROR:",error);
return Response.json({ok:false,error:"No se pudo cancelar la reserva"},{status:500})}finally{connection.release()}
}

