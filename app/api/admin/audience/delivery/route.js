import { db } from "@/app/lib/tags-db";
import { getSessionBusiness } from "@/app/lib/getSessionBusiness";
import { sendMail } from "@/app/lib/sendMail";
import { directoryEmailBranding, directoryEmailHeader } from "@/app/modules/directory/lib/directoryEmailBranding";
import { searchConsoleAccess, searchConsoleSummaryForBusiness } from "@/app/modules/audience/server/searchConsoleApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value, max = 255) { return String(value || "").trim().slice(0, max); }
function esc(value) { return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])); }
function num(value) { return Number(value || 0).toLocaleString("es-AR"); }
function phone(value) { const digits = String(value || "").replace(/\D/g, ""); return digits.length >= 8 && digits.length <= 15 ? digits : ""; }

async function context(businessId, siteId) {
  const params = [];
  let where = "ds.is_active=1";
  if (siteId) { where += " AND ds.id=?"; params.push(siteId); }
  if (businessId) { where += " AND EXISTS (SELECT 1 FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id WHERE l.business_id=? AND sl.site_id=ds.id)"; params.push(businessId); }
  const [[business], [sites]] = await Promise.all([
    businessId ? db.query("SELECT id,COALESCE(NULLIF(display_name,''),name) name,email,whatsapp,phone FROM tags_businesses WHERE id=? LIMIT 1", [businessId]) : Promise.resolve([[]]),
    db.query(`SELECT ds.id,ds.name,ds.primary_host,ds.brand_config FROM tags_directory_sites ds WHERE ${where} ORDER BY (ds.code='calamuchitar') DESC,ds.id LIMIT 1`, params),
  ]);
  const site = sites[0] || null;
  return { business: business[0] || null, site, brand: directoryEmailBranding(site || { name: "Tags", primary_host: "tags.com.ar", brand_config: null }) };
}

async function summary(days, businessId, siteId) {
  const filters = ["created_at>=?"];
  const values = [new Date(Date.now() - days * 86400000)];
  if (businessId) { filters.push("business_id=?"); values.push(businessId); }
  if (siteId) { filters.push("site_id=?"); values.push(siteId); }
  const [[row]] = await db.query(`SELECT COALESCE(SUM(event_type='page_view'),0) page_views,COUNT(DISTINCT CASE WHEN event_type='page_view' THEN visitor_hash END) visitors,COUNT(DISTINCT CASE WHEN event_type='page_view' THEN session_hash END) sessions,COALESCE(SUM(event_type='action_click'),0) clicks,COALESCE(SUM(event_type='internal_search'),0) searches,COALESCE(SUM(event_type='result_impression'),0) impressions,COALESCE(SUM(event_type='result_click'),0) result_clicks FROM tags_audience_events WHERE ${filters.join(" AND ")}`, values);
  return row || {};
}

async function googleSummary(days, businessId) {
  try {
    const { connection, accessToken } = await searchConsoleAccess();
    return await searchConsoleSummaryForBusiness({ connection, accessToken, businessId, days });
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getSessionBusiness();
  if (session?.role !== "admin") return Response.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    const [rows] = await db.query(`SELECT d.*,COALESCE(NULLIF(b.display_name,''),b.name) business_name,ds.name site_name FROM tags_audience_report_deliveries d LEFT JOIN tags_businesses b ON b.id=d.business_id LEFT JOIN tags_directory_sites ds ON ds.id=d.site_id ORDER BY d.id DESC LIMIT 100`);
    return Response.json({ ok: true, deliveries: rows });
  } catch (error) {
    return Response.json({ ok: false, error: error?.code === "ER_NO_SUCH_TABLE" ? "Falta ejecutar la segunda migración de Audiencia" : "No se pudo cargar el historial" }, { status: error?.code === "ER_NO_SUCH_TABLE" ? 409 : 500 });
  }
}

export async function POST(request) {
  const session = await getSessionBusiness();
  if (session?.role !== "admin") return Response.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const businessId = Number(body?.businessId || 0), siteId = Number(body?.siteId || 0), days = Math.min(730, Math.max(1, Number(body?.days || 30)));
  const channel = body?.channel === "whatsapp" ? "whatsapp" : "email";
  try {
    const [{ business, site, brand }, metrics, google] = await Promise.all([context(businessId, siteId), summary(days, businessId, siteId), googleSummary(days, businessId)]);
    const recipient = channel === "email" ? clean(body?.recipient || business?.email, 255) : phone(body?.recipient || business?.whatsapp || business?.phone);
    if (!recipient || (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))) return Response.json({ ok: false, error: channel === "email" ? "Ingresá un email válido" : "Ingresá un WhatsApp válido con código de país" }, { status: 400 });
    const title = business?.name ? `Informe de audiencia de ${business.name}` : "Informe general de audiencia";
    const lines = [`${title} · últimos ${days} días`, `Páginas vistas: ${num(metrics.page_views)}`, `Visitantes únicos: ${num(metrics.visitors)}`, `Sesiones: ${num(metrics.sessions)}`, `Clics y acciones: ${num(metrics.clicks)}`, `Búsquedas: ${num(metrics.searches)}`, `Apariciones en resultados: ${num(metrics.impressions)}`, `Clics desde resultados: ${num(metrics.result_clicks)}`];
    if (google) lines.push("", "Google Search Console", `Impresiones en Google: ${num(google.impressions)}`, `Clics orgánicos: ${num(google.clicks)}`, `CTR: ${(Number(google.ctr || 0) * 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`, `Posición promedio: ${Number(google.position || 0).toLocaleString("es-AR", { maximumFractionDigits: 1 })}`);
    lines.push("", brand.name);
    let status = "prepared", errorMessage = null, whatsappUrl = null;
    if (channel === "email") {
      const cards = [["Páginas vistas",metrics.page_views],["Visitantes únicos",metrics.visitors],["Sesiones",metrics.sessions],["Clics y acciones",metrics.clicks],["Búsquedas",metrics.searches],["Apariciones",metrics.impressions],["Clics desde resultados",metrics.result_clicks]].map(([label,value])=>`<td style="padding:12px;border:1px solid #dce9e1"><small>${esc(label)}</small><br><strong style="font-size:22px;color:${esc(brand.color)}">${num(value)}</strong></td>`).join("");
      const googleHtml = google ? `<h2 style="margin-top:24px">Google Search Console</h2><p>Impresiones: <strong>${num(google.impressions)}</strong> · Clics: <strong>${num(google.clicks)}</strong> · CTR: <strong>${(Number(google.ctr || 0) * 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%</strong> · Posición promedio: <strong>${Number(google.position || 0).toLocaleString("es-AR", { maximumFractionDigits: 1 })}</strong></p><p style="color:#667a6e;font-size:13px">Incluye automáticamente: ${esc(google.propertiesUsed.map(item => item.label || item.siteUrl).join(" · "))}.</p>` : "";
      const delivery = await sendMail({ to: recipient, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject: `${title} · ${brand.name}`, text: lines.join("\n"), html: `<div style="max-width:760px;margin:auto;font-family:Arial;color:#183428;border:1px solid #dce9e1">${directoryEmailHeader(brand,title)}<main style="padding:24px"><p>Período analizado: últimos <strong>${days} días</strong>.</p><table style="width:100%;border-collapse:collapse"><tr>${cards}</tr></table>${googleHtml}</main></div>` });
      status = delivery.ok ? "sent" : "error";
      errorMessage = delivery.ok ? null : clean(delivery.error, 1500);
    } else {
      whatsappUrl = `https://wa.me/${recipient}?text=${encodeURIComponent(lines.join("\n"))}`;
    }
    await db.query(`INSERT INTO tags_audience_report_deliveries (site_id,business_id,period_days,channel,recipient,status,summary_json,error_message,created_by_id,sent_at) VALUES (?,?,?,?,?,?,?,?,?,IF(?='sent',NOW(),NULL))`, [site?.id || siteId || null,businessId || null,days,channel,recipient,status,JSON.stringify({ ...metrics, google }),errorMessage,null,status]);
    return Response.json({ ok: status !== "error", status, whatsappUrl, error: errorMessage });
  } catch (error) {
    console.error("AUDIENCE DELIVERY ERROR", error);
    return Response.json({ ok: false, error: error?.code === "ER_NO_SUCH_TABLE" ? "Falta ejecutar la segunda migración de Audiencia" : "No se pudo preparar el reporte" }, { status: error?.code === "ER_NO_SUCH_TABLE" ? 409 : 500 });
  }
}
