import { db } from "@/app/lib/tags-db";
import { requireDirectoryAdmin, directoryAdminError } from "@/app/modules/directory/lib/requireDirectoryAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES = new Set(["text_text", "voice_text", "voice_voice"]);
const clean = (value, limit) => String(value || "").trim().slice(0, limit);
const color = value => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : "#1b6d4b";

function parse(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function defaults(site, raw = {}) {
  const current = raw.destinationAssistant || {};
  return {
    enabled: current.enabled ?? site.code === "calamuchitar",
    title: current.title || (site.code === "calamuchitar" ? "Muchi · Tu asistente del Valle" : `Asistente de ${site.name}`),
    subtitle: current.subtitle || "Información real del directorio",
    greeting: current.greeting || "¡Hola! ¿En qué puedo ayudarte?",
    characterTitle: current.characterTitle || (site.code === "calamuchitar" ? "¡Hola! Soy Muchi!" : "¡Hola!"),
    characterButtonLabel: current.characterButtonLabel || (site.code === "calamuchitar" ? "Charlá con Muchi" : "Iniciar conversación"),
    menuLabel: current.menuLabel || (site.code === "calamuchitar" ? "Charlá con Muchi" : "Asistente"),
    primaryColor: current.primaryColor || "#1b6d4b",
    launcherColor: current.launcherColor || "#1b6d4b",
    position: current.position === "left" ? "left" : "right",
    launcherOffsetBottom: Math.max(0, Math.min(400, Number(current.launcherOffsetBottom ?? 12))),
    interactionMode: MODES.has(current.interactionMode) ? current.interactionMode : current.voiceResponseEnabled ? "voice_voice" : "voice_text",
    limitEnabled: Boolean(current.limitEnabled),
    monthlyUsdLimit: Math.max(0, Number(current.monthlyUsdLimit || 0)),
    warningPercent: Math.max(1, Math.min(100, Number(current.warningPercent || 80))),
    extraUsdAllowance: Math.max(0, Number(current.extraUsdAllowance || 0)),
  };
}

function periodBounds(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) - 1 : now.getMonth();
  return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1), label: `${year}-${String(month + 1).padStart(2, "0")}` };
}

export async function GET(request) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const params = new URL(request.url).searchParams;
  const [sites] = await db.query("SELECT id,code,name,primary_host,directory_config FROM tags_directory_sites WHERE is_active=1 ORDER BY name");
  const siteId = Number(params.get("siteId") || sites[0]?.id || 0);
  const site = sites.find(item => Number(item.id) === siteId);
  if (!site) return Response.json({ error: "Directorio no encontrado" }, { status: 404 });
  const period = periodBounds(params.get("period"));
  const audioSiteCode = String(site.code).slice(0, 20);
  const chatSiteCode = String(site.code).slice(0, 28);
  const sources = [`destination:${chatSiteCode}`, `destination-audio:${audioSiteCode}`, `destination-tts:${audioSiteCode}`];
  if (site.code === "calamuchitar") sources.push("destination");
  const placeholders = sources.map(() => "?").join(",");
  const [summaryResult, breakdownResult, dailyResult] = await Promise.all([
    db.query(`SELECT COUNT(*) requests,COALESCE(SUM(input_tokens),0) input_tokens,COALESCE(SUM(output_tokens),0) output_tokens,COALESCE(SUM(total_tokens),0) total_tokens,COALESCE(SUM(estimated_cost_usd),0) estimated_cost_usd FROM tags_ai_chatbot_usage WHERE source IN (${placeholders}) AND status='completed' AND created_at>=? AND created_at<?`, [...sources, period.start, period.end]),
    db.query(`SELECT source,COUNT(*) requests,COALESCE(SUM(total_tokens),0) total_tokens,COALESCE(SUM(estimated_cost_usd),0) estimated_cost_usd FROM tags_ai_chatbot_usage WHERE source IN (${placeholders}) AND status='completed' AND created_at>=? AND created_at<? GROUP BY source ORDER BY source`, [...sources, period.start, period.end]),
    db.query(`SELECT DATE(created_at) day,COUNT(*) requests,COALESCE(SUM(total_tokens),0) total_tokens,COALESCE(SUM(estimated_cost_usd),0) estimated_cost_usd FROM tags_ai_chatbot_usage WHERE source IN (${placeholders}) AND status='completed' AND created_at>=? AND created_at<? GROUP BY DATE(created_at) ORDER BY day`, [...sources, period.start, period.end]),
  ]);
  const summary = summaryResult[0][0] || {};
  const breakdown = breakdownResult[0] || [];
  const daily = dailyResult[0] || [];
  const resolvedSettings = defaults(site, parse(site.directory_config));
  const usageUsd = Number(summary.estimated_cost_usd || 0);
  const warningAtUsd = resolvedSettings.monthlyUsdLimit * resolvedSettings.warningPercent / 100;
  const effectiveLimitUsd = resolvedSettings.monthlyUsdLimit + resolvedSettings.extraUsdAllowance;
  const limitState = { usageUsd, warningAtUsd, effectiveLimitUsd, nearLimit: resolvedSettings.limitEnabled && resolvedSettings.monthlyUsdLimit > 0 && usageUsd >= warningAtUsd, blocked: resolvedSettings.limitEnabled && effectiveLimitUsd > 0 && usageUsd >= effectiveLimitUsd };
  return Response.json({ ok: true, sites: sites.map(item => ({ id: item.id, code: item.code, name: item.name, primaryHost: item.primary_host })), site: { id: site.id, code: site.code, name: site.name }, settings: resolvedSettings, period: period.label, usage: { summary, breakdown, daily, limitState } });
}

export async function PUT(request) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const body = await request.json().catch(() => null);
  const siteId = Number(body?.siteId || 0);
  if (!siteId) return Response.json({ error: "Directorio inválido" }, { status: 400 });
  const interactionMode = MODES.has(body.interactionMode) ? body.interactionMode : "voice_text";
  const settings = {
    enabled: Boolean(body.enabled),
    title: clean(body.title, 100),
    subtitle: clean(body.subtitle, 160),
    greeting: clean(body.greeting, 500),
    characterTitle: clean(body.characterTitle, 80),
    characterButtonLabel: clean(body.characterButtonLabel, 40),
    menuLabel: clean(body.menuLabel, 40),
    primaryColor: color(body.primaryColor),
    launcherColor: color(body.launcherColor),
    position: body.position === "left" ? "left" : "right",
    launcherOffsetBottom: Math.max(0, Math.min(400, Number(body.launcherOffsetBottom ?? 12))),
    interactionMode,
    voiceResponseEnabled: interactionMode === "voice_voice",
    limitEnabled: Boolean(body.limitEnabled),
    monthlyUsdLimit: Math.max(0, Number(body.monthlyUsdLimit || 0)),
    warningPercent: Math.max(1, Math.min(100, Number(body.warningPercent || 80))),
    extraUsdAllowance: Math.max(0, Number(body.extraUsdAllowance || 0)),
  };
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [sites] = await connection.query("SELECT directory_config FROM tags_directory_sites WHERE id=? LIMIT 1 FOR UPDATE", [siteId]);
    if (!sites[0]) {
      await connection.rollback();
      return Response.json({ error: "Directorio no encontrado" }, { status: 404 });
    }
    const directoryConfig = parse(sites[0].directory_config);
    directoryConfig.destinationAssistant = settings;
    await connection.query("UPDATE tags_directory_sites SET directory_config=? WHERE id=?", [JSON.stringify(directoryConfig), siteId]);
    await connection.commit();
    return Response.json({ ok: true, settings });
  } catch (error) {
    await connection.rollback();
    console.error("DESTINATION AI SETTINGS UPDATE ERROR", error);
    return Response.json({ error: "No se pudo guardar la configuración de Muchi" }, { status: 500 });
  } finally {
    connection.release();
  }
}
