export const runtime="nodejs";export const dynamic="force-dynamic";
import{db}from"@/app/lib/tags-db";import{getSportsAccess}from"@/app/modules/sports/lib/getSportsAccess";import{turnosAccessResponse}from"@/app/modules/turnos/lib/access/getTurnosAccess";import{cleanText,jsonResponseError}from"@/app/modules/turnos/lib/turnosService";
const date=value=>value&&!Number.isNaN(new Date(value).getTime())?new Date(value):null;
function loser(match){return Number(match.winner_registration_id)===Number(match.participant_a_registration_id)?match.participant_b_registration_id:match.participant_a_registration_id}
export async function PATCH(req){
 const body=await req.json().catch(()=>null);if(!body)return jsonResponseError("Datos inválidos");
 const access=await getSportsAccess({businessId:Number(body.businessId),turnosId:Number(body.turnosId),permission:"sports.matches.manage"});if(!access.allowed)return turnosAccessResponse(access);
 let connection;try{connection=await db.getConnection();await connection.beginTransaction();
  const[[match]]=await connection.query(`SELECT m.*,COALESCE(m.match_format_id,r.match_format_id,t.match_format_id) resolved_format_id FROM tags_club_matches m INNER JOIN tags_club_tournament_rounds r ON r.id=m.round_id INNER JOIN tags_club_tournaments t ON t.id=m.tournament_id WHERE m.id=? AND m.sports_app_id=? FOR UPDATE`,[Number(body.matchId),access.sportsApp.id]);
  if(!match){await connection.rollback();return jsonResponseError("Partido no encontrado",404)}
  const scoreA=body.scoreA===""||body.scoreA==null?null:Number(body.scoreA),scoreB=body.scoreB===""||body.scoreB==null?null:Number(body.scoreB),status=["pending","scheduled","in_progress","completed","cancelled"].includes(body.status)?body.status:"pending";
  if(status==="completed"&&match.resolved_format_id){await connection.rollback();return jsonResponseError("Este torneo usa sets y games. Cargá el resultado desde Formatos y resultados",409)}
  let winner=null;if(status==="completed"){if(!match.participant_a_registration_id||!match.participant_b_registration_id||scoreA==null||scoreB==null||scoreA===scoreB){await connection.rollback();return jsonResponseError("Para finalizar indicá un resultado sin empate")}winner=scoreA>scoreB?match.participant_a_registration_id:match.participant_b_registration_id}
  await connection.query("UPDATE tags_club_matches SET resource_id=?,court_name=?,scheduled_at=?,score_a=?,score_b=?,status=?,winner_registration_id=?,notes=?,completed_at=IF(?='completed',NOW(),NULL),updated_at=NOW() WHERE id=?",[Number(body.resourceId)||null,cleanText(body.courtName,190)||null,date(body.scheduledAt),scoreA,scoreB,status,winner,cleanText(body.notes,2000)||null,status,match.id]);
  if(winner){match.winner_registration_id=winner;const[next]=await connection.query("SELECT * FROM tags_club_matches WHERE source_match_a_id=? OR source_match_b_id=? FOR UPDATE",[match.id,match.id]);for(const item of next){const side=Number(item.source_match_a_id)===match.id?"a":"b",participant=item[`source_outcome_${side}`]==="loser"?loser(match):winner;await connection.query(`UPDATE tags_club_matches SET participant_${side}_registration_id=?,updated_at=NOW() WHERE id=?`,[participant,item.id])}}
  await connection.commit();return Response.json({ok:true,winnerRegistrationId:winner});
 }catch(error){if(connection)await connection.rollback();console.error("CLUB MATCH UPDATE ERROR",error);return jsonResponseError("No se pudo actualizar el partido",500)}finally{connection?.release()}
}
