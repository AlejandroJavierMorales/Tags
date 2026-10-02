export const runtime="nodejs";
export const dynamic="force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSessionUser } from "@/app/modules/users/lib/userSession";
import { ensureLoyaltyMember } from "@/app/modules/loyalty/lib/loyaltyMemberService";
import { sendBusinessPush } from "@/app/modules/notifications/server/sendBusinessPush";

export async function POST(request) {
    const session = await getSessionUser();
    if (!session) return Response.json({ success: false, error: "No autenticado" }, { status: 401 });
    const body = await request.json().catch(() => null);
    const programId = Number(body?.program_id || 0);
    const rewardId = Number(body?.reward_id || 0);
    if (!programId || !rewardId) return Response.json({ success: false, error: "Programa y recompensa son obligatorios" }, { status: 400 });
    try {
        const [[reward]] = await db.query(
            `SELECT r.*,p.business_id,p.name AS program_name,b.display_name AS business_name
               FROM tags_loyalty_rewards r
               INNER JOIN tags_loyalty_programs p ON p.id=r.program_id AND p.status='active'
               INNER JOIN tags_businesses b ON b.id=p.business_id
               INNER JOIN tags_business_addons ba ON ba.business_id=p.business_id AND ba.addon_code='loyalty' AND ba.status='active' AND (ba.expires_at IS NULL OR ba.expires_at>=NOW())
              WHERE r.id=? AND r.program_id=? AND r.status='active'
                AND (r.valid_from IS NULL OR r.valid_from<=NOW())
                AND (r.valid_until IS NULL OR r.valid_until>=NOW())
              LIMIT 1`,
            [rewardId, programId]
        );
        if (!reward) return Response.json({ success: false, error: "La recompensa no está disponible" }, { status: 404 });
        const member = await ensureLoyaltyMember(session.userId);
        const [[account]] = await db.query(`SELECT * FROM tags_loyalty_accounts WHERE program_id=? AND member_id=? AND status='active' LIMIT 1`, [programId, member.id]);
        if (!account) return Response.json({ success: false, error: "Primero tenés que adherirte al programa" }, { status: 400 });
        if (Number(account.points_balance || 0) < Number(reward.required_points || 0) || Number(account.stamps_balance || 0) < Number(reward.required_stamps || 0) || Number(account.visits_balance || 0) < Number(reward.required_visits || 0)) {
            return Response.json({ success: false, error: "Todavía no alcanzaste el progreso necesario" }, { status: 400 });
        }
        const [pending] = await db.query(`SELECT id FROM tags_loyalty_claims WHERE business_id=? AND member_id=? AND program_id=? AND claim_type='redemption' AND status='pending' AND expires_at>NOW() LIMIT 1`, [reward.business_id, member.id, programId]);
        if (pending[0]) return Response.json({ success: false, error: "Ya tenés una solicitud de canje pendiente para este programa" }, { status: 409 });
        const [result] = await db.query(
            `INSERT INTO tags_loyalty_claims (business_id,program_id,member_id,account_id,claim_type,reward_id,status,requested_notes,expires_at)
             VALUES (?,?,?,?,?,'pending',?, ?,DATE_ADD(NOW(),INTERVAL 24 HOUR))`,
            [reward.business_id, programId, member.id, account.id, "redemption", rewardId, `Solicitud desde Mi cuenta: ${reward.name}`]
        );
        await sendBusinessPush({ businessId: reward.business_id, moduleCode: "loyalty", eventCode: "redemption_requested", entityType: "loyalty_claim", entityId: result.insertId, title: "Solicitud de canje pendiente", body: `${session.first_name || "Un cliente"} solicitó ${reward.name} en ${reward.program_name}`, url: `/dashboard/businesses/${reward.business_id}/loyalty`, idempotencyKey: `loyalty:claim:${result.insertId}:created`, payload: { claimId: result.insertId, programId, rewardId } });
        return Response.json({ success: true, claimId: result.insertId });
    } catch (error) {
        console.error("LOYALTY MEMBER REDEEM REQUEST ERROR", error);
        return Response.json({ success: false, error: error.message || "No se pudo solicitar el canje" }, { status: 500 });
    }
}
