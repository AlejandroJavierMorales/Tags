import { cookies } from "next/headers";
import { hashToken } from "@/app/modules/turnos/lib/turnosService";

export async function getClubPublicSession(connection, turnosApp) {
    const token = (await cookies()).get("tags_turnos_customer_session")?.value || "";
    if (!token || !turnosApp?.id) return null;
    const [authRows] = await connection.query(`SELECT email FROM tags_turnos_customer_auth_tokens WHERE turnos_id=? AND token_hash=? AND expires_at>NOW() ORDER BY id DESC LIMIT 1`, [turnosApp.id, hashToken(token)]);
    const email = String(authRows[0]?.email || "").trim().toLowerCase();
    if (!email) return null;
    const [rows] = await connection.query(
        `SELECT p.*,sa.id sports_app_id,
          EXISTS(SELECT 1 FROM tags_club_memberships m WHERE m.sports_app_id=p.sports_app_id AND m.player_id=p.id AND m.status='active' AND (m.valid_from IS NULL OR m.valid_from<=CURRENT_DATE) AND (m.valid_until IS NULL OR m.valid_until>=CURRENT_DATE)) is_active_member
         FROM tags_sports_apps sa
         LEFT JOIN tags_turnos_customers c ON c.business_id=sa.business_id AND LOWER(c.email)=?
         LEFT JOIN tags_club_players p ON p.sports_app_id=sa.id AND (p.turnos_customer_id=c.id OR (p.turnos_customer_id IS NULL AND LOWER(p.email)=?))
         WHERE sa.turnos_id=? AND sa.business_id=? AND sa.status='active'
         ORDER BY p.turnos_customer_id IS NOT NULL DESC,p.id DESC LIMIT 1`,
        [email, email, turnosApp.id, turnosApp.business_id]
    );
    if (!rows[0]?.sports_app_id) return null;
    return { email, sportsAppId: Number(rows[0].sports_app_id), player: rows[0].id ? rows[0] : null, isActiveMember: Number(rows[0].is_active_member) === 1 };
}
