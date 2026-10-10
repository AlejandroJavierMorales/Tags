export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSportsAccess } from "@/app/modules/sports/lib/getSportsAccess";
import { turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { cleanText, jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

async function context(source, permission) {
    const businessId=Number(source.businessId||0),turnosId=Number(source.turnosId||0);
    if(!businessId||!turnosId)return{error:jsonResponseError("businessId y turnosId son requeridos")};
    const access=await getSportsAccess({businessId,turnosId,permission});
    return access.allowed?{access}:{error:turnosAccessResponse(access)};
}

export async function GET(req) {
    const params=Object.fromEntries(new URL(req.url).searchParams),result=await context(params,["sports.teams.view","sports.teams.manage"]);
    if(result.error)return result.error;
    const [teams]=await db.query(`SELECT t.*,d.name discipline_name,c.name category_name,COUNT(CASE WHEN tm.status='active' THEN 1 END) member_count FROM tags_club_teams t INNER JOIN tags_sports_disciplines d ON d.id=t.discipline_id AND d.sports_app_id=t.sports_app_id LEFT JOIN tags_club_categories c ON c.id=t.category_id AND c.sports_app_id=t.sports_app_id LEFT JOIN tags_club_team_members tm ON tm.team_id=t.id AND tm.sports_app_id=t.sports_app_id WHERE t.sports_app_id=? GROUP BY t.id ORDER BY t.status='active' DESC,d.sort_order,t.name`,[result.access.sportsApp.id]);
    const [members]=await db.query(`SELECT tm.*,p.first_name,p.last_name,p.display_name,p.member_number FROM tags_club_team_members tm INNER JOIN tags_club_players p ON p.id=tm.player_id AND p.sports_app_id=tm.sports_app_id WHERE tm.sports_app_id=? AND tm.status='active' ORDER BY p.last_name,p.first_name`,[result.access.sportsApp.id]);
    const [players]=await db.query("SELECT id,first_name,last_name,display_name,member_number FROM tags_club_players WHERE sports_app_id=? AND status='active' ORDER BY last_name,first_name",[result.access.sportsApp.id]);
    return Response.json({ok:true,teams:teams.map(team=>({...team,members:members.filter(item=>Number(item.team_id)===Number(team.id))})),players});
}

async function save(req,editing){
    const body=await req.json().catch(()=>null);if(!body)return jsonResponseError("Datos inválidos");
    const result=await context(body,"sports.teams.manage");if(result.error)return result.error;
    const teamId=Number(body.teamId||0),disciplineId=Number(body.disciplineId||0),categoryId=Number(body.categoryId||0)||null,name=cleanText(body.name,190),teamType=["pair","team"].includes(body.teamType)?body.teamType:"team";
    if(!disciplineId||!name)return jsonResponseError("Deporte y nombre son requeridos");
    const [[discipline]]=await db.query("SELECT id FROM tags_sports_disciplines WHERE id=? AND sports_app_id=? AND is_active=1 LIMIT 1",[disciplineId,result.access.sportsApp.id]);if(!discipline)return jsonResponseError("Deporte inválido");
    if(categoryId){const[[category]]=await db.query("SELECT id FROM tags_club_categories WHERE id=? AND discipline_id=? AND sports_app_id=? AND is_active=1 LIMIT 1",[categoryId,disciplineId,result.access.sportsApp.id]);if(!category)return jsonResponseError("Categoría inválida");}
    const memberIds=[...new Set((Array.isArray(body.memberIds)?body.memberIds:[]).map(Number).filter(Boolean))];
    if(teamType==="pair"&&memberIds.length>2)return jsonResponseError("Una pareja puede tener como máximo dos integrantes");
    let connection;try{connection=await db.getConnection();await connection.beginTransaction();let savedId=teamId;
        const values=[disciplineId,categoryId,teamType,name,cleanText(body.code,80)||null,cleanText(body.logoUrl,2000)||null,cleanText(body.notes,2000)||null,["active","inactive","suspended"].includes(body.status)?body.status:"active"];
        if(editing){const[updated]=await connection.query("UPDATE tags_club_teams SET discipline_id=?,category_id=?,team_type=?,name=?,code=?,logo_url=?,notes=?,status=?,updated_at=NOW() WHERE id=? AND sports_app_id=?",[...values,teamId,result.access.sportsApp.id]);if(!updated.affectedRows){await connection.rollback();return jsonResponseError("Equipo no encontrado",404);}}
        else{const[created]=await connection.query("INSERT INTO tags_club_teams (sports_app_id,discipline_id,category_id,team_type,name,code,logo_url,notes,status) VALUES (?,?,?,?,?,?,?,?,?)",[result.access.sportsApp.id,...values]);savedId=created.insertId;}
        await connection.query("UPDATE tags_club_team_members SET status='inactive',left_at=NOW() WHERE sports_app_id=? AND team_id=? AND status='active'",[result.access.sportsApp.id,savedId]);
        for(let index=0;index<memberIds.length;index++){const[[player]]=await connection.query("SELECT id FROM tags_club_players WHERE id=? AND sports_app_id=? AND status='active' LIMIT 1",[memberIds[index],result.access.sportsApp.id]);if(player)await connection.query("INSERT INTO tags_club_team_members (sports_app_id,team_id,player_id,member_role,status) VALUES (?,?,?,?,'active')",[result.access.sportsApp.id,savedId,player.id,index===0?"captain":"player"]);}
        await connection.commit();return Response.json({ok:true,teamId:savedId},{status:editing?200:201});
    }catch(error){if(connection)await connection.rollback();if(error?.code==="ER_DUP_ENTRY")return jsonResponseError("El código del equipo ya está utilizado",409);console.error("CLUB TEAM SAVE ERROR",error);return jsonResponseError("No se pudo guardar el equipo",500);}finally{connection?.release();}
}
export async function POST(req){return save(req,false)}
export async function PATCH(req){return save(req,true)}
export async function DELETE(req){const body=await req.json().catch(()=>null),result=await context(body||{},"sports.teams.manage");if(result.error)return result.error;const[updated]=await db.query("UPDATE tags_club_teams SET status='inactive',updated_at=NOW() WHERE id=? AND sports_app_id=?",[Number(body.teamId||0),result.access.sportsApp.id]);return updated.affectedRows?Response.json({ok:true}):jsonResponseError("Equipo no encontrado",404)}
