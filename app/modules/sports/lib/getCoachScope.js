import { db } from "@/app/lib/tags-db";
import { getSportsAccess } from "./getSportsAccess";

export async function getCoachScope({ businessId, turnosId, permission, coachId = 0 }) {
  const access = await getSportsAccess({ businessId, turnosId, permission });
  if (!access.allowed) return { access, coach: null };
  if (access.isOwner) {
    if (!coachId) return { access, coach: null };
    const [[coach]] = await db.query("SELECT * FROM tags_club_coaches WHERE id=? AND sports_app_id=? LIMIT 1", [coachId, access.sportsApp.id]);
    return { access, coach: coach || null };
  }
  const staffId = Number(access.staff?.id || access.session?.staffId || 0);
  const [[coach]] = await db.query("SELECT * FROM tags_club_coaches WHERE staff_id=? AND sports_app_id=? AND status='active' LIMIT 1", [staffId, access.sportsApp.id]);
  return { access, coach: coach || null };
}
