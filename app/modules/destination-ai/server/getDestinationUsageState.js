import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";

function parse(value) { if (!value) return {}; if (typeof value === "object") return value; try { return JSON.parse(value); } catch { return {}; } }

export async function getDestinationUsageState(siteCode) {
  const [sites] = await db.query("SELECT id,code,name,brand_config,directory_config FROM tags_directory_sites WHERE code=? AND is_active=1 LIMIT 1", [siteCode]);
  const site = sites[0];
  if (!site) return { blocked: false, forceText: false, usageUsd: 0 };
  const directoryConfig = parse(site.directory_config);
  const settings = directoryConfig.destinationAssistant || {};
  const limitEnabled = Boolean(settings.limitEnabled);
  const baseLimitUsd = Math.max(0, Number(settings.monthlyUsdLimit || 0));
  const extensionUsd = Math.max(0, Number(settings.extraUsdAllowance || 0));
  const effectiveLimitUsd = baseLimitUsd + extensionUsd;
  const warningPercent = Math.max(1, Math.min(100, Number(settings.warningPercent || 80)));
  const audioCode = String(site.code).slice(0, 20);
  const chatCode = String(site.code).slice(0, 28);
  const sources = [`destination:${chatCode}`, `destination-audio:${audioCode}`, `destination-tts:${audioCode}`];
  if (site.code === "calamuchitar") sources.push("destination");
  const placeholders = sources.map(() => "?").join(",");
  const [[usage]] = await db.query(`SELECT COALESCE(SUM(estimated_cost_usd),0) cost FROM tags_ai_chatbot_usage WHERE source IN (${placeholders}) AND status='completed' AND created_at>=DATE_FORMAT(NOW(),'%Y-%m-01')`, sources);
  const usageUsd = Number(usage?.cost || 0);
  const warningAtUsd = baseLimitUsd * warningPercent / 100;
  return {
    site,
    settings,
    limitEnabled,
    baseLimitUsd,
    extensionUsd,
    effectiveLimitUsd,
    warningPercent,
    warningAtUsd,
    usageUsd,
    nearLimit: limitEnabled && baseLimitUsd > 0 && usageUsd >= warningAtUsd,
    forceText: limitEnabled && baseLimitUsd > 0 && usageUsd >= warningAtUsd,
    blocked: limitEnabled && effectiveLimitUsd > 0 && usageUsd >= effectiveLimitUsd,
  };
}

export async function applyDestinationUsagePolicy(config, siteCode) {
  if (!config) return null;
  const usage = await getDestinationUsageState(siteCode);
  return {
    ...config,
    configuredInteractionMode: config.interactionMode,
    interactionMode: usage.forceText ? "text_text" : config.interactionMode,
    voiceInputEnabled: usage.forceText ? false : config.voiceInputEnabled,
    voiceResponseEnabled: usage.forceText ? false : config.voiceResponseEnabled,
    usagePolicy: { nearLimit: usage.nearLimit, blocked: usage.blocked },
  };
}

export async function notifyDestinationUsageThreshold(state) {
  if (!state?.nearLimit || !state?.site?.id) return;
  const period = new Date().toISOString().slice(0, 7);
  const directoryConfig = parse(state.site.directory_config);
  if (directoryConfig.destinationAssistantUsageAlert === period) return;
  const [result] = await db.query("UPDATE tags_directory_sites SET directory_config=JSON_SET(COALESCE(directory_config,JSON_OBJECT()),'$.destinationAssistantUsageAlert',?) WHERE id=? AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(directory_config,'$.destinationAssistantUsageAlert')),'')<>?", [period, state.site.id, period]);
  if (!result.affectedRows) return;
  const brand = parse(state.site.brand_config);
  const [admins] = await db.query("SELECT email FROM tags_businesses WHERE role='admin' AND email IS NOT NULL");
  const recipients = [...new Set([brand.notificationEmail, brand.replyTo, ...admins.map(item => item.email)].map(value => String(value || "").trim()).filter(Boolean))];
  if (!recipients.length) return;
  await sendMail({
    to: recipients,
    subject: `${state.site.name}: Muchi está cerca del límite mensual`,
    text: `El asistente consumió USD ${state.usageUsd.toFixed(4)}. Umbral: USD ${state.warningAtUsd.toFixed(4)}. Límite efectivo: USD ${state.effectiveLimitUsd.toFixed(4)}. La interacción pasó automáticamente a texto.`,
    html: `<div style="font-family:Arial;color:#183226"><h1>Muchi está cerca del límite</h1><p><strong>${state.site.name}</strong> consumió USD ${state.usageUsd.toFixed(4)}.</p><p>La interacción pasó automáticamente a texto. Podés ampliar el margen desde Directorios → Muchi / IA.</p></div>`,
  });
}
