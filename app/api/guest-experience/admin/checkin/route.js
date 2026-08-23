export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, guestError, parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function GET(req) {
    const q = new URL(req.url).searchParams;
    const businessId = Number(q.get("businessId") || 0);
    const guestAppId = Number(q.get("guestAppId") || 0);
    const stayId = Number(q.get("stayId") || 0);
    const access = await getGuestAdminAccess({ businessId, guestAppId });
    if (!access.allowed) return guestAdminAccessResponse(access);

    const [stays] = await db.query(`SELECT s.*,u.name unit_name,g.name guest_name,g.email guest_email,g.phone guest_phone,g.document_number,
        pc.status precheckin_status,pc.vehicle_plate,pc.vehicle_make_model,pc.vehicle_color,pc.guest_notes,pc.internal_notes
        FROM tags_guest_stays s INNER JOIN tags_guest_units u ON u.id=s.unit_id INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id
        LEFT JOIN tags_guest_precheckins pc ON pc.stay_id=s.id WHERE s.id=? AND s.guest_app_id=? LIMIT 1`, [stayId, guestAppId]);
    if (!stays[0]) return guestError("Reserva no encontrada", 404);
    const [passengers] = await db.query("SELECT g.id,g.name,g.document_number,sp.role FROM tags_guest_stay_people sp INNER JOIN tags_guest_people g ON g.id=sp.guest_id WHERE sp.stay_id=? ORDER BY sp.role='primary' DESC,g.name", [stayId]);
    return Response.json({ ok: true, reservation: stays[0], passengers });
}

export async function POST(req) {
    const body = await req.json().catch(() => null);
    if (!body) return guestError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0);
    const guestAppId = Number(body.guestAppId || 0);
    const stayId = Number(body.stayId || 0);
    const complete = body.complete === true;
    const action = String(body.action || "");
    const access = await getGuestAdminAccess({ businessId, guestAppId });
    if (!access.allowed) return guestAdminAccessResponse(access);
    const companions = Array.isArray(body.companions) ? body.companions : [];
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        const [stays] = await connection.query(`SELECT s.id,s.status,s.adults,s.children,s.starts_at,s.ends_at,a.settings_json
            FROM tags_guest_stays s INNER JOIN tags_guest_apps a ON a.id=s.guest_app_id AND a.business_id=?
            WHERE s.id=? AND s.guest_app_id=? LIMIT 1 FOR UPDATE`, [businessId, stayId, guestAppId]);
        const stay = stays[0];
        if (!stay) { await connection.rollback(); return guestError("Reserva no encontrada", 404); }

        if (action === "checkout") {
            if (stay.status !== "active") {
                await connection.rollback();
                return guestError("El checkout solo está disponible después de confirmar el check-in", 409);
            }
            const settings = parseGuestJson(stay.settings_json);
            const checkoutTime = String(settings.checkoutTime || "10:00");
            const checkoutDate = String(stay.ends_at).slice(0, 10);
            const checkoutAt = new Date(`${checkoutDate}T${checkoutTime}:00-03:00`);
            const earlyCheckout = Date.now() < checkoutAt.getTime();
            if (earlyCheckout && body.confirmEarly !== true) {
                await connection.rollback();
                return Response.json({ ok: false, code: "early_checkout", error: `El checkout previsto es el ${checkoutDate.split("-").reverse().join("/")} a las ${checkoutTime} hs.` }, { status: 409 });
            }
            await connection.query("UPDATE tags_guest_stays SET status='checked_out',checked_out_at=NOW(),updated_at=NOW() WHERE id=? AND guest_app_id=?", [stayId, guestAppId]);
            await connection.query("INSERT INTO tags_guest_audit_log (guest_app_id,stay_id,actor_type,actor_id,action,entity_type,entity_id) VALUES (?,?,'owner',?,'checkout.completed','reservation',?)", [guestAppId, stayId, access.session?.id || access.session?.userId || null, stayId]);
            await connection.commit();
            return Response.json({ ok: true, status: "checked_out", earlyCheckout });
        }

        for (const person of companions) {
            if (!cleanGuestText(person.firstName, 100) || !cleanGuestText(person.lastName, 100) || !cleanGuestText(person.documentNumber, 80)) {
                await connection.rollback();
                return guestError("Nombre, apellido y DNI son obligatorios para cada acompañante");
            }
        }
        if (complete) {
            const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
            const checkinDate = String(stay.starts_at).slice(0, 10);
            const settings = parseGuestJson(stay.settings_json);
            if (checkinDate > today) { await connection.rollback(); return guestError(`La fecha de Check-in es ${checkinDate.split("-").reverse().join("/")} desde ${settings.checkinTime || "el horario definido"} hs.`, 409); }
        }
        if (complete && companions.length !== Math.max(0, Number(stay.adults) + Number(stay.children) - 1)) {
            await connection.rollback();
            return guestError(`Para confirmar el check-in deben cargarse ${Math.max(0, Number(stay.adults) + Number(stay.children) - 1)} acompañantes`);
        }
        await connection.query(`INSERT INTO tags_guest_precheckins (guest_app_id,stay_id,status,vehicle_plate,vehicle_make_model,vehicle_color,guest_notes,internal_notes,submitted_at)
            VALUES (?,?,'reviewed',?,?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE status='reviewed',vehicle_plate=VALUES(vehicle_plate),vehicle_make_model=VALUES(vehicle_make_model),vehicle_color=VALUES(vehicle_color),guest_notes=VALUES(guest_notes),internal_notes=VALUES(internal_notes),submitted_at=NOW()`, [guestAppId, stayId, cleanGuestText(body.vehiclePlate, 30) || null, cleanGuestText(body.vehicleMakeModel, 190) || null, cleanGuestText(body.vehicleColor, 80) || null, cleanGuestText(body.guestNotes, 2000) || null, cleanGuestText(body.internalNotes, 2000) || null]);
        await connection.query("UPDATE tags_guest_stays SET expected_arrival_text=?,updated_at=NOW() WHERE id=?", [cleanGuestText(body.expectedArrivalText, 120) || null, stayId]);
        await connection.query("DELETE FROM tags_guest_stay_people WHERE stay_id=? AND role='companion'", [stayId]);
        for (const person of companions) {
            const document = cleanGuestText(person.documentNumber, 80);
            const name = `${cleanGuestText(person.firstName, 100)} ${cleanGuestText(person.lastName, 100)}`;
            const [found] = await connection.query("SELECT id FROM tags_guest_people WHERE business_id=? AND document_number=? LIMIT 1 FOR UPDATE", [businessId, document]);
            let id = found[0]?.id;
            if (id) await connection.query("UPDATE tags_guest_people SET name=?,document_type='DNI' WHERE id=?", [name, id]);
            else { const [created] = await connection.query("INSERT INTO tags_guest_people (business_id,name,document_type,document_number) VALUES (?,?,'DNI',?)", [businessId, name, document]); id = created.insertId; }
            await connection.query("INSERT INTO tags_guest_stay_people (stay_id,guest_id,role) VALUES (?,?,'companion')", [stayId, id]);
        }
        if (complete) {
            await connection.query("UPDATE tags_guest_stays SET status='active',checked_in_at=NOW(),updated_at=NOW() WHERE id=?", [stayId]);
            await connection.query("UPDATE tags_guest_precheckins SET status='checked_in',checked_in_at=NOW(),checked_in_by_id=? WHERE stay_id=?", [access.session?.id || access.session?.userId || null, stayId]);
        }
        await connection.query("INSERT INTO tags_guest_audit_log (guest_app_id,stay_id,actor_type,actor_id,action,entity_type,entity_id) VALUES (?,?,'owner',?,?,'reservation',?)", [guestAppId, stayId, access.session?.id || access.session?.userId || null, complete ? "checkin.completed" : "precheckin.saved", stayId]);
        await connection.commit();
        return Response.json({ ok: true, status: complete ? "active" : "reserved" });
    } catch (error) {
        await connection.rollback();
        console.error("GUEST CHECKIN ERROR:", error);
        return Response.json({ ok: false, error: "No se pudo guardar el check-in" }, { status: 500 });
    } finally { connection.release(); }
}
