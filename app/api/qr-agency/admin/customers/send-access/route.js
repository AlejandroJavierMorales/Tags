export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";
import { getQrAgencyAdminAccess, qrAgencyAdminError } from "@/app/modules/qr-agency/lib/getQrAgencyAdminAccess";

function html(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

export async function POST(req) {
    const body = await req.json().catch(() => null);
    const businessId = Number(body?.businessId || 0), customerId = Number(body?.customerId || 0);
    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);
    const [rows] = await db.query(
        `SELECT c.id,c.name,c.email,a.id agency_id,a.slug,a.magic_link_minutes,b.display_name,b.name business_name,b.logo_url
         FROM tags_qr_agency_customers c
         INNER JOIN tags_qr_agencies a ON a.id=c.agency_id AND a.business_id=? AND a.status='active'
         INNER JOIN tags_businesses b ON b.id=a.business_id
         WHERE c.id=? AND c.status='active' LIMIT 1`,
        [businessId, customerId]
    );
    const item = rows[0];
    if (!item) return Response.json({ ok: false, error: "Cliente activo no encontrado" }, { status: 404 });
    const token = crypto.randomBytes(32).toString("hex"), hash = crypto.createHash("sha256").update(token).digest("hex"), minutes = Math.max(10, Math.min(120, Number(item.magic_link_minutes || 30)));
    await db.query("UPDATE tags_qr_agency_access_tokens SET revoked_at=NOW() WHERE customer_id=? AND purpose='login' AND used_at IS NULL AND revoked_at IS NULL", [customerId]);
    const [result] = await db.query(`INSERT INTO tags_qr_agency_access_tokens (agency_id,customer_id,token_hash,purpose,expires_at) VALUES (?,?,?,'login',DATE_ADD(NOW(),INTERVAL ${minutes} MINUTE))`, [item.agency_id, customerId, hash]);
    const origin = process.env.NODE_ENV === "development" ? new URL(req.url).origin : (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL_PROD || new URL(req.url).origin);
    const link = `${origin}/api/qr-agency/public/verify?agency=${encodeURIComponent(item.slug)}&token=${token}`;
    const agencyName = item.display_name || item.business_name || "Tu agencia";
    const delivery = await sendMail({ to: item.email, subject: `Acceso a tus códigos QR · ${agencyName}`, html: `<div style="max-width:600px;margin:auto;font-family:Arial;color:#183226"><div style="padding:22px;background:#f2f8f4;text-align:center">${item.logo_url ? `<img src="${html(item.logo_url)}" alt="${html(agencyName)}" style="max-width:170px;max-height:85px">` : ""}<h1 style="font-size:24px">Administrá tus códigos QR</h1></div><div style="padding:24px"><p>Hola <strong>${html(item.name)}</strong>,</p><p>${html(agencyName)} te envía un acceso privado para administrar tus códigos QR y consultar sus estadísticas.</p><p style="text-align:center;margin:28px"><a href="${html(link)}" style="display:inline-block;padding:13px 20px;background:#198754;color:#fff;text-decoration:none;border-radius:9px;font-weight:bold">Ingresar a mi panel</a></p><p style="font-size:12px;color:#66766e">Este enlace vence en ${minutes} minutos y puede utilizarse una sola vez.</p></div></div>`, text: `Acceso a tus códigos QR: ${link}` });
    if (!delivery.ok) {
        await db.query("UPDATE tags_qr_agency_access_tokens SET revoked_at=NOW() WHERE id=?", [result.insertId]);
        return Response.json({ ok: false, error: "El acceso fue generado pero no se pudo enviar el email" }, { status: 502 });
    }
    await db.query("INSERT INTO tags_qr_agency_audit_log (agency_id,customer_id,actor_type,actor_id,action,after_json) VALUES (?,?,?,?,?,?)", [item.agency_id, customerId, access.session.role === "admin" ? "platform" : "agency", String(access.session.id || access.session.email || ""), "customer_access_sent", JSON.stringify({ tokenId: result.insertId, email: item.email })]);
    return Response.json({ ok: true });
}
