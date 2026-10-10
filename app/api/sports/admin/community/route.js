export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSportsAccess } from "@/app/modules/sports/lib/getSportsAccess";
import { turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { cleanText, jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

async function context(source, permission) {
    const businessId = Number(source.businessId || 0), turnosId = Number(source.turnosId || 0);
    if (!businessId || !turnosId) return { error: jsonResponseError("businessId y turnosId son requeridos") };
    const access = await getSportsAccess({ businessId, turnosId, permission });
    return access.allowed ? { access, businessId, turnosId } : { error: turnosAccessResponse(access) };
}

export async function GET(req) {
    const params = Object.fromEntries(new URL(req.url).searchParams), result = await context(params, ["sports.players.view", "sports.players.manage"]);
    if (result.error) return result.error;
    const playerId = Number(params.playerId || 0), search = cleanText(params.search, 120), status = cleanText(params.status, 30);
    if (playerId) {
        const [[player]] = await db.query("SELECT * FROM tags_club_players WHERE id=? AND sports_app_id=? LIMIT 1", [playerId, result.access.sportsApp.id]);
        if (!player) return jsonResponseError("Jugador no encontrado", 404);
        const [memberships] = await db.query("SELECT * FROM tags_club_memberships WHERE player_id=? AND sports_app_id=? ORDER BY id DESC", [playerId, result.access.sportsApp.id]);
        const [categories] = await db.query(`SELECT pc.*,c.name category_name,d.name discipline_name FROM tags_club_player_categories pc INNER JOIN tags_club_categories c ON c.id=pc.category_id INNER JOIN tags_sports_disciplines d ON d.id=pc.discipline_id WHERE pc.player_id=? AND pc.sports_app_id=? AND pc.status='active' ORDER BY d.sort_order,c.sort_order`, [playerId, result.access.sportsApp.id]);
        return Response.json({ ok: true, player, memberships, categories });
    }
    const pattern = `%${search}%`;
    const [players] = await db.query(`SELECT p.*,(SELECT m.status FROM tags_club_memberships m WHERE m.player_id=p.id AND m.sports_app_id=p.sports_app_id ORDER BY m.id DESC LIMIT 1) membership_status,(SELECT m.membership_type FROM tags_club_memberships m WHERE m.player_id=p.id AND m.sports_app_id=p.sports_app_id ORDER BY m.id DESC LIMIT 1) membership_type,GROUP_CONCAT(DISTINCT CONCAT(d.name,': ',c.name) ORDER BY d.sort_order,c.sort_order SEPARATOR ' · ') category_names FROM tags_club_players p LEFT JOIN tags_club_player_categories pc ON pc.player_id=p.id AND pc.status='active' LEFT JOIN tags_club_categories c ON c.id=pc.category_id LEFT JOIN tags_sports_disciplines d ON d.id=pc.discipline_id WHERE p.sports_app_id=? AND (?='' OR p.status=?) AND (?='' OR p.first_name LIKE ? OR p.last_name LIKE ? OR COALESCE(p.email,'') LIKE ? OR COALESCE(p.phone,'') LIKE ? OR COALESCE(p.member_number,'') LIKE ?) GROUP BY p.id ORDER BY p.status='active' DESC,p.last_name,p.first_name LIMIT 500`, [result.access.sportsApp.id, status, status, search, pattern, pattern, pattern, pattern, pattern]);
    return Response.json({ ok: true, players });
}

async function ensureCustomer(connection, businessId, player, currentId = null) {
    if (currentId) return currentId;
    let rows = [];
    if (player.email) [rows] = await connection.query("SELECT id FROM tags_turnos_customers WHERE business_id=? AND LOWER(email)=? LIMIT 1", [businessId, player.email.toLowerCase()]);
    if (!rows[0] && player.phone) [rows] = await connection.query("SELECT id FROM tags_turnos_customers WHERE business_id=? AND phone=? LIMIT 1", [businessId, player.phone]);
    if (rows[0]) return rows[0].id;
    if (!player.email && !player.phone) return null;
    const [created] = await connection.query("INSERT INTO tags_turnos_customers (business_id,name,email,phone,document,date_of_birth,notes,privacy_consent_at) VALUES (?,?,?,?,?,?,?,NOW())", [businessId, `${player.firstName} ${player.lastName}`.trim(), player.email, player.phone, player.document, player.dateOfBirth, player.notes]);
    return created.insertId;
}

async function save(req, editing) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const result = await context(body, "sports.players.manage");
    if (result.error) return result.error;
    const playerId = Number(body.playerId || 0), firstName = cleanText(body.firstName, 120), lastName = cleanText(body.lastName, 120);
    if (!firstName || !lastName) return jsonResponseError("Nombre y apellido son requeridos");
    const player = { firstName, lastName, displayName: cleanText(body.displayName, 190) || null, email: cleanText(body.email, 190).toLowerCase() || null, phone: cleanText(body.phone, 60) || null, document: cleanText(body.document, 80) || null, dateOfBirth: /^\d{4}-\d{2}-\d{2}$/.test(String(body.dateOfBirth || "")) ? body.dateOfBirth : null, genderCode: cleanText(body.genderCode, 40) || null, photoUrl: cleanText(body.photoUrl, 2000) || null, guardianName: cleanText(body.guardianName, 190) || null, guardianPhone: cleanText(body.guardianPhone, 60) || null, notes: cleanText(body.notes, 5000) || null, memberNumber: cleanText(body.memberNumber, 80) || null, profileVisibility: ["private", "club", "public"].includes(body.profileVisibility) ? body.profileVisibility : "private", status: ["active", "pending", "suspended", "inactive"].includes(body.status) ? body.status : "active" };
    const categoryIds = [...new Set((Array.isArray(body.categoryIds) ? body.categoryIds : []).map(Number).filter(Boolean))];
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        let existing = null;
        if (editing) {
            const [rows] = await connection.query("SELECT * FROM tags_club_players WHERE id=? AND sports_app_id=? LIMIT 1 FOR UPDATE", [playerId, result.access.sportsApp.id]); existing = rows[0];
            if (!existing) { await connection.rollback(); return jsonResponseError("Jugador no encontrado", 404); }
        }
        const customerId = await ensureCustomer(connection, result.businessId, player, existing?.turnos_customer_id || null);
        let savedId = playerId;
        const values = [result.businessId, customerId, player.memberNumber, player.firstName, player.lastName, player.displayName, player.email, player.phone, player.document, player.dateOfBirth, player.genderCode, player.photoUrl, player.guardianName, player.guardianPhone, player.notes, player.profileVisibility, player.status];
        if (editing) await connection.query("UPDATE tags_club_players SET business_id=?,turnos_customer_id=?,member_number=?,first_name=?,last_name=?,display_name=?,email=?,phone=?,document=?,date_of_birth=?,gender_code=?,photo_url=?,guardian_name=?,guardian_phone=?,notes=?,profile_visibility=?,status=?,updated_at=NOW() WHERE id=? AND sports_app_id=?", [...values, playerId, result.access.sportsApp.id]);
        else { const [created] = await connection.query("INSERT INTO tags_club_players (sports_app_id,business_id,turnos_customer_id,member_number,first_name,last_name,display_name,email,phone,document,date_of_birth,gender_code,photo_url,guardian_name,guardian_phone,notes,profile_visibility,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [result.access.sportsApp.id, ...values]); savedId = created.insertId; }
        if (body.membership && typeof body.membership === "object") {
            await connection.query("UPDATE tags_club_memberships SET status='replaced',updated_at=NOW() WHERE sports_app_id=? AND player_id=? AND status IN ('active','pending')", [result.access.sportsApp.id, savedId]);
            if (body.membership.status && body.membership.status !== "none") await connection.query("INSERT INTO tags_club_memberships (sports_app_id,player_id,membership_type,status,valid_from,valid_until,notes) VALUES (?,?,?,?,?,?,?)", [result.access.sportsApp.id, savedId, cleanText(body.membership.type, 120) || null, ["active","pending","expired","suspended"].includes(body.membership.status) ? body.membership.status : "active", body.membership.validFrom || null, body.membership.validUntil || null, cleanText(body.membership.notes, 1000) || null]);
        }
        await connection.query("UPDATE tags_club_player_categories SET status='inactive',ended_at=NOW() WHERE sports_app_id=? AND player_id=? AND status='active'", [result.access.sportsApp.id, savedId]);
        for (const categoryId of categoryIds) {
            const [[category]] = await connection.query("SELECT id,discipline_id FROM tags_club_categories WHERE id=? AND sports_app_id=? AND is_active=1 LIMIT 1", [categoryId, result.access.sportsApp.id]);
            if (category) await connection.query("INSERT INTO tags_club_player_categories (sports_app_id,player_id,discipline_id,category_id,status) VALUES (?,?,?,?,'active')", [result.access.sportsApp.id, savedId, category.discipline_id, category.id]);
        }
        await connection.commit(); return Response.json({ ok: true, playerId: savedId }, { status: editing ? 200 : 201 });
    } catch (error) { await connection.rollback(); if (error?.code === "ER_DUP_ENTRY") return jsonResponseError("El número de socio o una asignación ya existe", 409); console.error("CLUB PLAYER SAVE ERROR", error); return jsonResponseError("No se pudo guardar el jugador", 500); }
    finally { connection.release(); }
}

export async function POST(req) { return save(req, false); }
export async function PATCH(req) { return save(req, true); }
export async function DELETE(req) { const body=await req.json().catch(()=>null),result=await context(body||{},"sports.players.manage");if(result.error)return result.error;const[updated]=await db.query("UPDATE tags_club_players SET status='inactive',updated_at=NOW() WHERE id=? AND sports_app_id=?",[Number(body.playerId||0),result.access.sportsApp.id]);return updated.affectedRows?Response.json({ok:true}):jsonResponseError("Jugador no encontrado",404); }
