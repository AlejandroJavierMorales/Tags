import "dotenv/config";
import mysql from "mysql2/promise";

const option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) || "";
const siteCode = option("site") || "calamuchitar";
const days = Math.max(1, Math.min(3650, Number(option("days") || 90)));

function config() {
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE_NAME,
    charset: "utf8mb4",
  };
}

async function main() {
  const connection = await mysql.createConnection(config());
  try {
    const [[site]] = await connection.query("SELECT id,code,name FROM tags_directory_sites WHERE code=? AND is_active=1 LIMIT 1", [siteCode]);
    if (!site) throw new Error("Directorio no encontrado");
    const params = [site.id, days];
    const [[summary], [byIntent], [failures], [clusters]] = await Promise.all([
      connection.query(`SELECT COUNT(*) questions,
        SUM(answer_status='answered') answered,
        SUM(answer_status='clarification') clarifications,
        SUM(answer_status='no_results') no_results,
        SUM(answer_status='error') errors,
        SUM(answer_status='blocked') blocked,
        SUM(result_count=0) zero_candidates,
        SUM(result_count>0 AND recommended_count=0) candidates_not_recommended,
        SUM(recommended_count>0) with_recommendations
        FROM tags_ai_destination_queries
        WHERE site_id=? AND created_at>=DATE_SUB(NOW(),INTERVAL ? DAY)`, params),
      connection.query(`SELECT intent_type,COUNT(*) questions,SUM(answer_status='no_results') no_results,
        SUM(result_count=0) zero_candidates,SUM(result_count>0 AND recommended_count=0) candidates_not_recommended
        FROM tags_ai_destination_queries
        WHERE site_id=? AND created_at>=DATE_SUB(NOW(),INTERVAL ? DAY)
        GROUP BY intent_type ORDER BY no_results DESC,questions DESC`, params),
      connection.query(`SELECT created_at,question_text,cluster_label,intent_type,task_types_json,subjects_json,
        answer_status,result_count,recommended_count,engine_version
        FROM tags_ai_destination_queries
        WHERE site_id=? AND created_at>=DATE_SUB(NOW(),INTERVAL ? DAY)
          AND (answer_status IN ('no_results','error') OR recommended_count=0)
        ORDER BY created_at DESC LIMIT 200`, params),
      connection.query(`SELECT MIN(cluster_label) cluster_label,MIN(intent_type) intent_type,COUNT(*) questions,
        SUM(answer_status='no_results') no_results,SUM(result_count=0) zero_candidates,
        MAX(created_at) last_seen
        FROM tags_ai_destination_queries
        WHERE site_id=? AND created_at>=DATE_SUB(NOW(),INTERVAL ? DAY)
        GROUP BY cluster_key HAVING no_results>0
        ORDER BY no_results DESC,questions DESC,last_seen DESC LIMIT 50`, params),
    ]);
    process.stdout.write(`${JSON.stringify({ mode: "read-only", site, days, summary, byIntent, clusters, failures }, null, 2)}\n`);
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  process.stderr.write(`QUERY_FAILURE_AUDIT_ERROR: ${error.code || error.message}\n`);
  process.exitCode = 1;
});
