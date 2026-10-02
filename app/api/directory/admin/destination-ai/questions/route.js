import { db } from "@/app/lib/tags-db";
import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function periodBounds(value) {
  const match=String(value||"").match(/^(\d{4})-(\d{2})$/),now=new Date(),year=match?Number(match[1]):now.getFullYear(),month=match?Number(match[2])-1:now.getMonth();
  return { start:new Date(year,month,1),end:new Date(year,month+1,1),label:`${year}-${String(month+1).padStart(2,"0")}` };
}

export async function GET(request) {
  const access=await requireDirectoryAdmin();
  if(!access.ok)return directoryAdminError(access);
  const searchParams=new URL(request.url).searchParams,siteId=Number(searchParams.get("siteId")||0),period=periodBounds(searchParams.get("period"));
  if(!siteId)return Response.json({ok:false,error:"Directorio requerido"},{status:400});
  const mode=["tourist","resident","unselected"].includes(searchParams.get("mode"))?searchParams.get("mode"):"";
  const status=["answered","clarification","no_results","error","blocked"].includes(searchParams.get("status"))?searchParams.get("status"):"";
  const term=String(searchParams.get("search")||"").trim().slice(0,120),page=Math.min(100000,Math.max(1,Math.floor(Number(searchParams.get("page")||1)||1))),pageSize=50,offset=(page-1)*pageSize;
  const where=["q.site_id=?","q.created_at>=?","q.created_at<?"],params=[siteId,period.start,period.end];
  if(mode){where.push("q.mode=?");params.push(mode);}
  if(status){where.push("q.answer_status=?");params.push(status);}
  if(term){where.push("(q.question_text LIKE ? OR q.normalized_question LIKE ? OR q.cluster_label LIKE ? OR q.locality LIKE ?)");const like=`%${term}%`;params.push(like,like,like,like);}
  const clause=where.join(" AND ");
  try {
    const [summaryResult,dailyResult,clusterResult,intentResult,localityResult,recommendationResult,recentResult]=await Promise.all([
      db.query(`SELECT COUNT(*) questions,COUNT(DISTINCT q.conversation_key) conversations,COALESCE(SUM(q.answer_status='answered'),0) answered,COALESCE(SUM(q.answer_status='clarification'),0) clarifications,COALESCE(SUM(q.answer_status='no_results'),0) no_results,COALESCE(SUM(q.recommended_count),0) recommendations,COALESCE(AVG(q.result_count),0) average_results,COALESCE(SUM(q.has_user_location),0) with_location,COALESCE(SUM(u.total_tokens),0) total_tokens,COALESCE(SUM(u.estimated_cost_usd),0) estimated_cost_usd FROM tags_ai_destination_queries q LEFT JOIN tags_ai_chatbot_usage u ON u.request_id=q.request_id WHERE ${clause}`,params),
      db.query(`SELECT DATE(q.created_at) day,COUNT(*) questions,COUNT(DISTINCT q.conversation_key) conversations,COALESCE(SUM(q.answer_status='no_results'),0) no_results FROM tags_ai_destination_queries q WHERE ${clause} GROUP BY DATE(q.created_at) ORDER BY day`,params),
      db.query(`SELECT q.cluster_key,MIN(q.cluster_label) cluster_label,MIN(q.intent_type) intent_type,MIN(COALESCE(NULLIF(q.locality,''),'Sin localidad indicada')) locality,COUNT(*) questions,COUNT(DISTINCT q.conversation_key) conversations,COALESCE(SUM(q.answer_status='no_results'),0) no_results,COALESCE(SUM(q.answer_status='clarification'),0) clarifications,COALESCE(SUM(q.recommended_count),0) recommendations,MAX(q.created_at) last_question_at FROM tags_ai_destination_queries q WHERE ${clause} GROUP BY q.cluster_key ORDER BY questions DESC,last_question_at DESC LIMIT 30`,params),
      db.query(`SELECT q.intent_type,COUNT(*) questions,COALESCE(SUM(q.answer_status='no_results'),0) no_results FROM tags_ai_destination_queries q WHERE ${clause} GROUP BY q.intent_type ORDER BY questions DESC`,params),
      db.query(`SELECT COALESCE(NULLIF(q.locality,''),'Sin localidad indicada') locality,COUNT(*) questions,COALESCE(SUM(q.answer_status='no_results'),0) no_results FROM tags_ai_destination_queries q WHERE ${clause} GROUP BY COALESCE(NULLIF(q.locality,''),'Sin localidad indicada') ORDER BY questions DESC LIMIT 20`,params),
      db.query(`SELECT r.business_id,r.candidate_name,r.locality,COUNT(*) recommendations,COUNT(DISTINCT r.query_id) questions FROM tags_ai_destination_query_recommendations r INNER JOIN tags_ai_destination_queries q ON q.id=r.query_id WHERE ${clause} GROUP BY r.business_id,r.candidate_name,r.locality ORDER BY recommendations DESC,r.candidate_name LIMIT 30`,params),
      db.query(`SELECT q.id,q.question_text,q.cluster_label,q.intent_type,q.locality,q.mode,q.result_count,q.recommended_count,q.answer_status,q.engine_version,q.has_user_location,q.created_at,u.total_tokens,u.estimated_cost_usd FROM tags_ai_destination_queries q LEFT JOIN tags_ai_chatbot_usage u ON u.request_id=q.request_id WHERE ${clause} ORDER BY q.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,params),
    ]);
    return Response.json({ok:true,period:period.label,page,pageSize,summary:summaryResult[0][0]||{},daily:dailyResult[0],clusters:clusterResult[0],intents:intentResult[0],localities:localityResult[0],recommendations:recommendationResult[0],recent:recentResult[0]});
  } catch(error) {
    console.error("DESTINATION QUESTION STATS ERROR",error);
    const missing=error?.code==="ER_NO_SUCH_TABLE";
    return Response.json({ok:false,error:missing?"Falta ejecutar la migración 2026-09-28-tags-destination-ai-query-analytics.sql":"No se pudieron cargar las estadísticas de consultas"},{status:missing?409:500});
  }
}
