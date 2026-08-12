export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";
import { hashToken, jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const params = new URL(req.url).searchParams;
    const token = String(params.get("token") || "");
    const slug = String(params.get("slug") || "");
    const purpose = params.get("purpose") === "manage" ? "manage" : "booking";
    if (!token || !slug) return jsonResponseError("Token inválido", 400, "TOKEN_INVALID");
    const [rows] = await db.query(`SELECT t.id, t.turnos_id, t.email, t.purpose, a.slug FROM tags_turnos_customer_auth_tokens t INNER JOIN tags_turnos_apps a ON a.id = t.turnos_id WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > NOW() AND a.slug = ? LIMIT 1`, [hashToken(token), slug]);
    if (!rows[0]) return jsonResponseError("El enlace venció o ya fue utilizado", 410, "TOKEN_EXPIRED");
    const store = await cookies();
    store.set("tags_turnos_customer_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: rows[0].purpose === "manage" ? 60 * 60 : 15 * 60, path: "/" });
    return Response.redirect(new URL(rows[0].purpose === "manage" ? `/p/${slug}/mis-turnos` : `/p/${slug}?identified=1`, req.url));
}
