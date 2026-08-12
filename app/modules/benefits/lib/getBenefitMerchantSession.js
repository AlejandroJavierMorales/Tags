import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";
import { hashBenefitToken } from "./benefitService";

export async function getBenefitMerchantSession() {
    const token = (await cookies()).get("tags_benefit_session")?.value || "";
    if (!token) return null;
    const [rows] = await db.query(`SELECT se.id session_id,se.staff_id,se.merchant_id,se.expires_at,st.name staff_name,st.email,st.location_id,m.name merchant_name
        FROM tags_benefit_staff_sessions se INNER JOIN tags_benefit_staff st ON st.id=se.staff_id AND st.status='active'
        INNER JOIN tags_benefit_merchants m ON m.id=se.merchant_id AND m.status='active'
        WHERE se.session_hash=? AND se.revoked_at IS NULL AND se.expires_at>NOW() LIMIT 1`, [hashBenefitToken(token)]);
    if (!rows[0]) return null;
    await db.query("UPDATE tags_benefit_staff_sessions SET last_seen_at=NOW() WHERE id=?", [rows[0].session_id]);
    return rows[0];
}
