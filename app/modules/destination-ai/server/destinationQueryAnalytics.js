import crypto from "node:crypto";
import { db } from "../../../lib/tags-db.js";

const STOP_WORDS = new Set([
  "a","aca","ahi","al","algo","algun","alguna","algunas","algunos","como","con","cual","cuales","cuando","de","del","donde","el","ella","en","es","esta","este","esto","hay","ir","la","las","le","les","lo","los","me","mi","necesito","para","pero","por","puedo","que","quiero","recomenda","recomendas","recomendar","se","si","sin","su","te","tengo","un","una","unas","unos","y","yo"
]);

const clean = (value, max = 5000) => String(value ?? "").trim().slice(0,max);

function normalized(value) {
  return clean(value,2000).toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}

function redactQuestion(value) {
  let text = clean(value,1200);
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,"[email]");
  text = text.replace(/https?:\/\/\S+|www\.\S+/gi,"[enlace]");
  text = text.replace(/(?:\+?\d[\d\s().-]{6,}\d)/g,match => match.replace(/\D/g,"").length >= 7 ? "[número]" : match);
  return text;
}

function topicTerms(value) {
  return normalized(value).split(" ").filter(term => term.length > 1 && !STOP_WORDS.has(term)).slice(0,12);
}

function unique(values) {
  return [...new Set(values.filter(value => value !== "" && value != null))];
}

function analyticsTasks(destinationIntent, useEngineV2) {
  if (useEngineV2 && Array.isArray(destinationIntent?.tasks)) return destinationIntent.tasks.slice(0,5);
  return [{
    type: clean(destinationIntent?.intent || "other",80),
    query: clean(destinationIntent?.searchQuery || "",500),
    subject: clean(destinationIntent?.subject || destinationIntent?.searchQuery || "",255),
    taxonomyNodeIds: Array.isArray(destinationIntent?.taxonomyNodeIds) ? destinationIntent.taxonomyNodeIds : [],
    locality: clean(destinationIntent?.locationText || "",190),
    needsClarification: Boolean(destinationIntent?.needsClarification),
  }];
}

function buildCluster({ tasks, question }) {
  const taskTypes = unique(tasks.map(task => clean(task?.type || "other",80))).sort();
  const taxonomyIds = unique(tasks.flatMap(task => Array.isArray(task?.taxonomyNodeIds) ? task.taxonomyNodeIds.map(Number).filter(Number.isInteger) : [])).sort((a,b)=>a-b);
  const subjects = unique(tasks.map(task => redactQuestion(clean(task?.subject || task?.query || "",255))).filter(Boolean));
  const localities = unique(tasks.map(task => normalized(task?.locality)).filter(Boolean)).sort();
  const topicSubjects=tasks.filter(task=>{
    const ids=Array.isArray(task?.taxonomyNodeIds)?task.taxonomyNodeIds:[];
    return task?.type!=="find_business_category"||ids.length===0;
  }).map(task=>redactQuestion(clean(task?.subject||task?.query||"",255))).filter(Boolean);
  const terms = unique(topicSubjects.flatMap(topicTerms));
  const fallbackTerms = taxonomyIds.length ? [] : topicTerms(question);
  const topic = terms.length ? terms : fallbackTerms;
  const label = subjects.length ? subjects.join(" + ").slice(0,255) : (topic.join(" ") || "Consulta general").slice(0,255);
  const source = JSON.stringify({ taskTypes,taxonomyIds,topic:topic.sort(),localities });
  return {
    key: crypto.createHash("sha256").update(source).digest("hex"),
    label,
    taskTypes,
    taxonomyIds,
    subjects,
    locality: tasks.map(task => clean(task?.locality,190)).find(Boolean) || null,
  };
}

export async function recordDestinationQueryAnalytics({
  siteCode,requestId,conversationId,source,mode,question,destinationIntent,useEngineV2,
  userLocation,searchRequests,candidates,recommendedCandidates,needsClarification,answerStatus:forcedAnswerStatus,
}) {
  if (!siteCode || !requestId || !question) return { recorded:false };
  const tasks = analyticsTasks(destinationIntent,useEngineV2);
  const cluster = buildCluster({ tasks,question });
  const recommendations = Array.isArray(recommendedCandidates) ? recommendedCandidates.slice(0,12) : [];
  const searched = Array.isArray(searchRequests) && searchRequests.length > 0;
  const clarification = Boolean(needsClarification) || tasks.some(task => Boolean(task?.needsClarification));
  const allowedStatuses=new Set(["answered","clarification","no_results","error","blocked"]);
  const answerStatus = allowedStatuses.has(forcedAnswerStatus) ? forcedAnswerStatus : clarification ? "clarification" : searched && recommendations.length === 0 ? "no_results" : "answered";
  const redactedQuestion = redactQuestion(question);
  const conversationKey = crypto.createHash("sha256").update(`${siteCode}|${clean(conversationId || requestId,100)}`).digest("hex");
  let connection = null;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [[site]] = await connection.query("SELECT id FROM tags_directory_sites WHERE code=? AND is_active=1 LIMIT 1",[clean(siteCode,80)]);
    if (!site) { await connection.rollback();return { recorded:false }; }
    const [result] = await connection.query(
      `INSERT INTO tags_ai_destination_queries
       (site_id,request_id,conversation_key,source,mode,question_text,normalized_question,cluster_key,cluster_label,intent_type,task_types_json,taxonomy_ids_json,subjects_json,locality,has_user_location,result_count,recommended_count,answer_status,engine_version)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [site.id,requestId,conversationKey,clean(source,40)||"public",["tourist","resident"].includes(mode)?mode:"unselected",redactedQuestion,normalized(redactedQuestion).slice(0,1000),cluster.key,cluster.label,cluster.taskTypes[0]||"other",JSON.stringify(cluster.taskTypes),JSON.stringify(cluster.taxonomyIds),JSON.stringify(cluster.subjects),cluster.locality,userLocation?1:0,Array.isArray(candidates)?candidates.length:0,recommendations.length,answerStatus,useEngineV2?"v2":"v1"]
    );
    const queryId = Number(result.insertId);
    for (let index=0;index<recommendations.length;index+=1) {
      const item=recommendations[index],entityKey=clean(item?.entityKey || `${item?.entityType || "entity"}:${item?.id || index}`,255);
      await connection.query(
        `INSERT IGNORE INTO tags_ai_destination_query_recommendations
         (query_id,business_id,entity_key,entity_type,candidate_name,locality,position)
         VALUES (?,?,?,?,?,?,?)`,
        [queryId,Number(item?.businessId||0)||null,entityKey,clean(item?.entityType,40)||null,clean(item?.name || item?.matchedTitle || "Resultado",255),clean(item?.locality,190)||null,index+1]
      );
    }
    await connection.commit();
    return { recorded:true,queryId,answerStatus,clusterKey:cluster.key };
  } catch (error) {
    if (connection) await connection.rollback().catch(()=>{});
    if (error?.code !== "ER_NO_SUCH_TABLE") console.error("DESTINATION QUERY ANALYTICS RECORD ERROR",error);
    return { recorded:false };
  } finally { connection?.release(); }
}
