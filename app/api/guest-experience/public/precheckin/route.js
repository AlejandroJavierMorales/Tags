export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestPublicSession } from "@/app/modules/guest-experience/lib/getGuestPublicSession";
import { cleanGuestText, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const validPhone = value => String(value || "").replace(/\D/g, "").length >= 8;
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
const splitName = value => { const parts=String(value||"").trim().split(/\s+/); return { firstName:parts.shift()||"",lastName:parts.join(" ") }; };
const personPayload = person => ({
    id: Number(person?.id || 0), firstName: cleanGuestText(person?.firstName,100), lastName: cleanGuestText(person?.lastName,100),
    documentType: cleanGuestText(person?.documentType,40)||"DNI", documentNumber: cleanGuestText(person?.documentNumber,80),
    nationality: cleanGuestText(person?.nationality,100), dateOfBirth: cleanGuestText(person?.dateOfBirth,10), address: cleanGuestText(person?.address,1000)
});
const publicPerson = row => ({ ...splitName(row.name), id:row.id,email:row.email||"",phone:row.phone||"",documentType:row.document_type||"DNI",documentNumber:row.document_number||"",nationality:row.nationality||"",dateOfBirth:row.date_of_birth||"",address:row.address||"",privacyConsent:Boolean(row.privacy_consent_at),role:row.role });

async function sessionFor(req) {
    const slug = new URL(req.url).searchParams.get("slug");
    return { slug, session: await getGuestPublicSession(slug) };
}

export async function GET(req) {
    const { session } = await sessionFor(req);
    if (!session) return guestError("La sesión venció o no es válida",401);
    const [people] = await db.query(`SELECT g.*,sp.role FROM tags_guest_stay_people sp INNER JOIN tags_guest_people g ON g.id=sp.guest_id WHERE sp.stay_id=? ORDER BY sp.role='primary' DESC,sp.created_at,g.id`,[session.stay_id]);
    const [records] = await db.query("SELECT * FROM tags_guest_precheckins WHERE stay_id=? LIMIT 1",[session.stay_id]);
    let primary = people.find(item=>item.role==="primary") || people.find(item=>Number(item.id)===Number(session.guest_id));
    const [reservationPrimaryRows] = await db.query("SELECT g.*, 'primary' role FROM tags_guest_stays s INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id WHERE s.id=? LIMIT 1",[session.stay_id]);
    const reservationPrimary = reservationPrimaryRows[0];
    if (!primary || (!primary.document_number && reservationPrimary?.document_number)) primary = reservationPrimary;
    if (!primary) { const [primaryRows]=await db.query("SELECT *, 'primary' role FROM tags_guest_people WHERE id=? LIMIT 1",[session.guest_id]); primary=primaryRows[0]; }
    if (!primary) return guestError("No se encontraron los datos del titular",404);
    return Response.json({ok:true,status:records[0]?.status||"draft",readOnly:["reviewed","checked_in"].includes(records[0]?.status)||["active","checked_out"].includes(session.stay_status),expectedCompanions:Math.max(0,Number(session.adults||0)+Number(session.children||0)-1),primary:publicPerson(primary),companions:people.filter(item=>item.role==="companion").map(publicPerson),vehicle:{plate:records[0]?.vehicle_plate||"",makeModel:records[0]?.vehicle_make_model||"",color:records[0]?.vehicle_color||""},expectedArrivalText:session.expected_arrival_text||"",guestNotes:records[0]?.guest_notes||""});
}

export async function PATCH(req) {
    const body = await req.json().catch(()=>null);
    if (!body) return guestError("Los datos enviados no son válidos");
    const { session } = await sessionFor(req);
    if (!session) return guestError("La sesión venció o no es válida",401);
    if (["active","checked_out","cancelled"].includes(session.stay_status)) return guestError("El pre-check-in ya no puede modificarse",409);
    const submit = body.submit===true, primary=personPayload(body.primary), companions=Array.isArray(body.companions)?body.companions.map(personPayload):[];
    const email=cleanGuestText(body.primary?.email,190),phone=cleanGuestText(body.primary?.phone,60),expected=Math.max(0,Number(session.adults||0)+Number(session.children||0)-1),consent=body.primary?.privacyConsent===true;
    if (email&&!validEmail(email)) return guestError("El email no tiene un formato válido");
    if (phone&&!validPhone(phone)) return guestError("El teléfono no tiene un formato válido");
    if (primary.dateOfBirth&&!validDate(primary.dateOfBirth)) return guestError("La fecha de nacimiento no es válida");
    for (const person of companions) if (person.dateOfBirth&&!validDate(person.dateOfBirth)) return guestError("Revisá las fechas de nacimiento de los acompañantes");
    if (submit) {
        if (!primary.firstName||!primary.lastName||!primary.documentNumber||!primary.nationality||!primary.dateOfBirth||!primary.address||!email||!phone) return guestError("Completá todos los datos obligatorios del titular");
        if (!consent) return guestError("Debés aceptar las políticas y el tratamiento de datos");
        if (companions.length!==expected) return guestError(`Deben cargarse ${expected} acompañante${expected===1?"":"s"}`);
        if (companions.some(person=>!person.firstName||!person.lastName||!person.documentNumber||!person.nationality||!person.dateOfBirth)) return guestError("Completá nombre, apellido, documento, nacionalidad y nacimiento de cada acompañante");
    }
    const documents=[primary.documentNumber,...companions.map(item=>item.documentNumber)].filter(Boolean).map(item=>item.replace(/\D/g,""));
    if (new Set(documents).size!==documents.length) return guestError("No puede repetirse el mismo documento entre pasajeros");
    const connection=await db.getConnection();
    try {
        await connection.beginTransaction();
        const [locked]=await connection.query("SELECT s.id,s.status,s.primary_guest_id,a.business_id FROM tags_guest_stays s INNER JOIN tags_guest_apps a ON a.id=s.guest_app_id WHERE s.id=? AND s.guest_app_id=? LIMIT 1 FOR UPDATE",[session.stay_id,session.id]);
        if (!locked[0]) { await connection.rollback(); return guestError("Estadía no encontrada",404); }
        const [currentRecords]=await connection.query("SELECT status FROM tags_guest_precheckins WHERE stay_id=? LIMIT 1 FOR UPDATE",[session.stay_id]);
        if (["reviewed","checked_in"].includes(currentRecords[0]?.status)) { await connection.rollback(); return guestError("El pre-check-in ya fue revisado y no puede modificarse",409); }
        if (primary.documentNumber) {
            const [duplicate]=await connection.query("SELECT id FROM tags_guest_people WHERE business_id=? AND document_number=? AND id<>? LIMIT 1",[session.business_id,primary.documentNumber,session.guest_id]);
            if (duplicate[0]) { await connection.rollback(); return guestError("Ya existe otra persona con el documento del titular",409); }
        }
        await connection.query(`UPDATE tags_guest_people SET name=?,email=?,phone=?,document_type=?,document_number=?,nationality=?,date_of_birth=?,address=?,privacy_consent_at=IF(?,COALESCE(privacy_consent_at,NOW()),privacy_consent_at) WHERE id=? AND business_id=?`,[`${primary.firstName} ${primary.lastName}`.trim()||session.guest_name,email||null,phone||null,primary.documentType,primary.documentNumber||null,primary.nationality||null,primary.dateOfBirth||null,primary.address||null,consent?1:0,session.guest_id,session.business_id]);
        const [linked]=await connection.query("SELECT guest_id FROM tags_guest_stay_people WHERE stay_id=? AND role='companion'",[session.stay_id]);
        const linkedIds=new Set(linked.map(item=>Number(item.guest_id))),keepIds=[];
        for (const person of companions) {
            if (!person.firstName&&!person.lastName&&!person.documentNumber) continue;
            let personId=person.id;
            if (personId&&!linkedIds.has(personId)) personId=0;
            if (!personId&&person.documentNumber) {
                const [found]=await connection.query("SELECT id FROM tags_guest_people WHERE business_id=? AND document_number=? LIMIT 1",[session.business_id,person.documentNumber]);
                personId=Number(found[0]?.id||0);
            }
            const name=`${person.firstName} ${person.lastName}`.trim()||"Acompañante";
            if (personId) await connection.query("UPDATE tags_guest_people SET name=?,document_type=?,document_number=?,nationality=?,date_of_birth=?,address=? WHERE id=? AND business_id=?",[name,person.documentType,person.documentNumber||null,person.nationality||null,person.dateOfBirth||null,person.address||null,personId,session.business_id]);
            else { const [created]=await connection.query("INSERT INTO tags_guest_people (business_id,name,document_type,document_number,nationality,date_of_birth,address) VALUES (?,?,?,?,?,?,?)",[session.business_id,name,person.documentType,person.documentNumber||null,person.nationality||null,person.dateOfBirth||null,person.address||null]); personId=created.insertId; }
            await connection.query("INSERT IGNORE INTO tags_guest_stay_people (stay_id,guest_id,role) VALUES (?,?,'companion')",[session.stay_id,personId]);
            keepIds.push(Number(personId));
        }
        const removeIds=[...linkedIds].filter(id=>!keepIds.includes(id));
        if (removeIds.length) await connection.query(`DELETE FROM tags_guest_stay_people WHERE stay_id=? AND role='companion' AND guest_id IN (${removeIds.map(()=>"?").join(",")})`,[session.stay_id,...removeIds]);
        const targetStatus=submit?"submitted":"draft";
        await connection.query(`INSERT INTO tags_guest_precheckins (guest_app_id,stay_id,status,vehicle_plate,vehicle_make_model,vehicle_color,guest_notes,submitted_at) VALUES (?,?,?,?,?,?,?,IF(?='submitted',NOW(),NULL)) ON DUPLICATE KEY UPDATE status=VALUES(status),vehicle_plate=VALUES(vehicle_plate),vehicle_make_model=VALUES(vehicle_make_model),vehicle_color=VALUES(vehicle_color),guest_notes=VALUES(guest_notes),submitted_at=IF(VALUES(status)='submitted',NOW(),submitted_at)`,[session.id,session.stay_id,targetStatus,cleanGuestText(body.vehicle?.plate,30)||null,cleanGuestText(body.vehicle?.makeModel,190)||null,cleanGuestText(body.vehicle?.color,80)||null,cleanGuestText(body.guestNotes,2000)||null,targetStatus]);
        await connection.query("UPDATE tags_guest_stays SET expected_arrival_text=?,updated_at=NOW() WHERE id=?",[cleanGuestText(body.expectedArrivalText,120)||null,session.stay_id]);
        await connection.query("INSERT INTO tags_guest_audit_log (guest_app_id,stay_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,?,'guest',?,?, 'precheckin',?,?)",[session.id,session.stay_id,session.guest_id,submit?"precheckin.submitted":"precheckin.draft_saved",session.stay_id,JSON.stringify({passengers:1+keepIds.length})]);
        if (submit&&currentRecords[0]?.status!=="submitted") await connection.query("INSERT INTO tags_guest_communications (guest_app_id,stay_id,guest_id,event_code,direction,channel,status,sent_at,attempts,created_by_type) VALUES (?,?,?,'precheckin_submitted','inbound','web','completed',NOW(),1,'guest')",[session.id,session.stay_id,session.guest_id]);
        await connection.commit();
        return Response.json({ok:true,status:targetStatus,message:submit?"Pre-check-in enviado correctamente":"Borrador guardado"});
    } catch(error) {
        await connection.rollback();
        console.error("GUEST PUBLIC PRECHECKIN ERROR:",error);
        return Response.json({ok:false,error:"No se pudo guardar el pre-check-in"},{status:500});
    } finally { connection.release(); }
}
