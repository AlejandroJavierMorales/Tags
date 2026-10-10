export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSportsAccess } from "@/app/modules/sports/lib/getSportsAccess";
import { turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const q = Object.fromEntries(new URL(req.url).searchParams);
    const access = await getSportsAccess({ businessId: Number(q.businessId), turnosId: Number(q.turnosId), permission: ["sports.rankings.view", "sports.rankings.manage"] });
    if (!access.allowed) return turnosAccessResponse(access);
    const disciplineId = Number(q.disciplineId);
    if (!disciplineId) return jsonResponseError("Seleccioná un deporte");
    const [rows] = await db.query(`SELECT m.*,ra.participant_id participant_a_id,ra.participant_type participant_a_type,rb.participant_id participant_b_id,rb.participant_type participant_b_type,COALESCE(pa.display_name,CONCAT(pa.first_name,' ',pa.last_name),ta.name) participant_a_name,COALESCE(pb.display_name,CONCAT(pb.first_name,' ',pb.last_name),tb.name) participant_b_name,COALESCE(rr.points_win,3) points_win,COALESCE(rr.points_loss,0) points_loss FROM tags_club_matches m INNER JOIN tags_club_tournaments t ON t.id=m.tournament_id AND t.discipline_id=? LEFT JOIN tags_club_ranking_rules rr ON rr.id=t.ranking_rule_id LEFT JOIN tags_club_tournament_registrations ra ON ra.id=m.participant_a_registration_id LEFT JOIN tags_club_tournament_registrations rb ON rb.id=m.participant_b_registration_id LEFT JOIN tags_club_players pa ON ra.participant_type='player' AND pa.id=ra.participant_id LEFT JOIN tags_club_players pb ON rb.participant_type='player' AND pb.id=rb.participant_id LEFT JOIN tags_club_teams ta ON ra.participant_type IN ('pair','team') AND ta.id=ra.participant_id LEFT JOIN tags_club_teams tb ON rb.participant_type IN ('pair','team') AND tb.id=rb.participant_id WHERE m.sports_app_id=? AND m.status='completed' AND m.winner_registration_id IS NOT NULL`, [disciplineId, access.sportsApp.id]);
    const map = new Map();
    function entry(id, type, name) {
        const key = `${type}:${id}`;
        if (!map.has(key)) map.set(key, { participantId: id, participantType: type, participantName: name || "Participante", played: 0, wins: 0, losses: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0, points: 0 });
        return map.get(key);
    }
    for (const match of rows) {
        if (!match.participant_a_id || !match.participant_b_id) continue;
        const a = entry(match.participant_a_id, match.participant_a_type, match.participant_a_name);
        const b = entry(match.participant_b_id, match.participant_b_type, match.participant_b_name);
        let detail = {};
        try { detail = JSON.parse(match.score_detail_json || "{}"); } catch {}
        a.played++; b.played++;
        a.setsWon += Number(match.score_a || 0); a.setsLost += Number(match.score_b || 0);
        b.setsWon += Number(match.score_b || 0); b.setsLost += Number(match.score_a || 0);
        a.gamesWon += Number(detail.gamesA || 0); a.gamesLost += Number(detail.gamesB || 0);
        b.gamesWon += Number(detail.gamesB || 0); b.gamesLost += Number(detail.gamesA || 0);
        if (Number(match.winner_registration_id) === Number(match.participant_a_registration_id)) { a.wins++; a.points += Number(match.points_win); b.losses++; b.points += Number(match.points_loss); }
        else { b.wins++; b.points += Number(match.points_win); a.losses++; a.points += Number(match.points_loss); }
    }
    const ranking = [...map.values()].map(x => ({ ...x, setDifference: x.setsWon - x.setsLost, gameDifference: x.gamesWon - x.gamesLost })).sort((a, b) => b.points - a.points || b.wins - a.wins || b.setDifference - a.setDifference || b.gameDifference - a.gameDifference || a.participantName.localeCompare(b.participantName, "es"));
    return Response.json({ ok: true, ranking });
}
