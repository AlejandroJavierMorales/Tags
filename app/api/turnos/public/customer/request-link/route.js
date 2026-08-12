export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { sendMail } from "@/app/lib/sendMail";
import { db } from "@/app/lib/tags-db";
import { getTurnosBySlug } from "@/app/modules/turnos/lib/getTurnosPublic";
import { cleanText, hashToken, jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

export async function POST(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const slug = cleanText(body?.slug);
    const email = cleanText(body?.email, 190).toLowerCase();
    const purpose = body?.purpose === "manage" ? "manage" : "booking";
    if (!slug || !email || !email.includes("@")) return jsonResponseError("slug y email válido son requeridos");
    const app = await getTurnosBySlug(slug);
    if (!app) return jsonResponseError("Página de Turnos no encontrada", 404, "TURNOS_NOT_FOUND");
    const token = crypto.randomBytes(32).toString("hex");
    await db.query(`INSERT INTO tags_turnos_customer_auth_tokens (turnos_id, email, token_hash, purpose, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ${purpose === "manage" ? 60 : 15} MINUTE))`, [app.id, email, hashToken(token), purpose]);
    const baseUrl = process.env.NODE_ENV === "development" ? "http://localhost:3000" : process.env.NEXT_PUBLIC_BASE_URL_PROD;
    const link = `${baseUrl}/api/turnos/public/customer/verify-link?token=${token}&slug=${encodeURIComponent(slug)}&purpose=${purpose}`;
    const delivery = await sendMail({ to: email, subject: `Identificación para reservar en ${app.name}`, html: `<p>Confirmá tu identidad para continuar:</p><p><a href="${link}">Continuar con mi reserva</a></p>`, text: `Continuá con tu reserva: ${link}` });
    if (!delivery.ok) return Response.json({ ok: false, error: "No pudimos enviar el enlace" }, { status: 502 });
    return Response.json({ ok: true });
}
