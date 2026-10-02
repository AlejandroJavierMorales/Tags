import "dotenv/config";
import mysql from "mysql2/promise";

const option=name=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)||"";
const SITE_CODE=option("site")||"calamuchitar";
function config(){const required=["DB_HOST","DB_USER","DB_DATABASE_NAME"];const missing=required.filter(name=>!process.env[name]);if(missing.length)throw new Error(`Faltan variables: ${missing.join(", ")}`);return{host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD||"",database:process.env.DB_DATABASE_NAME,charset:"utf8mb4"};}

async function main(){
  const connection=await mysql.createConnection(config());
  try{
    const [[site]]=await connection.query("SELECT id,code,name FROM tags_directory_sites WHERE code=? AND is_active=1 LIMIT 1",[SITE_CODE]);
    if(!site)throw new Error("Directorio no encontrado");
    const [summaryRows]=await connection.query(`SELECT
      (SELECT COUNT(*) FROM tags_ai_search_locations WHERE site_id=? AND visibility='public') public_locations,
      (SELECT COUNT(*) FROM tags_ai_search_items WHERE site_id=? AND visibility='public') public_items,
      (SELECT COUNT(*) FROM tags_ai_search_location_categories WHERE site_id=? AND assignment_status='declared') categories_pending,
      (SELECT COUNT(*) FROM tags_ai_search_location_categories WHERE site_id=? AND assignment_status='confirmed') categories_confirmed,
      (SELECT COUNT(*) FROM tags_ai_search_location_categories WHERE site_id=? AND assignment_status='rejected') categories_rejected,
      (SELECT COUNT(*) FROM tags_ai_tourism_contents WHERE site_id=? AND status='published') tourism_published`,[site.id,site.id,site.id,site.id,site.id,site.id]);
    const [integrity]=await connection.query(`SELECT
      SUM(CASE WHEN l.latitude IS NULL OR l.longitude IS NULL OR l.latitude NOT BETWEEN -90 AND 90 OR l.longitude NOT BETWEEN -180 AND 180 THEN 1 ELSE 0 END) invalid_or_missing_coordinates,
      SUM(CASE WHEN l.primary_image_url IS NULL OR l.primary_image_url='' THEN 1 ELSE 0 END) missing_images,
      SUM(CASE WHEN NOT EXISTS(SELECT 1 FROM tags_ai_search_location_categories c WHERE c.search_location_id=l.id AND c.assignment_status<>'rejected') THEN 1 ELSE 0 END) without_eligible_category
      FROM tags_ai_search_locations l WHERE l.site_id=? AND l.visibility='public'`,[site.id]);
    const [cases]=await connection.query("SELECT id,name,query_text,expected_task_type,expected_listing_ids_json,forbidden_listing_ids_json FROM tags_ai_search_evaluations WHERE site_id=? AND status='active' ORDER BY id",[site.id]);
    process.stdout.write(`${JSON.stringify({mode:"read-only",generatedAt:new Date().toISOString(),site,summary:summaryRows[0]||{},integrity:integrity[0]||{},evaluationCases:{configured:cases.length,cases},activationGate:{schemaReady:true,backfillHasData:Number(summaryRows[0]?.public_locations||0)>0,categoryReviewComplete:Number(summaryRows[0]?.categories_pending||0)===0,tourismCoverageStarted:Number(summaryRows[0]?.tourism_published||0)>0}},null,2)}\n`);
  }finally{await connection.end();}
}
main().catch(error=>{process.stderr.write(`EVALUATION_V2_ERROR: ${error.message}\n`);process.exitCode=1;});
