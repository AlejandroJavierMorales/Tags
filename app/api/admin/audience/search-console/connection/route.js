import { db } from "@/app/lib/tags-db";
import { getSessionBusiness } from "@/app/lib/getSessionBusiness";
import { publicSearchConsoleConnection, searchConsoleConfigured } from "@/app/modules/audience/server/searchConsoleApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionBusiness();
  if (session?.role !== "admin") return Response.json({ ok:false,error:"No autorizado" },{status:403});
  try { const [rows]=await db.query("SELECT * FROM tags_search_console_connections WHERE connection_key='platform' LIMIT 1"); return Response.json({ok:true,configured:searchConsoleConfigured(),connection:publicSearchConsoleConnection(rows[0])}); }
  catch(error){return Response.json({ok:false,error:error?.code==="ER_NO_SUCH_TABLE"?"Falta ejecutar la segunda migración de Audiencia":"No se pudo cargar Search Console"},{status:error?.code==="ER_NO_SUCH_TABLE"?409:500});}
}

export async function PATCH(request) {
  const session=await getSessionBusiness();
  if(session?.role!=="admin")return Response.json({ok:false,error:"No autorizado"},{status:403});
  const body=await request.json().catch(()=>null),siteUrl=String(body?.siteUrl||"").trim();
  const[rows]=await db.query("SELECT sites_json FROM tags_search_console_connections WHERE connection_key='platform' LIMIT 1");
  let sites=[];try{sites=JSON.parse(rows[0]?.sites_json||"[]");}catch{}
  if(!sites.some(item=>item.siteUrl===siteUrl))return Response.json({ok:false,error:"La propiedad seleccionada no está disponible"},{status:400});
  await db.query("UPDATE tags_search_console_connections SET selected_site_url=?,last_error=NULL WHERE connection_key='platform'",[siteUrl]);
  return Response.json({ok:true});
}
