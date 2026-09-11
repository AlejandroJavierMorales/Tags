export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSportsAccess } from "@/app/modules/sports/lib/getSportsAccess";
import { turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { cleanText, jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

const TEAM_MODES = new Set(["individual", "doubles", "team"]);
const SCORING_MODES = new Set(["sets", "goals", "points", "time", "custom"]);

function normalizeCode(value) {
    return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 80);
}

async function context(body, permission) {
    const businessId = Number(body?.businessId || 0);
    const turnosId = Number(body?.turnosId || 0);
    if (!businessId || !turnosId) return { error: jsonResponseError("businessId y turnosId son requeridos") };
    const access = await getSportsAccess({ businessId, turnosId, permission });
    return access.allowed ? { access } : { error: turnosAccessResponse(access) };
}

export async function POST(req) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const result = await context(body, "sports.disciplines.manage");
    if (result.error) return result.error;
    const name = cleanText(body.name, 120);
    const code = normalizeCode(body.code || name);
    if (!name || !code) return jsonResponseError("El nombre de la disciplina es requerido");
    const teamMode = TEAM_MODES.has(body.teamMode) ? body.teamMode : "individual";
    const scoringMode = SCORING_MODES.has(body.scoringMode) ? body.scoringMode : "custom";
    try {
        const [created] = await db.query(
            `INSERT INTO tags_sports_disciplines
                (sports_app_id, code, name, description, team_mode, scoring_mode, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [result.access.sportsApp.id, code, name, cleanText(body.description, 500) || null, teamMode, scoringMode, Number(body.sortOrder || 0)]
        );
        return Response.json({ ok: true, disciplineId: created.insertId });
    } catch (error) {
        if (error?.code === "ER_DUP_ENTRY") return jsonResponseError("La disciplina ya existe", 409);
        throw error;
    }
}

export async function PUT(req) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const result = await context(body, "sports.disciplines.manage");
    if (result.error) return result.error;
    const disciplineId = Number(body.disciplineId || 0);
    const name = cleanText(body.name, 120);
    if (!disciplineId || !name) return jsonResponseError("Disciplina y nombre son requeridos");
    const teamMode = TEAM_MODES.has(body.teamMode) ? body.teamMode : "individual";
    const scoringMode = SCORING_MODES.has(body.scoringMode) ? body.scoringMode : "custom";
    const [updated] = await db.query(
        `UPDATE tags_sports_disciplines
         SET name = ?, description = ?, team_mode = ?, scoring_mode = ?, sort_order = ?, is_active = ?, updated_at = NOW()
         WHERE id = ? AND sports_app_id = ?`,
        [name, cleanText(body.description, 500) || null, teamMode, scoringMode, Number(body.sortOrder || 0), body.isActive === false ? 0 : 1, disciplineId, result.access.sportsApp.id]
    );
    if (!updated.affectedRows) return jsonResponseError("Disciplina no encontrada", 404);
    return Response.json({ ok: true });
}

export async function DELETE(req) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const result = await context(body, "sports.disciplines.manage");
    if (result.error) return result.error;
    const disciplineId = Number(body.disciplineId || 0);
    const [updated] = await db.query(
        `UPDATE tags_sports_disciplines SET is_active = 0, updated_at = NOW()
         WHERE id = ? AND sports_app_id = ?`,
        [disciplineId, result.access.sportsApp.id]
    );
    if (!updated.affectedRows) return jsonResponseError("Disciplina no encontrada", 404);
    return Response.json({ ok: true });
}

