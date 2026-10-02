import { db } from "@/app/lib/tags-db";

export async function getPublicAiChatConfig(businessId, surfaceType, surfaceId) {
    try {
        const [addons] = await db.query(
            `SELECT id FROM tags_business_addons
             WHERE business_id=? AND addon_code='ai_chatbot' AND status='active'
               AND (expires_at IS NULL OR expires_at>=NOW()) LIMIT 1`,
            [businessId]
        );
        if (!addons.length) return null;
        const [settingsRows] = await db.query("SELECT s.is_enabled,s.title,s.subtitle,s.greeting,s.position,s.settings_json,b.name business_name FROM tags_businesses b LEFT JOIN tags_ai_chatbot_settings s ON s.business_id=b.id WHERE b.id=? LIMIT 1", [businessId]);
        let generalExtra = {};
        try { generalExtra = typeof settingsRows[0]?.settings_json === "string" ? JSON.parse(settingsRows[0].settings_json || "{}") : (settingsRows[0]?.settings_json || {}); } catch { generalExtra = {}; }
        let surface;
        if (surfaceType === "external" && !Number(surfaceId)) {
            surface = {
                is_enabled: 1,
                widget_type: generalExtra.widget_type || "bubble",
                position: settingsRows[0]?.position || "right",
                primary_color: generalExtra.primary_color || "#1f9d55",
            launcher_color: generalExtra.launcher_color || "#1f9d55",
                launcher_prompt: generalExtra.launcher_prompt || "Cómo podemos ayudarte",
                launcher_prompt_size: generalExtra.launcher_prompt_size || 12,
                button_label: "Chat con Tags",
                settings_json: JSON.stringify({ launcher_offset_bottom: generalExtra.launcher_offset_bottom ?? 120 })
            };
        } else {
            const [surfaceRows] = await db.query("SELECT is_enabled,widget_type,position,primary_color,launcher_color,button_label,settings_json FROM tags_ai_chatbot_surfaces WHERE business_id=? AND surface_type=? AND surface_id=? LIMIT 1", [businessId, surfaceType, surfaceId]);
            surface = surfaceRows[0] || (surfaceType === "directory" ? {
                is_enabled: 1,
                widget_type: generalExtra.widget_type || "bubble",
                position: settingsRows[0]?.position || "right",
                primary_color: generalExtra.primary_color || "#1f9d55",
                launcher_color: generalExtra.launcher_color || "#1f9d55",
                button_label: "Consultar",
                settings_json: JSON.stringify({ launcher_prompt: generalExtra.launcher_prompt || "¿Cómo podemos ayudarte?", launcher_offset_bottom: generalExtra.launcher_offset_bottom ?? 100 })
            } : null);
        }
        if (!surface || Number(surface.is_enabled) !== 1 || Number(settingsRows[0]?.is_enabled ?? 1) !== 1) return null;
        let extra = {};
        try { extra = typeof surface.settings_json === "string" ? JSON.parse(surface.settings_json || "{}") : (surface.settings_json || {}); } catch { extra = {}; }
        return {
            businessId: Number(businessId),
            title: settingsRows[0]?.title || `Asistente de ${settingsRows[0]?.business_name || "este negocio"}`,
            subtitle: settingsRows[0]?.subtitle || "¿En qué podemos ayudarte?",
            greeting: settingsRows[0]?.greeting || `Hola, soy el asistente de ${settingsRows[0]?.business_name || "este negocio"}. ¿En qué puedo ayudarte?`,
            position: surface.position || settingsRows[0]?.position || "right",
            widgetType: surface.widget_type || "bubble",
            primaryColor: surface.primary_color || "#1f9d55",
            launcherColor: surface.launcher_color || "#1f9d55",
            buttonLabel: surface.button_label || "Chat con Tags",
            launcherLabel: String(extra.launcher_label || "Chat").trim().slice(0, 18),
            launcherOffsetBottom: Math.max(0, Math.min(400, Number(extra.launcher_offset_bottom ?? 100))),
            launcherPrompt: String(extra.launcher_prompt ?? generalExtra.launcher_prompt ?? "Cómo podemos ayudarte").trim().slice(0, 80),
            launcherPromptSize: Math.max(8, Math.min(20, Number(extra.launcher_prompt_size ?? generalExtra.launcher_prompt_size ?? 12))),
            embedded: surfaceType === "external"
        };
    } catch (error) {
        console.error("PUBLIC AI CHAT CONFIG ERROR", error.message);
        return null;
    }
}
