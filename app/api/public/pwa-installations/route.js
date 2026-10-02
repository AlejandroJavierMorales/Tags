export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSessionBusiness } from "@/app/lib/getSessionBusiness";

function getPublicHost(request) {
  const forwarded = request.headers.get("x-tags-public-host")
    || request.headers.get("x-forwarded-host")
    || request.headers.get("host");
  return String(forwarded || "").split(",")[0].trim().toLowerCase().replace(/^www\./, "") || null;
}

function normalizeDomain(domain, appCode) {
  const value = String(domain || "").trim().toLowerCase().replace(/^www\./, "");
  // El registro antiguo podía llegar al origen como tags.com.ar. Para esta
  // aplicación, la identidad pública instalada es CalamuchitAr.
  if (appCode === "calamuchitar" && value === "tags.com.ar") return "calamuchita.ar";
  return value || "Sin dominio";
}

function isAllowedAppCode(appCode) {
  return ["calamuchitar", "muchi"].includes(appCode) || appCode.startsWith("guest_experience:");
}

export async function GET(request) {
  try {
    const session = await getSessionBusiness();
    if (session?.role !== "admin") return Response.json({ success: false, error: "No autorizado" }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const appCode = String(searchParams.get("app_code") || "calamuchitar").trim().toLowerCase();
    if (appCode !== "all" && !isAllowedAppCode(appCode)) return Response.json({ success: false, error: "Aplicación inválida" }, { status: 400 });
    const appCodes = appCode === "all" ? ["calamuchitar", "muchi"] : [appCode];
    const placeholders = appCodes.map(() => "?").join(",");
    const [[summary]] = await db.query(
      `SELECT COUNT(*) AS total_records,
              SUM(outcome='installed') AS total_installations,
              SUM(outcome='cancelled') AS total_cancelled,
              SUM(prompt_count) AS total_attempts,
              COUNT(DISTINCT public_host) AS total_hosts,
              MIN(installed_at) AS first_installation,
              MAX(installed_at) AS last_installation
         FROM tags_pwa_install_events WHERE app_code IN (${placeholders})`, appCodes
    );
    const [byPlatform] = await db.query(
      `SELECT platform,COUNT(*) AS installations
         FROM tags_pwa_install_events WHERE app_code IN (${placeholders}) AND outcome='installed'
        GROUP BY platform ORDER BY installations DESC`, appCodes
    );
    const [apps] = await db.query(
      `SELECT app_code,COUNT(*) AS records,SUM(outcome='installed') AS installed,
              SUM(outcome='cancelled') AS cancelled,SUM(prompt_count) AS attempts,
              MAX(COALESCE(installed_at,last_seen_at)) AS last_activity
         FROM tags_pwa_install_events WHERE app_code IN (${placeholders})
        GROUP BY app_code ORDER BY app_code`, appCodes
    );
    const [domains] = await db.query(
      `SELECT app_code,COALESCE(NULLIF(public_host,''),'Sin dominio') AS domain,
              SUM(prompt_count) AS attempts,
              SUM(outcome='installed') AS installed,
              SUM(outcome='cancelled') AS cancelled,
              MAX(COALESCE(installed_at,last_seen_at)) AS last_activity
         FROM tags_pwa_install_events WHERE app_code IN (${placeholders})
        GROUP BY app_code,COALESCE(NULLIF(public_host,''),'Sin dominio')
        ORDER BY app_code,installed DESC,attempts DESC,domain`, appCodes
    );
    const domainsByHost = new Map();
    for (const item of domains) {
      const domain = normalizeDomain(item.domain, item.app_code);
      const key = `${item.app_code}:${domain}`;
      const current = domainsByHost.get(key) || { app_code: item.app_code, domain, attempts: 0, installed: 0, cancelled: 0, last_activity: null };
      current.attempts += Number(item.attempts || 0);
      current.installed += Number(item.installed || 0);
      current.cancelled += Number(item.cancelled || 0);
      if (!current.last_activity || (item.last_activity && new Date(item.last_activity) > new Date(current.last_activity))) {
        current.last_activity = item.last_activity;
      }
      domainsByHost.set(key, current);
    }
    const [installations] = await db.query(
      `SELECT id,app_code,CONCAT('…',RIGHT(installation_id,8)) AS installation_ref,
              COALESCE(NULLIF(public_host,''),'Sin dominio') AS public_host,platform,outcome,prompt_count,
              installed_at,last_seen_at,latitude,longitude,location_accuracy_m
         FROM tags_pwa_install_events
        WHERE app_code IN (${placeholders})
        ORDER BY COALESCE(installed_at,last_seen_at) DESC,id DESC
        LIMIT 1000`, appCodes
    );
    return Response.json({ success: true, app_code: appCode, summary, apps, byPlatform, domains: [...domainsByHost.values()], installations });
  } catch (error) {
    console.error("PWA INSTALLATION STATS ERROR", error);
    return Response.json({ success: false, error: "No se pudieron cargar las estadísticas" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const appCode = String(body?.app_code || "").trim().toLowerCase();
    const installationId = String(body?.installation_id || "").trim();
    const outcome = String(body?.outcome || "installed").trim().toLowerCase();
    const platform = String(body?.platform || "unknown").trim().slice(0, 120) || "unknown";
    const latitude = Number(body?.location?.latitude);
    const longitude = Number(body?.location?.longitude);
    const accuracy = Number(body?.location?.accuracy);
    const hasLocation = Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
    if (!isAllowedAppCode(appCode) || !["installed", "cancelled"].includes(outcome) || installationId.length < 8 || installationId.length > 180) {
      return Response.json({ success: false, error: "Datos de instalación inválidos" }, { status: 400 });
    }
    await db.query(
      `INSERT INTO tags_pwa_install_events (app_code,installation_id,public_host,platform,user_agent,latitude,longitude,location_accuracy_m,outcome,prompt_count,installed_at,last_seen_at)
       VALUES (?,?,?,?,?,?,?,?,?,1,IF(?='installed',NOW(),NULL),NOW())
       ON DUPLICATE KEY UPDATE outcome=VALUES(outcome),prompt_count=prompt_count+1,last_seen_at=NOW(),installed_at=IF(VALUES(outcome)='installed',COALESCE(installed_at,NOW()),installed_at),platform=VALUES(platform),user_agent=VALUES(user_agent),latitude=COALESCE(VALUES(latitude),latitude),longitude=COALESCE(VALUES(longitude),longitude),location_accuracy_m=COALESCE(VALUES(location_accuracy_m),location_accuracy_m)`,
      [appCode, installationId, getPublicHost(request), platform, request.headers.get("user-agent") || null, hasLocation ? latitude : null, hasLocation ? longitude : null, hasLocation && Number.isFinite(accuracy) ? Math.max(0, Math.min(accuracy, 999999.99)) : null, outcome, outcome]
    );
    return Response.json({ success: true });
  } catch (error) {
    console.error("PWA INSTALLATION REGISTER ERROR", error);
    return Response.json({ success: false, error: "No se pudo registrar la instalación" }, { status: 503 });
  }
}
