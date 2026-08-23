import { db } from "@/app/lib/tags-db";
import { getAiChatAdminAccess, aiChatAdminError } from "@/app/modules/ai-chat/server/getAiChatAdminAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULTS = {
    is_enabled: 1,
    title: "Asistente de Tags",
    subtitle: "Te ayudamos a conocer nuestras soluciones",
    greeting: "Hola, soy el asistente. ¿En qué podemos ayudarte?",
    position: "right",
    primary_color: "#1f9d55",
    launcher_color: "#1f9d55",
    launcher_offset_bottom: 120,
};

function businessIdFrom(source) {
    return Number(source?.businessId || source?.business_id || 0);
}

function cleanText(value, max, fallback) {
    const text = String(value ?? "").trim().slice(0, max);
    return text || fallback;
}

function normalizeSettings(row) {
    let extra = {};
    try { extra = typeof row?.settings_json === "string" ? JSON.parse(row.settings_json || "{}") : (row?.settings_json || {}); } catch { extra = {}; }
    return {
        ...DEFAULTS,
        ...(row || {}),
        ...extra,
        is_enabled: Number(row?.is_enabled ?? DEFAULTS.is_enabled),
        position: ["left", "right"].includes(String(row?.position)) ? row.position : DEFAULTS.position,
        primary_color: /^#[0-9a-f]{6}$/i.test(String(extra.primary_color || "")) ? extra.primary_color : DEFAULTS.primary_color,
        launcher_color: /^#[0-9a-f]{6}$/i.test(String(extra.launcher_color || "")) ? extra.launcher_color : DEFAULTS.launcher_color,
        launcher_offset_bottom: Math.max(0, Math.min(400, Number(extra.launcher_offset_bottom ?? DEFAULTS.launcher_offset_bottom)))
    };
}

export async function GET(request) {
    const businessId = businessIdFrom(Object.fromEntries(new URL(request.url).searchParams));
    if (!businessId) return Response.json({ ok: false, error: "Cliente inválido" }, { status: 400 });

    const access = await getAiChatAdminAccess(businessId);
    if (!access.allowed) return aiChatAdminError(access);

    const [businessRows] = await db.query("SELECT id,name,display_name,email,logo_url FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
    if (!businessRows.length) return Response.json({ ok: false, error: "Cliente no encontrado" }, { status: 404 });

    const [settingsRows] = await db.query("SELECT * FROM tags_ai_chatbot_settings WHERE business_id=? LIMIT 1", [businessId]);
    return Response.json({ ok: true, business: businessRows[0], addon: access.addon, settings: normalizeSettings(settingsRows[0]) });
}

export async function PATCH(request) {
    const body = await request.json().catch(() => null);
    const businessId = businessIdFrom(body);
    if (!businessId) return Response.json({ ok: false, error: "Cliente inválido" }, { status: 400 });

    const access = await getAiChatAdminAccess(businessId);
    if (!access.allowed) return aiChatAdminError(access);

    const position = ["right", "left"].includes(String(body.position)) ? String(body.position) : "right";
    const primaryColor = /^#[0-9a-f]{6}$/i.test(String(body.primary_color || "")) ? String(body.primary_color) : DEFAULTS.primary_color;
    const launcherColor = /^#[0-9a-f]{6}$/i.test(String(body.launcher_color || "")) ? String(body.launcher_color) : DEFAULTS.launcher_color;
    const launcherOffsetBottom = Math.max(0, Math.min(400, Number(body.launcher_offset_bottom ?? DEFAULTS.launcher_offset_bottom)));
    const settings = {
        // El formulario envía 0/1; no tratar 0 como ausencia de valor.
        is_enabled: body.is_enabled === false || Number(body.is_enabled) === 0 ? 0 : 1,
        title: cleanText(body.title, 120, DEFAULTS.title),
        subtitle: cleanText(body.subtitle, 180, DEFAULTS.subtitle),
        greeting: cleanText(body.greeting, 500, DEFAULTS.greeting),
        position,
        primary_color: primaryColor,
        launcher_color: launcherColor,
        launcher_offset_bottom: launcherOffsetBottom,
    };

    await db.query(
        `INSERT INTO tags_ai_chatbot_settings
            (business_id,is_enabled,title,subtitle,greeting,position,settings_json)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
            is_enabled=VALUES(is_enabled),title=VALUES(title),subtitle=VALUES(subtitle),
            greeting=VALUES(greeting),position=VALUES(position),settings_json=VALUES(settings_json),updated_at=NOW()`,
        [businessId, settings.is_enabled, settings.title, settings.subtitle, settings.greeting, settings.position, JSON.stringify({ primary_color: settings.primary_color, launcher_color: settings.launcher_color, launcher_offset_bottom: settings.launcher_offset_bottom })]
    );

    return Response.json({ ok: true, settings });
}
