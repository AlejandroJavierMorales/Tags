import { db } from "@/app/lib/tags-db";
import { getSessionBusiness } from "@/app/lib/getSessionBusiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function boundedNumber(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
}

function parseBrand(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

export async function GET(request) {
  const session = await getSessionBusiness();
  if (session?.role !== "admin") return Response.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const days = boundedNumber(params.get("days"), 30, 1, 730);
  const businessId = boundedNumber(params.get("businessId"), 0, 0, Number.MAX_SAFE_INTEGER);
  const siteId = boundedNumber(params.get("siteId"), 0, 0, Number.MAX_SAFE_INTEGER);
  const cutoff = new Date(Date.now() - days * 86400000);
  const filters = ["e.created_at>=?"];
  const values = [cutoff];
  if (businessId) { filters.push("e.business_id=?"); values.push(businessId); }
  if (siteId) { filters.push("e.site_id=?"); values.push(siteId); }
  const where = filters.join(" AND ");

  try {
    const [summaryResult, timelineResult, pagesResult, actionsResult, searchesResult, sourcesResult, businessesResult, sitesResult] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(e.event_type='page_view'),0) page_views,
                COUNT(DISTINCT CASE WHEN e.event_type='page_view' THEN e.visitor_hash END) unique_visitors,
                COUNT(DISTINCT CASE WHEN e.event_type='page_view' THEN e.session_hash END) sessions,
                COALESCE(SUM(e.event_type='action_click'),0) action_clicks,
                COALESCE(SUM(e.event_type='internal_search'),0) searches,
                COALESCE(SUM(e.event_type='result_impression'),0) result_impressions,
                COALESCE(SUM(e.event_type='result_click'),0) result_clicks
           FROM tags_audience_events e WHERE ${where}`,
        values
      ),
      db.query(
        `SELECT DATE(e.created_at) day,
                COALESCE(SUM(e.event_type='page_view'),0) page_views,
                COUNT(DISTINCT CASE WHEN e.event_type='page_view' THEN e.visitor_hash END) visitors,
                COALESCE(SUM(e.event_type='action_click'),0) clicks
           FROM tags_audience_events e WHERE ${where}
          GROUP BY DATE(e.created_at) ORDER BY day`,
        values
      ),
      db.query(
        `SELECT e.public_host,e.path,e.surface,MAX(COALESCE(b.display_name,b.name)) business_name,
                COALESCE(SUM(e.event_type='page_view'),0) page_views,
                COUNT(DISTINCT CASE WHEN e.event_type='page_view' THEN e.visitor_hash END) visitors,
                COALESCE(SUM(e.event_type='action_click'),0) clicks
           FROM tags_audience_events e LEFT JOIN tags_businesses b ON b.id=e.business_id
          WHERE ${where}
          GROUP BY e.public_host,e.path,e.surface
          HAVING page_views>0 ORDER BY page_views DESC,visitors DESC LIMIT 30`,
        values
      ),
      db.query(
        `SELECT COALESCE(NULLIF(e.event_key,''),'interaction') action_key,
                MAX(NULLIF(e.event_label,'')) example_label,COUNT(*) total
           FROM tags_audience_events e WHERE ${where} AND e.event_type='action_click'
          GROUP BY COALESCE(NULLIF(e.event_key,''),'interaction') ORDER BY total DESC LIMIT 20`,
        values
      ),
      db.query(
        `SELECT e.search_query,COUNT(*) total,COUNT(DISTINCT e.session_hash) sessions
           FROM tags_audience_events e WHERE ${where} AND e.event_type='internal_search' AND e.search_query IS NOT NULL
          GROUP BY e.search_query ORDER BY total DESC,e.search_query LIMIT 30`,
        values
      ),
      db.query(
        `SELECT COALESCE(NULLIF(e.utm_source,''),CASE WHEN e.referrer IS NULL OR e.referrer='' THEN 'Directo' ELSE 'Referido' END) source,
                COUNT(*) page_views
           FROM tags_audience_events e WHERE ${where} AND e.event_type='page_view'
          GROUP BY source ORDER BY page_views DESC LIMIT 20`,
        values
      ),
      db.query(
        `SELECT b.id,COALESCE(NULLIF(b.display_name,''),b.name) name,b.email,
                GROUP_CONCAT(DISTINCT ds.name ORDER BY ds.name SEPARATOR ' · ') directories
           FROM tags_businesses b
           LEFT JOIN tags_directory_listings l ON l.business_id=b.id
           LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
           LEFT JOIN tags_directory_sites ds ON ds.id=sl.site_id
          GROUP BY b.id,b.display_name,b.name,b.email ORDER BY name`,
        []
      ),
      db.query("SELECT id,name,code,primary_host,brand_config FROM tags_directory_sites WHERE is_active=1 ORDER BY name", []),
    ]);

    const businesses = businessesResult[0];
    const selectedBusiness = businessId ? businesses.find(item => Number(item.id) === businessId) || null : null;
    let aiQuestions = [];
    try {
      const aiWhere = ["q.created_at>=?"];
      const aiValues = [cutoff];
      if (siteId) { aiWhere.push("q.site_id=?"); aiValues.push(siteId); }
      if (businessId) { aiWhere.push("EXISTS (SELECT 1 FROM tags_ai_destination_query_recommendations r WHERE r.query_id=q.id AND r.business_id=?)"); aiValues.push(businessId); }
      const [rows] = await db.query(`SELECT COALESCE(NULLIF(q.cluster_label,''),q.normalized_question) question_group,MIN(q.question_text) example_question,COUNT(*) total,COALESCE(SUM(q.answer_status='no_results'),0) no_results FROM tags_ai_destination_queries q WHERE ${aiWhere.join(" AND ")} GROUP BY COALESCE(NULLIF(q.cluster_label,''),q.normalized_question) ORDER BY total DESC LIMIT 30`, aiValues);
      aiQuestions = rows;
    } catch (error) {
      if (error?.code !== "ER_NO_SUCH_TABLE") console.error("AUDIENCE MUCHI QUESTIONS ERROR", error);
    }
    const sites = sitesResult[0].map(site => {
      const brand = parseBrand(site.brand_config);
      return {
        id: site.id,
        name: brand.displayName || site.name,
        code: site.code,
        host: site.primary_host,
        logoUrl: brand.logoUrl || brand.logo_url || "",
        primaryColor: brand.primaryColor || "#2f7958",
      };
    });
    return Response.json({
      ok: true,
      filters: { days, businessId: businessId || null, siteId: siteId || null },
      summary: { ...(summaryResult[0][0] || {}), ai_questions: aiQuestions.reduce((total, item) => total + Number(item.total || 0), 0) },
      timeline: timelineResult[0],
      pages: pagesResult[0],
      actions: actionsResult[0],
      searches: searchesResult[0],
      aiQuestions,
      sources: sourcesResult[0],
      businesses,
      selectedBusiness,
      sites,
    });
  } catch (error) {
    console.error("AUDIENCE OVERVIEW ERROR", error);
    const missing = error?.code === "ER_NO_SUCH_TABLE";
    return Response.json({ ok: false, error: missing ? "Falta ejecutar la migración de Audiencia" : "No se pudieron cargar las métricas" }, { status: missing ? 409 : 500 });
  }
}
