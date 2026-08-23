export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";

const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

export async function POST(req, { params }) {
    const { agencySlug } = await params;
    const body = await req.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();
    const generic = { ok: true, message: "Si el email pertenece a un cliente activo, recibirás un nuevo enlace de acceso." };
    if (!agencySlug || !email || !/^\S+@\S+\.\S+$/.test(email)) return Response.json(generic);
    const [rows] = await db.query(`SELECT c.id,c.name,c.email,a.id agency_id,a.slug,a.magic_link_minutes,b.display_name,b.name business_name,b.logo_url FROM tags_qr_agency_customers c INNER JOIN tags_qr_agencies a ON a.id=c.agency_id AND a.slug=? AND a.status='active' INNER JOIN tags_businesses b ON b.id=a.business_id WHERE c.email_normalized=? AND c.status='active' LIMIT 1`, [agencySlug, email]);
    const item = rows[0];
    if (!item) return Response.json(generic);
    const token = crypto.randomBytes(32).toString("hex"), hash = crypto.createHash("sha256").update(token).digest("hex"), minutes = Math.max(10, Math.min(120, Number(item.magic_link_minutes || 30)));
    await db.query("UPDATE tags_qr_agency_access_tokens SET revoked_at=NOW() WHERE customer_id=? AND purpose='login' AND used_at IS NULL AND revoked_at IS NULL", [item.id]);
    await db.query(`INSERT INTO tags_qr_agency_access_tokens (agency_id,customer_id,token_hash,purpose,expires_at) VALUES (?,?,?,'login',DATE_ADD(NOW(),INTERVAL ${minutes} MINUTE))`, [item.agency_id, item.id, hash]);
    const origin = process.env.NODE_ENV === "development" ? new URL(req.url).origin : (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL_PROD || new URL(req.url).origin);
    const link = `${origin}/api/qr-agency/public/verify?agency=${encodeURIComponent(item.slug)}&token=${token}`;
    const loginUrl = `${origin}/agency/${encodeURIComponent(item.slug)}/login`;
    const logoUrl = `${origin}/logo.webp`;
    const agencyName = item.display_name || item.business_name || "Tu agencia";
    const delivery = await sendMail({
        to: item.email,
        subject: `Nuevo acceso a tus códigos QR · ${agencyName}`,
        html: `<div style="max-width:600px;margin:auto;font-family:Arial;color:#183226"><div style="padding:22px;background:#f2f8f4;text-align:center"><img src="${escapeHtml(logoUrl)}" alt="Tags" style="max-width:170px;max-height:85px"><h1 style="font-size:24px">Acceso a tus códigos QR</h1></div><div style="padding:24px"><p>Hola <strong>${escapeHtml(item.name)}</strong>,</p><p>Solicitaste un nuevo enlace para administrar tus códigos QR y consultar tus estadísticas.</p><p style="text-align:center;margin:28px"><a href="${escapeHtml(link)}" style="display:inline-block;padding:13px 20px;background:#198754;color:#fff;text-decoration:none;border-radius:9px;font-weight:bold">Ingresar a mi panel</a></p><p style="font-size:12px;color:#66766e">Este enlace vence en ${minutes} minutos y puede utilizarse una sola vez.</p><p style="font-size:12px;color:#66766e">Para volver a solicitar acceso, guardá esta dirección: <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p></div></div>`,
        text: `Acceso a tus códigos QR: ${link}\n\nLogin permanente: ${loginUrl}`
    });
    if (!delivery.ok) return Response.json({ ok: false, error: "No se pudo enviar el enlace. Intentá nuevamente." }, { status: 502 });
    await db.query("INSERT INTO tags_qr_agency_audit_log (agency_id,customer_id,actor_type,actor_id,action,after_json) VALUES (?,?, 'customer', ?, ?, ?)", [item.agency_id, item.id, String(item.id), "customer_access_requested", JSON.stringify({ email: item.email })]);
    return Response.json(generic);
}
