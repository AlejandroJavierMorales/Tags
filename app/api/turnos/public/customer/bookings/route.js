export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";
import { hashToken, jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const slug = String(new URL(req.url).searchParams.get("slug") || "");
    const token = (await cookies()).get("tags_turnos_customer_session")?.value || "";
    if (!slug || !token) return jsonResponseError("Necesitás ingresar mediante el enlace enviado a tu email", 401, "CUSTOMER_LOGIN_REQUIRED");
    const [auth] = await db.query(`SELECT t.email,t.turnos_id FROM tags_turnos_customer_auth_tokens t INNER JOIN tags_turnos_apps a ON a.id=t.turnos_id WHERE a.slug=? AND t.token_hash=? AND t.expires_at>NOW() LIMIT 1`, [slug, hashToken(token)]);
    if (!auth[0]) return jsonResponseError("La sesión venció. Solicitá un nuevo enlace", 401, "CUSTOMER_SESSION_EXPIRED");
    const [rows] = await db.query(`SELECT b.booking_number,b.status,b.starts_at,b.ends_at,b.party_size,b.service_id,b.location_id,s.name service_name,s.reschedule_notice_minutes,l.name location_name FROM tags_turnos_bookings b INNER JOIN tags_turnos_customers c ON c.id=b.customer_id INNER JOIN tags_turnos_services s ON s.id=b.service_id INNER JOIN tags_turnos_locations l ON l.id=b.location_id WHERE b.turnos_id=? AND LOWER(c.email)=? ORDER BY b.starts_at DESC`, [auth[0].turnos_id, auth[0].email]);
    return Response.json({ ok:true, email:auth[0].email, bookings:rows });
}
