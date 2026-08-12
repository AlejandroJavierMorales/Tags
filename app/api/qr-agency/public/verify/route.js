export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";

export async function GET(req) {
    const url = new URL(req.url), agencySlug = String(url.searchParams.get("agency") || ""), token = String(url.searchParams.get("token") || "");
    const fail = () => Response.redirect(new URL(`/agency/${encodeURIComponent(agencySlug)}/login?error=invalid_link`, url.origin));
    if (!agencySlug || !token) return fail();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex"), sessionToken = crypto.randomBytes(32).toString("hex"), sessionHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.query(
            `SELECT t.id token_id,t.agency_id,t.customer_id,a.session_days
             FROM tags_qr_agency_access_tokens t
             INNER JOIN tags_qr_agencies a ON a.id=t.agency_id AND a.slug=? AND a.status='active'
             INNER JOIN tags_qr_agency_customers c ON c.id=t.customer_id AND c.status='active'
             WHERE t.token_hash=? AND t.purpose='login' AND t.used_at IS NULL AND t.revoked_at IS NULL AND t.expires_at>NOW()
             LIMIT 1 FOR UPDATE`,
            [agencySlug, tokenHash]
        );
        const item = rows[0];
        if (!item) { await conn.rollback(); return fail(); }
        const days = Math.max(1, Math.min(90, Number(item.session_days || 30)));
        await conn.query("UPDATE tags_qr_agency_access_tokens SET used_at=NOW() WHERE id=?", [item.token_id]);
        await conn.query(`INSERT INTO tags_qr_agency_sessions (agency_id,customer_id,session_hash,expires_at,last_seen_at) VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL ${days} DAY),NOW())`, [item.agency_id, item.customer_id, sessionHash]);
        await conn.query("UPDATE tags_qr_agency_customers SET last_access_at=NOW() WHERE id=?", [item.customer_id]);
        await conn.query("INSERT INTO tags_qr_agency_audit_log (agency_id,customer_id,actor_type,actor_id,action) VALUES (?,?,'customer',?,'customer_login')", [item.agency_id, item.customer_id, String(item.customer_id)]);
        await conn.commit();
        (await cookies()).set("tags_qr_agency_session", sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: `/agency/${agencySlug}`, maxAge: days * 86400 });
        return Response.redirect(new URL(`/agency/${encodeURIComponent(agencySlug)}/panel`, url.origin));
    } catch (error) {
        await conn.rollback();
        console.error("QR AGENCY VERIFY ERROR", error);
        return fail();
    } finally { conn.release(); }
}
