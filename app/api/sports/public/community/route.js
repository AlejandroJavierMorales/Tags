export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getTurnosBySlug } from "@/app/modules/turnos/lib/getTurnosPublic";
import { cleanText, jsonResponseError, parseJson } from "@/app/modules/turnos/lib/turnosService";
import { getClubPublicSession } from "@/app/modules/sports/lib/getClubPublicSession";

async function getContext(slug) {
    const app = await getTurnosBySlug(slug);
    if (!app || app.business_profile_code !== "sports_club") return { error: jsonResponseError("Club no encontrado", 404) };
    return { app, session: await getClubPublicSession(db, app) };
}

export async function GET(req) {
    const result = await getContext(cleanText(new URL(req.url).searchParams.get("slug")));
    if (result.error) return result.error;
    if (!result.session) return Response.json({ ok: true, authenticated: false });
    const [[sportsApp]] = await db.query(`SELECT COALESCE(NULLIF(b.display_name,''),b.name) name,b.logo_url,sa.settings_json FROM tags_sports_apps sa INNER JOIN tags_businesses b ON b.id=sa.business_id WHERE sa.id=? LIMIT 1`, [result.session.sportsAppId]);
    const settings = parseJson(sportsApp?.settings_json);
    const base = { ok: true, authenticated: true, email: result.session.email, club: { name: sportsApp?.name, logoUrl: sportsApp?.logo_url } };
    if (!result.session.player) return Response.json({ ...base, registered: false, registrationMode: settings.publicRegistrationMode || "open" });
    const [categories] = await db.query(`SELECT d.name discipline,c.name category FROM tags_club_player_categories pc INNER JOIN tags_sports_disciplines d ON d.id=pc.discipline_id INNER JOIN tags_club_categories c ON c.id=pc.category_id WHERE pc.player_id=? AND pc.status='active' ORDER BY d.sort_order,c.sort_order`, [result.session.player.id]);
    return Response.json({ ...base, registered: true, isActiveMember: result.session.isActiveMember, player: { firstName: result.session.player.first_name, lastName: result.session.player.last_name, displayName: result.session.player.display_name, phone: result.session.player.phone, status: result.session.player.status, memberNumber: result.session.player.member_number }, categories });
}

export async function POST(req) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Datos inválidos");
    const result = await getContext(cleanText(body.slug));
    if (result.error) return result.error;
    if (!result.session) return jsonResponseError("Verificá tu email antes de registrarte", 401, "CLUB_AUTH_REQUIRED");
    if (result.session.player) return jsonResponseError("Tu perfil ya está registrado", 409);
    const [[sportsApp]] = await db.query("SELECT settings_json FROM tags_sports_apps WHERE id=? LIMIT 1", [result.session.sportsAppId]);
    const mode = parseJson(sportsApp?.settings_json).publicRegistrationMode || "open";
    if (mode === "disabled") return jsonResponseError("El registro público no está habilitado", 403);
    const firstName = cleanText(body.firstName, 120), lastName = cleanText(body.lastName, 120), phone = cleanText(body.phone, 60) || null;
    if (!firstName || !lastName || body.privacyConsent !== true) return jsonResponseError("Completá nombre, apellido y aceptación de privacidad");
    let connection;
    try {
        connection = await db.getConnection(); await connection.beginTransaction();
        const [[customer]] = await connection.query("SELECT id FROM tags_turnos_customers WHERE business_id=? AND LOWER(email)=? LIMIT 1 FOR UPDATE", [result.app.business_id, result.session.email]);
        let customerId = customer?.id;
        const fullName = `${firstName} ${lastName}`.trim();
        if (customerId) await connection.query("UPDATE tags_turnos_customers SET name=?,phone=COALESCE(?,phone),privacy_consent_at=NOW() WHERE id=?", [fullName, phone, customerId]);
        else { const [created] = await connection.query("INSERT INTO tags_turnos_customers (business_id,name,email,phone,privacy_consent_at) VALUES (?,?,?,?,NOW())", [result.app.business_id, fullName, result.session.email, phone]); customerId = created.insertId; }
        const status = mode === "approval" ? "pending" : "active";
        await connection.query("INSERT INTO tags_club_players (sports_app_id,business_id,turnos_customer_id,first_name,last_name,display_name,email,phone,profile_visibility,status,privacy_consent_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW())", [result.session.sportsAppId, result.app.business_id, customerId, firstName, lastName, fullName, result.session.email, phone, "private", status]);
        await connection.commit();
        return Response.json({ ok: true, status }, { status: 201 });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("CLUB PUBLIC REGISTRATION ERROR", error);
        return jsonResponseError("No se pudo completar el registro", 500);
    } finally { connection?.release(); }
}
