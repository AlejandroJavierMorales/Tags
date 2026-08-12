export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getQrAgencyAdminAccess, qrAgencyAdminError } from "@/app/modules/qr-agency/lib/getQrAgencyAdminAccess";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function text(value, max = 190) { return String(value || "").trim().slice(0, max); }
function phone(value) { return String(value || "").replace(/[^\d+]/g, "").slice(0, 30); }
function validPhone(value) { const digits = String(value || "").replace(/\D/g, ""); return !value || (digits.length >= 7 && digits.length <= 16); }
async function context(businessId) {
    const [rows] = await db.query("SELECT id FROM tags_qr_agencies WHERE business_id=? AND status IN ('active','draft') LIMIT 1", [businessId]);
    return rows[0] || null;
}
function actor(access) { return { type: access.session.role === "admin" ? "platform" : "agency", id: String(access.session.id || access.session.email || "") }; }

export async function GET(req) {
    const businessId = Number(new URL(req.url).searchParams.get("businessId") || 0);
    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);
    const agency = await context(businessId);
    if (!agency) return Response.json({ ok: false, error: "QR Agency no está activado" }, { status: 404 });
    const [customers] = await db.query(
        `SELECT c.*,
                (SELECT COUNT(*) FROM tags_qr_agency_assignments a WHERE a.customer_id=c.id AND a.status IN ('active','paused')) qr_count
         FROM tags_qr_agency_customers c
         WHERE c.agency_id=? AND c.status<>'archived'
         ORDER BY c.status='active' DESC,c.name,c.id`,
        [agency.id]
    );
    return Response.json({ ok: true, customers });
}

export async function POST(req) {
    const body = await req.json().catch(() => null);
    const businessId = Number(body?.businessId || 0), name = text(body?.name), email = text(body?.email).toLowerCase(), cleanPhone = phone(body?.phone), notes = text(body?.notes, 2000);
    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);
    if (!name) return Response.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
    if (!emailPattern.test(email)) return Response.json({ ok: false, error: "Ingresá un email válido" }, { status: 400 });
    if (!validPhone(cleanPhone)) return Response.json({ ok: false, error: "Ingresá un teléfono válido" }, { status: 400 });
    const agency = await context(businessId);
    if (!agency) return Response.json({ ok: false, error: "QR Agency no está activado" }, { status: 404 });
    try {
        const [duplicate] = await db.query("SELECT id FROM tags_qr_agency_customers WHERE agency_id=? AND email_normalized=? LIMIT 1", [agency.id, email]);
        if (duplicate.length) return Response.json({ ok: false, error: "Ya existe un cliente con ese email" }, { status: 409 });
        const [result] = await db.query("INSERT INTO tags_qr_agency_customers (agency_id,name,email,email_normalized,phone,status,notes) VALUES (?,?,?,?,?,'active',?)", [agency.id, name, email, email, cleanPhone || null, notes || null]);
        const a = actor(access);
        await db.query("INSERT INTO tags_qr_agency_audit_log (agency_id,customer_id,actor_type,actor_id,action,after_json) VALUES (?,?,?,?,?,?)", [agency.id, result.insertId, a.type, a.id, "customer_created", JSON.stringify({ name, email, phone: cleanPhone || null })]);
        return Response.json({ ok: true, customerId: result.insertId });
    } catch (error) {
        console.error("QR AGENCY CUSTOMER CREATE ERROR", error);
        return Response.json({ ok: false, error: "No se pudo crear el cliente" }, { status: 500 });
    }
}

export async function PATCH(req) {
    const body = await req.json().catch(() => null);
    const businessId = Number(body?.businessId || 0), customerId = Number(body?.customerId || 0);
    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);
    const agency = await context(businessId);
    if (!agency) return Response.json({ ok: false, error: "QR Agency no está activado" }, { status: 404 });
    const [rows] = await db.query("SELECT * FROM tags_qr_agency_customers WHERE id=? AND agency_id=? LIMIT 1", [customerId, agency.id]);
    const current = rows[0];
    if (!current) return Response.json({ ok: false, error: "Cliente no encontrado" }, { status: 404 });
    const name = text(body?.name ?? current.name), email = text(body?.email ?? current.email).toLowerCase(), cleanPhone = phone(body?.phone ?? current.phone), notes = text(body?.notes ?? current.notes, 2000);
    const status = ["active", "suspended"].includes(body?.status) ? body.status : current.status;
    if (!name || !emailPattern.test(email) || !validPhone(cleanPhone)) return Response.json({ ok: false, error: "Revisá nombre, email y teléfono" }, { status: 400 });
    const [duplicate] = await db.query("SELECT id FROM tags_qr_agency_customers WHERE agency_id=? AND email_normalized=? AND id<>? LIMIT 1", [agency.id, email, customerId]);
    if (duplicate.length) return Response.json({ ok: false, error: "Ya existe otro cliente con ese email" }, { status: 409 });
    await db.query("UPDATE tags_qr_agency_customers SET name=?,email=?,email_normalized=?,phone=?,notes=?,status=?,updated_at=NOW() WHERE id=? AND agency_id=?", [name, email, email, cleanPhone || null, notes || null, status, customerId, agency.id]);
    if (status !== "active") await db.query("UPDATE tags_qr_agency_sessions SET revoked_at=NOW() WHERE customer_id=? AND revoked_at IS NULL", [customerId]);
    const a = actor(access);
    await db.query("INSERT INTO tags_qr_agency_audit_log (agency_id,customer_id,actor_type,actor_id,action,before_json,after_json) VALUES (?,?,?,?,?,?,?)", [agency.id, customerId, a.type, a.id, "customer_updated", JSON.stringify({ name: current.name, email: current.email, phone: current.phone, status: current.status }), JSON.stringify({ name, email, phone: cleanPhone || null, status })]);
    return Response.json({ ok: true });
}

export async function DELETE(req) {
    const body = await req.json().catch(() => null);
    const businessId = Number(body?.businessId || 0), customerId = Number(body?.customerId || 0);
    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);
    const agency = await context(businessId);
    if (!agency) return Response.json({ ok: false, error: "QR Agency no está activado" }, { status: 404 });
    const [assigned] = await db.query("SELECT COUNT(*) total FROM tags_qr_agency_assignments WHERE customer_id=? AND status IN ('active','paused')", [customerId]);
    if (Number(assigned[0]?.total || 0) > 0) return Response.json({ ok: false, error: "Primero deben archivarse o reasignarse sus QRs" }, { status: 409 });
    const [result] = await db.query("UPDATE tags_qr_agency_customers SET status='archived',updated_at=NOW() WHERE id=? AND agency_id=?", [customerId, agency.id]);
    if (!result.affectedRows) return Response.json({ ok: false, error: "Cliente no encontrado" }, { status: 404 });
    await db.query("UPDATE tags_qr_agency_sessions SET revoked_at=NOW() WHERE customer_id=? AND revoked_at IS NULL", [customerId]);
    const a = actor(access);
    await db.query("INSERT INTO tags_qr_agency_audit_log (agency_id,customer_id,actor_type,actor_id,action) VALUES (?,?,?,?,?)", [agency.id, customerId, a.type, a.id, "customer_archived"]);
    return Response.json({ ok: true });
}
