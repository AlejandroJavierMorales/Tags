import { db } from "@/app/lib/tags-db";
import { getAiChatAdminAccess, aiChatAdminError } from "@/app/modules/ai-chat/server/getAiChatAdminAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SURFACES = new Set(["qr_page", "directory", "store", "resto", "guest_experience", "turnos"]);
const DEFAULTS = {
    is_enabled: 0,
    widget_type: "bubble",
    position: "right",
    primary_color: "#1f9d55",
    launcher_color: "#1f9d55",
    button_label: "Chat con Tags",
    launcher_label: "Chat",
    launcher_offset_bottom: 100
};

function paramsFrom(source) {
    return {
        businessId: Number(source?.businessId || source?.business_id || 0),
        surfaceType: String(source?.surfaceType || source?.surface_type || ""),
        surfaceId: Number(source?.surfaceId || source?.surface_id || 0)
    };
}

async function validSurface({ businessId, surfaceType, surfaceId }) {
    if (!businessId || !surfaceId || !SURFACES.has(surfaceType)) return false;
    if (["qr_page", "directory"].includes(surfaceType)) {
        const [rows] = await db.query("SELECT id FROM tags_qr_pages WHERE id=? AND business_id=? LIMIT 1", [surfaceId, businessId]);
        return rows.length > 0;
    }
    if (surfaceType === "guest_experience") {
        const [rows] = await db.query("SELECT id FROM tags_guest_apps WHERE id=? AND business_id=? LIMIT 1", [surfaceId, businessId]);
        return rows.length > 0;
    }
    if (surfaceType === "turnos") {
        const [rows] = await db.query("SELECT id FROM tags_turnos_apps WHERE id=? AND business_id=? LIMIT 1", [surfaceId, businessId]);
        return rows.length > 0;
    }
    const [rows] = await db.query("SELECT id FROM tags_stores WHERE id=? AND business_id=? AND app_type=? LIMIT 1", [surfaceId, businessId, surfaceType === "resto" ? "resto" : "store"]);
    return rows.length > 0;
}

function normalize(row) {
    let extra = {};
    try { extra = typeof row?.settings_json === "string" ? JSON.parse(row.settings_json || "{}") : (row?.settings_json || {}); } catch { extra = {}; }
    return {
        ...DEFAULTS,
        ...(row || {}),
        ...extra,
        is_enabled: Number(row?.is_enabled ?? DEFAULTS.is_enabled),
        launcher_offset_bottom: Math.max(0, Math.min(400, Number(row?.launcher_offset_bottom ?? extra.launcher_offset_bottom ?? DEFAULTS.launcher_offset_bottom))),
        launcher_label: String(row?.launcher_label ?? extra.launcher_label ?? DEFAULTS.launcher_label).trim().slice(0, 18),
        widget_type: ["bubble", "robot"].includes(String(row?.widget_type)) ? row.widget_type : DEFAULTS.widget_type,
        position: ["left", "right"].includes(String(row?.position)) ? row.position : DEFAULTS.position
    };
}

export async function GET(request) {
    const target = paramsFrom(Object.fromEntries(new URL(request.url).searchParams));
    if (!target.businessId || !target.surfaceId || !SURFACES.has(target.surfaceType)) return Response.json({ ok: false, error: "Superficie inválida" }, { status: 400 });
    const access = await getAiChatAdminAccess(target.businessId);
    if (!access.allowed) return aiChatAdminError(access);
    if (!await validSurface(target)) return Response.json({ ok: false, error: "La página no pertenece a este negocio" }, { status: 404 });
    const [rows] = await db.query("SELECT * FROM tags_ai_chatbot_surfaces WHERE business_id=? AND surface_type=? AND surface_id=? LIMIT 1", [target.businessId, target.surfaceType, target.surfaceId]);
    return Response.json({ ok: true, surface: target, settings: normalize(rows[0]) });
}

export async function PATCH(request) {
    const body = await request.json().catch(() => null);
    const target = paramsFrom(body);
    if (!target.businessId || !target.surfaceId || !SURFACES.has(target.surfaceType)) return Response.json({ ok: false, error: "Superficie inválida" }, { status: 400 });
    const access = await getAiChatAdminAccess(target.businessId);
    if (!access.allowed) return aiChatAdminError(access);
    if (!await validSurface(target)) return Response.json({ ok: false, error: "La página no pertenece a este negocio" }, { status: 404 });
    const settings = normalize({
        is_enabled: body.is_enabled ? 1 : 0,
        widget_type: body.widget_type,
        position: body.position,
        primary_color: String(body.primary_color || DEFAULTS.primary_color).slice(0, 20),
        launcher_color: String(body.launcher_color || DEFAULTS.launcher_color).slice(0, 20),
        button_label: String(body.button_label || DEFAULTS.button_label).trim().slice(0, 80)
        ,launcher_label: String(body.launcher_label || DEFAULTS.launcher_label).trim().slice(0, 18)
        ,launcher_offset_bottom: Math.max(0, Math.min(400, Number(body.launcher_offset_bottom ?? DEFAULTS.launcher_offset_bottom)))
    });
    await db.query(
        `INSERT INTO tags_ai_chatbot_surfaces
            (business_id,surface_type,surface_id,is_enabled,widget_type,position,primary_color,launcher_color,button_label,settings_json)
         VALUES (?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE is_enabled=VALUES(is_enabled),widget_type=VALUES(widget_type),position=VALUES(position),
            primary_color=VALUES(primary_color),launcher_color=VALUES(launcher_color),button_label=VALUES(button_label),settings_json=VALUES(settings_json),updated_at=NOW()`,
        [target.businessId, target.surfaceType, target.surfaceId, settings.is_enabled, settings.widget_type, settings.position, settings.primary_color, settings.launcher_color, settings.button_label, JSON.stringify({ launcher_offset_bottom: settings.launcher_offset_bottom, launcher_label: settings.launcher_label })]
    );
    return Response.json({ ok: true, surface: target, settings });
}
