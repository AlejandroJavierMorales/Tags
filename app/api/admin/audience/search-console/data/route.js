import { getSessionBusiness } from "@/app/lib/getSessionBusiness";
import { searchConsoleAccess, searchConsoleQuery, searchConsoleScopesForBusiness } from "@/app/modules/audience/server/searchConsoleApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function date(daysAgo){return new Date(Date.now()-daysAgo*86400000).toISOString().slice(0,10)}

function mergeRows(groups){const map=new Map();for(const rows of groups)for(const row of rows||[]){const key=(row.keys||[]).join("\u0001"),current=map.get(key)||{keys:row.keys||[],clicks:0,impressions:0,positionWeight:0};current.clicks+=Number(row.clicks||0);current.impressions+=Number(row.impressions||0);current.positionWeight+=Number(row.position||0)*Number(row.impressions||0);map.set(key,current)}return[...map.values()].map(item=>({...item,ctr:item.impressions?item.clicks/item.impressions:0,position:item.impressions?item.positionWeight/item.impressions:0})).sort((a,b)=>b.clicks-a.clicks||b.impressions-a.impressions)}
function mergeSummary(rows){const merged=mergeRows(rows.map(item=>item?.rows||[]));if(!merged.length)return{clicks:0,impressions:0,ctr:0,position:0};return merged.reduce((total,item)=>({keys:[],clicks:total.clicks+item.clicks,impressions:total.impressions+item.impressions,positionWeight:total.positionWeight+item.position*item.impressions}),{clicks:0,impressions:0,positionWeight:0,keys:[]})}

export async function GET(request){
  const session=await getSessionBusiness();if(session?.role!=="admin")return Response.json({ok:false,error:"No autorizado"},{status:403});
  const params=new URL(request.url).searchParams,days=Math.min(730,Math.max(1,Number(params.get("days")||30))),businessId=Number(params.get("businessId")||0);
  try{
    const{connection,accessToken}=await searchConsoleAccess(),scopes=await searchConsoleScopesForBusiness(connection,businessId);
    if(!scopes.length)return Response.json({ok:false,error:businessId?"No hay una propiedad de Search Console que cubra el dominio o la página pública de este cliente":"Seleccioná una propiedad de Search Console"},{status:409});
    const base={startDate:date(days),endDate:date(0),dataState:"all"};
    const results=await Promise.all(scopes.map(async scope=>{const withFilter=body=>scope.pageFilter?{...body,dimensionFilterGroups:[{groupType:"and",filters:[{dimension:"page",operator:"contains",expression:scope.pageFilter}]}]}:body;const[totals,dates,queries,pages]=await Promise.all([searchConsoleQuery(accessToken,scope.siteUrl,withFilter({...base,rowLimit:1})),searchConsoleQuery(accessToken,scope.siteUrl,withFilter({...base,dimensions:["date"],rowLimit:500})),searchConsoleQuery(accessToken,scope.siteUrl,withFilter({...base,dimensions:["query"],rowLimit:50})),searchConsoleQuery(accessToken,scope.siteUrl,withFilter({...base,dimensions:["page"],rowLimit:50}))]);return{scope,totals,dates,queries,pages}}));
    const rawSummary=mergeSummary(results.map(item=>item.totals)),summary={clicks:rawSummary.clicks,impressions:rawSummary.impressions,ctr:rawSummary.impressions?rawSummary.clicks/rawSummary.impressions:0,position:rawSummary.impressions?rawSummary.positionWeight/rawSummary.impressions:0};
    return Response.json({ok:true,siteUrl:businessId?null:scopes[0].siteUrl,propertiesUsed:scopes,summary,dates:mergeRows(results.map(item=>item.dates.rows)),queries:mergeRows(results.map(item=>item.queries.rows)),pages:mergeRows(results.map(item=>item.pages.rows)),metadata:results.map(item=>item.dates.metadata).find(Boolean)||null});
  }catch(error){console.error("SEARCH CONSOLE DATA ERROR",error);return Response.json({ok:false,error:error.message||"No se pudieron cargar los datos de Google"},{status:error.status||500});}
}
