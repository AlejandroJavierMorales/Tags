import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";

export async function getQrAgencyCustomerSession(agencySlug) {
    const token = (await cookies()).get("tags_qr_agency_session")?.value || "";
    if (!token || !agencySlug) return null;
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const [rows] = await db.query(
        `SELECT s.id session_id,a.id agency_id,a.business_id,a.slug,a.qr_limit,
                c.id customer_id,c.name customer_name,c.email customer_email,c.phone customer_phone
         FROM tags_qr_agency_sessions s
         INNER JOIN tags_qr_agencies a ON a.id=s.agency_id AND a.slug=? AND a.status='active'
         INNER JOIN tags_qr_agency_customers c ON c.id=s.customer_id AND c.status='active'
         WHERE s.session_hash=? AND s.revoked_at IS NULL AND s.expires_at>NOW()
         LIMIT 1`,
        [agencySlug, hash]
    );
    if (!rows[0]) return null;
    await db.query("UPDATE tags_qr_agency_sessions SET last_seen_at=NOW() WHERE id=?", [rows[0].session_id]);
    return rows[0];
}
