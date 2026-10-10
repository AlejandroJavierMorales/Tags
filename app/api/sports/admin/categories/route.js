export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSportsAccess } from "@/app/modules/sports/lib/getSportsAccess";
import { turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { cleanText, jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

const KINDS = new Set(["level", "age", "division", "competitive", "custom"]);
const code = value => String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 80);

async function context(source, permission) {
    const businessId = Number(source.businessId || 0), turnosId = Number(source.turnosId || 0);
    if (!businessId || !turnosId) return { error: jsonResponseError("businessId y turnosId son requeridos") };
    const access = await getSportsAccess({ businessId, turnosId, permission });
    return access.allowed ? { access, businessId, turnosId } : { error: turnosAccessResponse(access) };
}

export async function GET(req) {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const result = await context(params, ["sports.categories.view", "sports.categories.manage"]);
    if (result.error) return result.error;
    const [categories] = await db.query(`SELECT c.*,d.name discipline_name FROM tags_club_categories c INNER JOIN tags_sports_disciplines d ON d.id=c.discipline_id AND d.sports_app_id=c.sports_app_id WHERE c.sports_app_id=? ORDER BY d.sort_order,c.sort_order,c.name`, [result.access.sportsApp.id]);
    return Response.json({ ok: true, categories });
}

async function save(req, editing) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const result = await context(body, "sports.categories.manage");
    if (result.error) return result.error;
    const categoryId = Number(body.categoryId || 0), disciplineId = Number(body.disciplineId || 0), name = cleanText(body.name, 120);
    if (!disciplineId || !name) return jsonResponseError("Deporte y nombre son requeridos");
    const [disciplines] = await db.query("SELECT id FROM tags_sports_disciplines WHERE id=? AND sports_app_id=? AND is_active=1 LIMIT 1", [disciplineId, result.access.sportsApp.id]);
    if (!disciplines[0]) return jsonResponseError("El deporte no pertenece al club", 400);
    const values = [disciplineId, name, code(body.code || name), cleanText(body.description, 500) || null, KINDS.has(body.categoryKind) ? body.categoryKind : "level", body.minAge === "" || body.minAge == null ? null : Number(body.minAge), body.maxAge === "" || body.maxAge == null ? null : Number(body.maxAge), cleanText(body.genderCode, 40) || null, Number(body.sortOrder || 0), body.isActive === false ? 0 : 1];
    try {
        if (editing) {
            const [updated] = await db.query("UPDATE tags_club_categories SET discipline_id=?,name=?,code=?,description=?,category_kind=?,min_age=?,max_age=?,gender_code=?,sort_order=?,is_active=?,updated_at=NOW() WHERE id=? AND sports_app_id=?", [...values, categoryId, result.access.sportsApp.id]);
            if (!updated.affectedRows) return jsonResponseError("Categoría no encontrada", 404);
            return Response.json({ ok: true, categoryId });
        }
        const [created] = await db.query("INSERT INTO tags_club_categories (sports_app_id,discipline_id,name,code,description,category_kind,min_age,max_age,gender_code,sort_order,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [result.access.sportsApp.id, ...values]);
        return Response.json({ ok: true, categoryId: created.insertId }, { status: 201 });
    } catch (error) {
        if (error?.code === "ER_DUP_ENTRY") return jsonResponseError("Ya existe una categoría con ese nombre o código para el deporte", 409);
        throw error;
    }
}

export async function POST(req) { return save(req, false); }
export async function PATCH(req) { return save(req, true); }
export async function DELETE(req) {
    const body = await req.json().catch(() => null), result = await context(body || {}, "sports.categories.manage");
    if (result.error) return result.error;
    const [updated] = await db.query("UPDATE tags_club_categories SET is_active=0,updated_at=NOW() WHERE id=? AND sports_app_id=?", [Number(body.categoryId || 0), result.access.sportsApp.id]);
    return updated.affectedRows ? Response.json({ ok: true }) : jsonResponseError("Categoría no encontrada", 404);
}
