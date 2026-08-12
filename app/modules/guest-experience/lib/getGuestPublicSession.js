import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";
import { hashGuestToken } from "./guestExperienceService";

export async function getGuestPublicSession(slug) {
    const token = (await cookies()).get("tags_guest_session")?.value || "";
    if (!token || !slug) return null;
    const [rows] = await db.query(
        `SELECT se.id session_id,se.stay_id,se.guest_id,se.expires_at,a.*,s.stay_code,s.status stay_status,s.starts_at,s.ends_at,s.adults,s.children,s.expected_arrival_text,
                (SELECT pc.status FROM tags_guest_precheckins pc WHERE pc.stay_id=s.id LIMIT 1) precheckin_status,
                u.name unit_name,g.name guest_name,g.email guest_email,g.phone guest_phone
         FROM tags_guest_sessions se
         INNER JOIN tags_guest_apps a ON a.id=se.guest_app_id AND a.slug=? AND a.status='published'
         INNER JOIN tags_guest_stays s ON s.id=se.stay_id AND s.guest_app_id=a.id
         INNER JOIN tags_guest_people g ON g.id=se.guest_id
         LEFT JOIN tags_guest_units u ON u.id=s.unit_id
         WHERE se.session_hash=? AND se.revoked_at IS NULL AND se.expires_at>NOW() LIMIT 1`,
        [slug, hashGuestToken(token)]
    );
    if (!rows[0]) return null;
    await db.query("UPDATE tags_guest_sessions SET last_seen_at=NOW() WHERE id=?", [rows[0].session_id]);
    return rows[0];
}
