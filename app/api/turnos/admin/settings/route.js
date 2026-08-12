export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getTurnosAccess, turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { jsonResponseError, parseJson } from "@/app/modules/turnos/lib/turnosService";

const PROFILE_TYPES = {
    spa: [["professional", "Profesionales", "Profesional", "Profesionales"], ["cabin", "Cabinas", "Cabina", "Cabinas"]],
    bike_kayak: [["equipment", "Bicicletas / Kayaks", "Unidad", "Unidades"]],
    hairdresser: [["professional", "Profesionales", "Profesional", "Profesionales"]],
    generic: [["resource", "Recursos", "Recurso", "Recursos"]]
};

export async function GET(req) {
    const businessId = new URL(req.url).searchParams.get("businessId");
    const turnosId = Number(new URL(req.url).searchParams.get("turnosId") || 0);
    if (!businessId) return jsonResponseError("businessId es requerido");
    const access = await getTurnosAccess({ businessId, turnosId, permission: "settings.view" });
    if (!access.allowed) return turnosAccessResponse(access);
    const [rows] = await db.query("SELECT * FROM tags_turnos_apps WHERE business_id = ? AND (? = 0 OR id = ?) ORDER BY id ASC", [businessId, turnosId, turnosId]);
    if (!rows[0]) return jsonResponseError("Tags Turnos no encontrado", 404, "TURNOS_NOT_FOUND");
    const [apps] = await db.query("SELECT id, page_id, slug, name, business_profile_code, status FROM tags_turnos_apps WHERE business_id = ? ORDER BY id ASC", [businessId]);
    return Response.json({ ok: true, apps, settings: { ...rows[0], settings: parseJson(rows[0].settings_json), publicBookingPolicy: parseJson(rows[0].public_booking_policy_json), depositPolicy: parseJson(rows[0].deposit_policy_json) } });
}

export async function POST(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const businessId = String(body?.businessId || "");
    const turnosId = Number(body?.turnosId || 0);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "settings.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const policy = body?.depositPolicy || {};
    const mode = ["none", "fixed", "percentage", "full"].includes(policy.mode) ? policy.mode : "none";
    const normalizedPolicy = { ...policy, mode, amount: Math.max(0, Number(policy.amount || 0)), percentage: Math.min(100, Math.max(0, Number(policy.percentage || 0))), holdMinutes: Math.max(1, Number(policy.holdMinutes || 15)), requiredForAdmin: policy.requiredForAdmin === true, requiredForPublic: policy.requiredForPublic !== false, confirmAfterPayment: policy.confirmAfterPayment === true };
    const publicPolicy = body?.publicBookingPolicy || {};
    const nextSettings = body?.settings || {};
    const profile = PROFILE_TYPES[nextSettings.turnosTemplate] ? nextSettings.turnosTemplate : "generic";
    if (!turnosId) return jsonResponseError("turnosId es requerido");
    const [result] = await db.query("UPDATE tags_turnos_apps SET business_profile_code = ?, settings_json = ?, public_booking_policy_json = ?, deposit_policy_json = ?, updated_at = NOW() WHERE id = ? AND business_id = ?", [profile, JSON.stringify(nextSettings), JSON.stringify(publicPolicy), JSON.stringify(normalizedPolicy), turnosId, businessId]);
    if (!result.affectedRows) return jsonResponseError("Tags Turnos no encontrado", 404, "TURNOS_NOT_FOUND");
    for (const [code, name, singular, plural] of PROFILE_TYPES[profile]) {
        await db.query("INSERT IGNORE INTO tags_turnos_resource_types (turnos_id,code,name,singular_label,plural_label) VALUES (?,?,?,?,?)", [turnosId, code, name, singular, plural]);
    }
    return Response.json({ ok: true, depositPolicy: normalizedPolicy, publicBookingPolicy: publicPolicy });
}

export async function PATCH(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const businessId = String(body?.businessId || "");
    const turnosId = Number(body?.turnosId || 0);
    const status = body?.status === "published" ? "published" : "draft";
    const access = await getTurnosAccess({ businessId, permission: "settings.manage", turnosId });
    if (!access.allowed) return turnosAccessResponse(access);
    if (!turnosId) return jsonResponseError("turnosId es requerido");
    const [apps] = await db.query("SELECT page_id FROM tags_turnos_apps WHERE id = ? AND business_id = ? LIMIT 1", [turnosId, businessId]);
    if (!apps[0]) return jsonResponseError("Tags Turnos no encontrado", 404, "TURNOS_NOT_FOUND");
    await db.query("UPDATE tags_turnos_apps SET status = ?, updated_at = NOW() WHERE id = ? AND business_id = ?", [status, turnosId, businessId]);
    await db.query("UPDATE tags_qr_pages SET status = ?, updated_at = NOW() WHERE id = ? AND business_id = ?", [status, apps[0].page_id, businessId]);
    return Response.json({ ok: true, status });
}

export async function PUT(req) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const businessId = String(body.businessId || ""), turnosId = Number(body.turnosId || 0);
    const slug = String(body.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const access = await getTurnosAccess({ businessId, turnosId, permission: "settings.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const name = String(body.name || "").trim().slice(0, 190);
    if (!slug && !name) return jsonResponseError("El nombre o la ruta pública son requeridos");
    const [apps] = await db.query("SELECT page_id FROM tags_turnos_apps WHERE id=? AND business_id=? LIMIT 1", [turnosId, businessId]);
    if (!apps[0]) return jsonResponseError("Tags Turnos no encontrado", 404);
    if (slug) {
        const [duplicate] = await db.query("SELECT id FROM tags_qr_pages WHERE slug=? AND id<>? LIMIT 1", [slug, apps[0].page_id]);
        if (duplicate[0]) return jsonResponseError("Esa ruta pública ya está en uso", 409);
    }
    await db.query("UPDATE tags_turnos_apps SET slug=COALESCE(?,slug),name=COALESCE(?,name),updated_at=NOW() WHERE id=?", [slug || null, name || null, turnosId]);
    await db.query("UPDATE tags_qr_pages SET slug=COALESCE(?,slug),title=COALESCE(?,title),updated_at=NOW() WHERE id=? AND business_id=?", [slug || null, name || null, apps[0].page_id, businessId]);
    return Response.json({ ok:true, slug:slug||undefined, name:name||undefined });
}
