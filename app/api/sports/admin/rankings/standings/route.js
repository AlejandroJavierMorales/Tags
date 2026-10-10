export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSportsAccess } from "@/app/modules/sports/lib/getSportsAccess";
import { turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { jsonResponseError } from "@/app/modules/turnos/lib/turnosService";
import { calculateStandings } from "@/app/modules/sports/lib/calculateStandings";

const participantName = `CASE WHEN r.participant_type='player' THEN COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name)) ELSE tm.name END`;

export async function GET(req) {
    const q = Object.fromEntries(new URL(req.url).searchParams);
    const access = await getSportsAccess({ businessId: Number(q.businessId), turnosId: Number(q.turnosId), permission: ["sports.rankings.view", "sports.rankings.manage"] });
    if (!access.allowed) return turnosAccessResponse(access);
    const tournamentId = Number(q.tournamentId);
    if (!tournamentId) return jsonResponseError("Seleccioná un torneo");
    const [[tournament]] = await db.query("SELECT * FROM tags_club_tournaments WHERE id=? AND sports_app_id=?", [tournamentId, access.sportsApp.id]);
    if (!tournament) return jsonResponseError("Torneo no encontrado", 404);
    let rule = {};
    if (tournament.ranking_rule_id) {
        const [rows] = await db.query("SELECT * FROM tags_club_ranking_rules WHERE id=? AND sports_app_id=?", [tournament.ranking_rule_id, access.sportsApp.id]);
        rule = rows[0] || {};
    }
    const [groups] = await db.query("SELECT * FROM tags_club_tournament_groups WHERE tournament_id=? ORDER BY sort_order", [tournamentId]);
    const result = [];
    if (groups.length) {
        for (const group of groups) {
            const [registrations] = await db.query(`SELECT r.id,${participantName} participant_name FROM tags_club_tournament_group_members gm INNER JOIN tags_club_tournament_registrations r ON r.id=gm.registration_id LEFT JOIN tags_club_players p ON r.participant_type='player' AND p.id=r.participant_id LEFT JOIN tags_club_teams tm ON r.participant_type IN ('pair','team') AND tm.id=r.participant_id WHERE gm.group_id=? ORDER BY gm.sort_order`, [group.id]);
            const [matches] = await db.query("SELECT m.* FROM tags_club_matches m INNER JOIN tags_club_tournament_rounds rd ON rd.id=m.round_id WHERE m.tournament_id=? AND rd.stage_code=?", [tournamentId, `group_${group.id}`]);
            result.push({ group, standings: calculateStandings(registrations, matches, rule) });
        }
    } else {
        const [registrations] = await db.query(`SELECT r.id,${participantName} participant_name FROM tags_club_tournament_registrations r LEFT JOIN tags_club_players p ON r.participant_type='player' AND p.id=r.participant_id LEFT JOIN tags_club_teams tm ON r.participant_type IN ('pair','team') AND tm.id=r.participant_id WHERE r.tournament_id=? AND r.status='confirmed'`, [tournamentId]);
        const [matches] = await db.query("SELECT * FROM tags_club_matches WHERE tournament_id=?", [tournamentId]);
        result.push({ group: null, standings: calculateStandings(registrations, matches, rule) });
    }
    return Response.json({ ok: true, tournament, rule, groups: result });
}
