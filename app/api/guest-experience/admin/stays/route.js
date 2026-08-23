export const runtime = "nodejs";

export const dynamic = "force-dynamic";


import { db } from "@/app/lib/tags-db";

import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";

import { cleanGuestText, createGuestToken, getGuestVerificationUrl, guestError, hashGuestToken, parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";
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

    const starts = new Date(`${body.startsAt}T12:00:00`), ends = new Date(`${body.endsAt}T12:00:00`);

    const access = await getGuestAdminAccess({ businessId, guestAppId });

    if (!access.allowed) return guestAdminAccessResponse(access);

    if (!firstName || !lastName || !documentNumber || !email || !phone) return guestError("Nombre, apellido, DNI, teléfono y email del titular son obligatorios");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return guestError("El email no tiene un formato válido");

    if (phone.replace(/\D/g, "").length < 8) return guestError("El teléfono no tiene un formato válido");

    if (!unitId || Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends <= starts) return guestError("Unidad y fechas válidas son requeridas");

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [apps] = await connection.query("SELECT settings_json,currency FROM tags_guest_apps WHERE id=? AND business_id=? LIMIT 1 FOR UPDATE", [guestAppId, businessId]);

        const settings = parseGuestJson(apps[0]?.settings_json), prefix = cleanGuestText(settings.reservationCodePrefix, 40), padding = Math.max(1, Number(settings.reservationCodePadding || 0));

        if (!prefix || !padding) { await connection.rollback();
 return guestError("Configurá primero la base automática del código de reservas", 409);
 }
        const nextCounter = Number(settings.reservationCodeCounter || 0) + 1;

        const code = `${prefix}${String(nextCounter).padStart(padding, "0")}`.toUpperCase();

        const nights = Math.max(1, Math.round((ends - starts) / 86400000)), nightlyRate = Math.max(0, Number(body.nightlyRate || 0)), lodgingTotal = Number((nightlyRate * nights).toFixed(2));

        const depositPercentage = Math.max(0, Math.min(100, Number(body.depositPercentage ?? settings.depositPercentage ?? 0))), depositRequired = Number((lodgingTotal * depositPercentage / 100).toFixed(2));

        const [units] = await connection.query("SELECT id FROM tags_guest_units WHERE id=? AND guest_app_id=? AND is_active=1 LIMIT 1 FOR UPDATE", [unitId, guestAppId]);

        if (!units.length) { await connection.rollback();
 return guestError("Unidad inválida", 404);
 }
        const [overlap] = await connection.query("SELECT id FROM tags_guest_stays WHERE guest_app_id=? AND unit_id=? AND status NOT IN ('cancelled','checked_out') AND starts_at<? AND ends_at>? LIMIT 1 FOR UPDATE", [guestAppId, unitId, ends, starts]);

        if (overlap.length) { await connection.rollback();
 return guestError("La unidad ya está ocupada en ese período", 409);
 }
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
        const [result] = await connection.query("INSERT INTO tags_guest_stays (guest_app_id,unit_id,primary_guest_id,stay_code,status,starts_at,ends_at,adults,children,nightly_rate,lodging_total,deposit_percentage,deposit_required_amount,arrival_notes,expected_arrival_text,internal_notes,created_by_id) VALUES (?,?,?,?,'reserved',?,?,?,?,?,?,?,?,?,?,?,?)", [guestAppId, unitId, guestId, code, starts, ends, Math.max(1, Number(body.adults || 1)), Math.max(0, Number(body.children || 0)), nightlyRate, lodgingTotal, depositPercentage, depositRequired, cleanGuestText(body.arrivalNotes, 2000) || null, cleanGuestText(body.expectedArrivalText, 120) || null, cleanGuestText(body.internalNotes, 2000) || null, access.session?.id || access.session?.userId || null]);

        settings.reservationCodeCounter = nextCounter;

        await connection.query("UPDATE tags_guest_apps SET settings_json=?,updated_at=NOW() WHERE id=?", [JSON.stringify(settings), guestAppId]);

        await connection.query("INSERT INTO tags_guest_stay_people (stay_id,guest_id,role) VALUES (?,?,'primary')", [result.insertId, guestId]);

        await connection.query("INSERT INTO tags_guest_accounts (guest_app_id,stay_id,currency,status) SELECT id,?,currency,'open' FROM tags_guest_apps WHERE id=?", [result.insertId, guestAppId]);

        await connection.query("INSERT INTO tags_guest_account_entries (account_id,entry_type,source_type,source_id,idempotency_key,description,quantity,unit_amount,total_amount,currency,status,created_by_type,created_by_id) SELECT id,'charge','lodging',?,?,?, ?,?,?,?,'confirmed','owner',? FROM tags_guest_accounts WHERE stay_id=?", [String(result.insertId), `lodging:${result.insertId}`, `Reserva confirmada ${code} · total de alojamiento`, nights, nightlyRate, lodgingTotal, apps[0].currency || "ARS", access.session?.id || access.session?.userId || null, result.insertId]);

        await connection.query("INSERT INTO tags_guest_audit_log (guest_app_id,stay_id,actor_type,actor_id,action,entity_type,entity_id) VALUES (?,?,'owner',?,'reservation.created','reservation',?)", [guestAppId, result.insertId, access.session?.id || access.session?.userId || null, result.insertId]);

        await connection.commit();

        let accessEmail = { sent: false, reason: "No se pudo generar el acceso." };
        try { accessEmail = await sendReservationAccessEmail(result.insertId, guestAppId, access.session?.id || access.session?.userId || null); }
        catch (emailError) { console.error("GUEST RESERVATION ACCESS EMAIL ERROR:", emailError); accessEmail = { sent: false, reason: emailError.message }; }

        return Response.json({ ok: true, reservationId: result.insertId, stayCode: code, accessEmail }, { status: 201 });

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

    const businessId=Number(body.businessId||0),guestAppId=Number(body.guestAppId||0),stayId=Number(body.stayId||0),unitId=Number(body.unitId||0),starts=new Date(`${body.startsAt}T12:00:00`),ends=new Date(`${body.endsAt}T12:00:00`);

    const firstName=cleanGuestText(body.firstName,100),lastName=cleanGuestText(body.lastName,100),documentNumber=cleanGuestText(body.documentNumber,80),email=cleanGuestText(body.email,190)?.toLowerCase(),phone=cleanGuestText(body.phone,60);

    const access=await getGuestAdminAccess({businessId,guestAppId});
if(!access.allowed)return guestAdminAccessResponse(access);

    if(!stayId||!unitId||!firstName||!lastName||!documentNumber||!email||!phone||Number.isNaN(starts.getTime())||Number.isNaN(ends.getTime())||ends<=starts)return guestError("Completá correctamente titular, unidad y fechas");

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||phone.replace(/\D/g,"").length<8)return guestError("Email o teléfono inválidos");

    const connection=await db.getConnection();
try{await connection.beginTransaction();
const[rows]=await connection.query("SELECT s.primary_guest_id,s.status,s.stay_code,a.currency FROM tags_guest_stays s INNER JOIN tags_guest_apps a ON a.id=s.guest_app_id WHERE s.id=? AND s.guest_app_id=? LIMIT 1 FOR UPDATE",[stayId,guestAppId]);
if(!rows[0]){await connection.rollback();
return guestError("Reserva no encontrada",404)}if(rows[0].status==='active'||rows[0].status==='checked_out'){await connection.rollback();
return guestError("Una reserva con check-in confirmado ya no puede modificarse",409)}const[overlap]=await connection.query("SELECT id FROM tags_guest_stays WHERE guest_app_id=? AND unit_id=? AND id<>? AND status NOT IN ('cancelled','checked_out') AND starts_at<? AND ends_at>? LIMIT 1 FOR UPDATE",[guestAppId,unitId,stayId,ends,starts]);
if(overlap.length){await connection.rollback();
return guestError("La unidad ya está ocupada en ese período",409)}const nights=Math.max(1,Math.round((ends-starts)/86400000)),nightlyRate=Math.max(0,Number(body.nightlyRate||0)),lodgingTotal=Number((nightlyRate*nights).toFixed(2)),depositPercentage=Math.max(0,Math.min(100,Number(body.depositPercentage||0))),depositRequired=Number((lodgingTotal*depositPercentage/100).toFixed(2));
await connection.query("UPDATE tags_guest_people SET name=?,email=?,phone=?,document_type='DNI',document_number=? WHERE id=?",[`${firstName} ${lastName}`,email,phone,documentNumber,rows[0].primary_guest_id]);
await connection.query("UPDATE tags_guest_stays SET unit_id=?,starts_at=?,ends_at=?,adults=?,children=?,nightly_rate=?,lodging_total=?,deposit_percentage=?,deposit_required_amount=?,arrival_notes=?,expected_arrival_text=?,internal_notes=?,updated_at=NOW() WHERE id=?",[unitId,starts,ends,Math.max(1,Number(body.adults||1)),Math.max(0,Number(body.children||0)),nightlyRate,lodgingTotal,depositPercentage,depositRequired,cleanGuestText(body.arrivalNotes,2000)||null,cleanGuestText(body.expectedArrivalText,120)||null,cleanGuestText(body.internalNotes,2000)||null,stayId]);
const[accounts]=await connection.query("SELECT id FROM tags_guest_accounts WHERE stay_id=? LIMIT 1",[stayId]);
if(accounts[0])await connection.query("INSERT INTO tags_guest_account_entries (account_id,entry_type,source_type,source_id,idempotency_key,description,quantity,unit_amount,total_amount,currency,status,created_by_type,created_by_id) VALUES (?,'charge','lodging',?,?,?,?,?,?,?,'confirmed','owner',?) ON DUPLICATE KEY UPDATE description=VALUES(description),quantity=VALUES(quantity),unit_amount=VALUES(unit_amount),total_amount=VALUES(total_amount)",[accounts[0].id,String(stayId),`lodging:${stayId}`,`Alojamiento ${rows[0].stay_code} · ${nights} noches`,nights,nightlyRate,lodgingTotal,rows[0].currency||"ARS",access.session?.id||access.session?.userId||null]);
await connection.commit();
return Response.json({ok:true})}catch(error){await connection.rollback();
console.error("GUEST RESERVATION UPDATE ERROR:",error);
return Response.json({ok:false,error:"No se pudo modificar la reserva"},{status:500})}finally{connection.release()}
}

export async function DELETE(req) {
    const body=await req.json().catch(()=>null);
if(!body)return guestError("Cuerpo JSON inválido");
const businessId=Number(body.businessId||0),guestAppId=Number(body.guestAppId||0),stayId=Number(body.stayId||0),access=await getGuestAdminAccess({businessId,guestAppId});
if(!access.allowed)return guestAdminAccessResponse(access);

    const connection=await db.getConnection();
try{await connection.beginTransaction();
const[apps]=await connection.query("SELECT settings_json FROM tags_guest_apps WHERE id=? AND business_id=? LIMIT 1 FOR UPDATE",[guestAppId,businessId]);
const[rows]=await connection.query("SELECT stay_code,status FROM tags_guest_stays WHERE id=? AND guest_app_id=? LIMIT 1 FOR UPDATE",[stayId,guestAppId]);
if(!rows[0]){await connection.rollback();
return guestError("Reserva no encontrada",404)}if(rows[0].status==='active'||rows[0].status==='checked_out'){await connection.rollback();
return guestError("No se puede eliminar una estadía iniciada",409)}const settings=parseGuestJson(apps[0]?.settings_json),current=Number(settings.reservationCodeCounter||0),lastCode=`${settings.reservationCodePrefix||''}${String(current).padStart(Number(settings.reservationCodePadding||1),'0')}`.toUpperCase();
const[accounts]=await connection.query("SELECT id FROM tags_guest_accounts WHERE stay_id=?",[stayId]);
for(const account of accounts){await connection.query("DELETE FROM tags_guest_payments WHERE account_id=?",[account.id]);
await connection.query("DELETE FROM tags_guest_account_entries WHERE account_id=?",[account.id])}await connection.query("DELETE FROM tags_guest_accounts WHERE stay_id=?",[stayId]);
await connection.query("DELETE FROM tags_guest_sessions WHERE stay_id=?",[stayId]);
await connection.query("DELETE FROM tags_guest_access_tokens WHERE stay_id=?",[stayId]);
await connection.query("DELETE FROM tags_guest_precheckins WHERE stay_id=?",[stayId]);
await connection.query("DELETE FROM tags_guest_stay_people WHERE stay_id=?",[stayId]);
await connection.query("DELETE FROM tags_guest_stays WHERE id=?",[stayId]);
if(rows[0].stay_code.toUpperCase()===lastCode&&current>0){settings.reservationCodeCounter=current-1;
await connection.query("UPDATE tags_guest_apps SET settings_json=? WHERE id=?",[JSON.stringify(settings),guestAppId])}await connection.commit();
return Response.json({ok:true,counterDecremented:rows[0].stay_code.toUpperCase()===lastCode})}catch(error){await connection.rollback();
console.error("GUEST RESERVATION DELETE ERROR:",error);
return Response.json({ok:false,error:"No se pudo eliminar la reserva"},{status:500})}finally{connection.release()}
}

