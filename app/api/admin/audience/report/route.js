import { db } from "@/app/lib/tags-db";
import { getSessionBusiness } from "@/app/lib/getSessionBusiness";
import { searchConsoleAccess, searchConsoleSummaryForBusiness } from "@/app/modules/audience/server/searchConsoleApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function number(value) {
  return Number(value || 0).toLocaleString("es-AR");
}

function bounded(value, fallback, max = 730) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(max, parsed)) : fallback;
}

function parseBrand(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function brandColor(value) {
  const color = String(value || "").trim();
  return /^(#[0-9a-f]{3,8}|rgb\([\d\s,.%]+\)|rgba\([\d\s,.%]+\))$/i.test(color) ? color : "#2f7958";
}

function table(title, headers, rows) {
  const content = rows.length
    ? rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}" class="empty">Sin datos para el período seleccionado.</td></tr>`;
  return `<section><h2>${escapeHtml(title)}</h2><table><thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${content}</tbody></table></section>`;
}

async function googleSummary(days, businessId) {
  try {
    const { connection, accessToken } = await searchConsoleAccess();
    return searchConsoleSummaryForBusiness({ connection, accessToken, businessId, days });
  } catch { return null; }
}

export async function GET(request) {
  const session = await getSessionBusiness();
  if (session?.role !== "admin") return new Response("No autorizado", { status: 403 });
  const searchParams = new URL(request.url).searchParams;
  const days = Math.max(1, bounded(searchParams.get("days"), 30));
  const businessId = bounded(searchParams.get("businessId"), 0, Number.MAX_SAFE_INTEGER);
  const requestedSiteId = bounded(searchParams.get("siteId"), 0, Number.MAX_SAFE_INTEGER);
  const cutoff = new Date(Date.now() - days * 86400000);

  try {
    let business = null;
    if (businessId) {
      const [rows] = await db.query("SELECT id,COALESCE(NULLIF(display_name,''),name) name,email FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
      business = rows[0] || null;
    }

    const siteParams = [];
    let siteWhere = "ds.is_active=1";
    if (requestedSiteId) { siteWhere += " AND ds.id=?"; siteParams.push(requestedSiteId); }
    if (businessId) { siteWhere += " AND EXISTS (SELECT 1 FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id WHERE l.business_id=? AND sl.site_id=ds.id)"; siteParams.push(businessId); }
    const [siteRows] = await db.query(`SELECT ds.id,ds.name,ds.primary_host,ds.brand_config FROM tags_directory_sites ds WHERE ${siteWhere} ORDER BY (ds.code='calamuchitar') DESC,ds.id LIMIT 1`, siteParams);
    const site = siteRows[0] || null;
    const config = parseBrand(site?.brand_config);
    const brand = {
      name: config.displayName || site?.name || "Tags",
      logo: config.logoUrl || config.logo_url || "/logo_tags_transparente.webp",
      color: brandColor(config.primaryColor),
      host: String(site?.primary_host || "tags.com.ar").replace(/^https?:\/\//, "").replace(/\/$/, ""),
    };

    const filters = ["created_at>=?"];
    const values = [cutoff];
    if (businessId) { filters.push("business_id=?"); values.push(businessId); }
    if (requestedSiteId) { filters.push("site_id=?"); values.push(requestedSiteId); }
    const where = filters.join(" AND ");
    const [summaryRows, pageRows, actionRows, searchRows, google] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(event_type='page_view'),0) page_views,COUNT(DISTINCT CASE WHEN event_type='page_view' THEN visitor_hash END) visitors,COUNT(DISTINCT CASE WHEN event_type='page_view' THEN session_hash END) sessions,COALESCE(SUM(event_type='action_click'),0) clicks,COALESCE(SUM(event_type='internal_search'),0) searches,COALESCE(SUM(event_type='result_impression'),0) result_impressions,COALESCE(SUM(event_type='result_click'),0) result_clicks FROM tags_audience_events WHERE ${where}`, values),
      db.query(`SELECT public_host,path,COALESCE(SUM(event_type='page_view'),0) views,COUNT(DISTINCT CASE WHEN event_type='page_view' THEN visitor_hash END) visitors,COALESCE(SUM(event_type='action_click'),0) clicks FROM tags_audience_events WHERE ${where} GROUP BY public_host,path HAVING views>0 ORDER BY views DESC LIMIT 20`, values),
      db.query(`SELECT COALESCE(NULLIF(event_key,''),'interaction') action_key,MAX(NULLIF(event_label,'')) label,COUNT(*) total FROM tags_audience_events WHERE ${where} AND event_type='action_click' GROUP BY action_key ORDER BY total DESC LIMIT 15`, values),
      db.query(`SELECT search_query,COUNT(*) total FROM tags_audience_events WHERE ${where} AND event_type='internal_search' AND search_query IS NOT NULL GROUP BY search_query ORDER BY total DESC LIMIT 20`, values),
      googleSummary(days, businessId),
    ]);
    const summary = summaryRows[0][0] || {};
    const generatedAt = new Date().toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" });
    const title = business ? `Informe de audiencia · ${business.name}` : "Informe general de audiencia";
    const actionNames = { whatsapp: "WhatsApp", phone: "Llamadas", email: "Emails", directions: "Cómo llegar", navigation: "Navegación", interaction: "Otras acciones" };
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
      :root{--brand:${escapeHtml(brand.color)}}*{box-sizing:border-box}body{margin:0;background:#eef3ef;color:#183428;font-family:Arial,sans-serif}.toolbar{position:sticky;top:0;display:flex;justify-content:flex-end;gap:10px;padding:12px 5%;background:#173c29}.toolbar button{border:0;border-radius:8px;padding:10px 16px;background:#fff;color:#173c29;font-weight:700;cursor:pointer}.document{width:min(1040px,94%);margin:24px auto;background:#fff;box-shadow:0 10px 35px #1834281f}.header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:28px 34px;border-top:8px solid var(--brand);background:#f5f9f6}.header img{max-width:230px;max-height:82px;object-fit:contain}.header div{text-align:right}.header h1{margin:0 0 6px;font-size:1.45rem}.header p,.header small{margin:3px 0;color:#607468}.content{padding:28px 34px}.kpis{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin-bottom:26px}.kpis article{padding:14px;border:1px solid #dbe7df;border-radius:10px}.kpis span{display:block;font-size:.72rem;color:#63786b}.kpis strong{display:block;margin-top:4px;font-size:1.45rem;color:var(--brand)}section{margin-top:24px;break-inside:avoid}h2{font-size:1rem;margin:0 0 9px;color:#173c29}table{width:100%;border-collapse:collapse}th,td{padding:8px 9px;border-bottom:1px solid #e5ece7;text-align:left;font-size:.78rem}th{background:#f4f8f5;color:#536a5d;text-transform:uppercase;font-size:.66rem}.empty{text-align:center;color:#74867b}.footer{display:flex;justify-content:space-between;gap:20px;padding:18px 34px;border-top:1px solid #dbe7df;color:#64786b;font-size:.72rem}@media(max-width:700px){.header{align-items:flex-start;flex-direction:column}.header div{text-align:left}.kpis{grid-template-columns:1fr 1fr}.content{padding:20px}.document{width:100%;margin:0}.toolbar{position:static}}@media print{body{background:#fff}.toolbar{display:none}.document{width:100%;margin:0;box-shadow:none}.header{-webkit-print-color-adjust:exact;print-color-adjust:exact}.footer{position:fixed;bottom:0;left:0;right:0;background:#fff}.content{padding-bottom:65px}@page{size:A4;margin:10mm}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / Guardar PDF</button><button onclick="window.close()">Cerrar</button></div><article class="document"><header class="header"><img src="${escapeHtml(brand.logo)}" alt="${escapeHtml(brand.name)}"><div><h1>${escapeHtml(title)}</h1><p>Últimos ${days} días</p>${business?.email ? `<small>${escapeHtml(business.email)}</small>` : ""}</div></header><main class="content"><div class="kpis"><article><span>Páginas vistas</span><strong>${number(summary.page_views)}</strong></article><article><span>Visitantes únicos</span><strong>${number(summary.visitors)}</strong></article><article><span>Sesiones</span><strong>${number(summary.sessions)}</strong></article><article><span>Clics y acciones</span><strong>${number(summary.clicks)}</strong></article><article><span>Búsquedas</span><strong>${number(summary.searches)}</strong></article><article><span>Apariciones</span><strong>${number(summary.result_impressions)}</strong></article><article><span>Clics en resultados</span><strong>${number(summary.result_clicks)}</strong></article></div>${google ? table("Google Search Console",["Propiedades incluidas","Impresiones","Clics","CTR","Posición promedio"],[[google.propertiesUsed.map(item=>item.label||item.siteUrl).join(" · "),number(google.impressions),number(google.clicks),`${(Number(google.ctr||0)*100).toLocaleString("es-AR",{maximumFractionDigits:2})}%`,Number(google.position||0).toLocaleString("es-AR",{maximumFractionDigits:1})]]) : ""}${table("Páginas más visitadas",["Página","Vistas","Personas","Clics"],pageRows[0].map(item=>[`${item.public_host}${item.path}`,number(item.views),number(item.visitors),number(item.clicks)]))}${table("Acciones realizadas",["Acción","Cantidad"],actionRows[0].map(item=>[actionNames[item.action_key]||item.label||item.action_key,number(item.total)]))}${table("Frases buscadas",["Búsqueda","Veces"],searchRows[0].map(item=>[item.search_query,number(item.total)]))}</main><footer class="footer"><span>${escapeHtml(brand.name)} · ${escapeHtml(brand.host)}</span><span>Generado el ${escapeHtml(generatedAt)}</span></footer></article></body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AUDIENCE REPORT ERROR", error);
    return new Response(error?.code === "ER_NO_SUCH_TABLE" ? "Falta ejecutar la migración de Audiencia." : "No se pudo generar el reporte.", { status: error?.code === "ER_NO_SUCH_TABLE" ? 409 : 500 });
  }
}
