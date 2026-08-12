export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { db } from "@/app/lib/tags-db";
import { getQrAgencyAdminAccess, qrAgencyAdminError } from "@/app/modules/qr-agency/lib/getQrAgencyAdminAccess";

const statuses = new Set(["active", "paused"]);
const clean = (value, max = 255) => String(value || "").trim().slice(0, max);

function safeUrl(value) {
    try {
        const url = new URL(clean(value, 2000));
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return "";
        return url.toString();
    } catch { return ""; }
}

function actor(access) {
    return { type: access.session.role === "admin" ? "platform" : "agency", id: String(access.session.id || access.session.email || "") };
}

async function agencyContext(executor, businessId, lock = false) {
    const [rows] = await executor.query(
        `SELECT a.id,a.business_id,a.digital_product_id,a.qr_limit,a.status
         FROM tags_qr_agencies a WHERE a.business_id=? ${lock ? "FOR UPDATE" : ""}`,
        [businessId]
    );
    return rows[0] || null;
}

async function uniqueCode(conn) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
        const code = crypto.randomBytes(6).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
        const [rows] = await conn.query("SELECT id FROM tags_qr_codes WHERE code=? LIMIT 1", [code]);
        if (!rows.length) return code;
    }
    throw new Error("No se pudo generar un código único");
}

export async function GET(req) {
    const businessId = Number(new URL(req.url).searchParams.get("businessId") || 0);
    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);
    const agency = await agencyContext(db, businessId);
    if (!agency) return Response.json({ ok: false, error: "QR Agency no está activado" }, { status: 404 });
    const [qrs] = await db.query(
        `SELECT x.id assignment_id,x.status assignment_status,x.assigned_at,
                q.id qr_id,q.code,q.label,q.final_url,q.stop_message,q.total_clicks,q.last_click_at,q.status qr_status,
                c.id customer_id,c.name customer_name,c.email customer_email
         FROM tags_qr_agency_assignments x
         INNER JOIN tags_qr_codes q ON q.id=x.qr_code_id
         INNER JOIN tags_qr_agency_customers c ON c.id=x.customer_id
         WHERE x.agency_id=? AND x.status<>'archived'
         ORDER BY c.name,q.label,q.code`,
        [agency.id]
    );
    const [customers] = await db.query("SELECT id,name,email FROM tags_qr_agency_customers WHERE agency_id=? AND status='active' ORDER BY name", [agency.id]);
    return Response.json({ ok: true, qrs, customers, usage: { used: qrs.length, limit: Number(agency.qr_limit || 0) } });
}

export async function POST(req) {
    const body = await req.json().catch(() => null);
    const businessId = Number(body?.businessId || 0), customerId = Number(body?.customerId || 0);
    const label = clean(body?.label, 190), finalUrl = safeUrl(body?.finalUrl);
    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);
    if (!customerId || !label || !finalUrl) return Response.json({ ok: false, error: "Completá cliente, nombre y una URL http/https válida" }, { status: 400 });
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const agency = await agencyContext(conn, businessId, true);
        if (!agency || agency.status !== "active") throw Object.assign(new Error("QR Agency no está activo"), { httpStatus: 409 });
        const [customers] = await conn.query("SELECT id,email FROM tags_qr_agency_customers WHERE id=? AND agency_id=? AND status='active' LIMIT 1", [customerId, agency.id]);
        if (!customers[0]) throw Object.assign(new Error("Cliente no encontrado o suspendido"), { httpStatus: 404 });
        const [usage] = await conn.query("SELECT COUNT(*) total FROM tags_qr_agency_assignments WHERE agency_id=? AND status IN ('active','paused')", [agency.id]);
        if (Number(usage[0]?.total || 0) >= Number(agency.qr_limit || 0)) throw Object.assign(new Error("La agencia alcanzó el cupo de QRs contratado"), { httpStatus: 409 });
        const code = await uniqueCode(conn);
        const [qrResult] = await conn.query(
            `INSERT INTO tags_qr_codes (business_id,code,label,is_active,value,final_url,email,status,total_clicks,tracking_enabled,stop_message,product_id,has_qr_page,created_at)
             VALUES (?,?,?,1,?,?,?,'active',0,1,NULL,?,0,NOW())`,
            [businessId, code, label, finalUrl, finalUrl, customers[0].email, agency.digital_product_id]
        );
        await conn.query("INSERT INTO tags_qr_agency_assignments (agency_id,customer_id,qr_code_id,status,assigned_at) VALUES (?,?,?,'active',NOW())", [agency.id, customerId, qrResult.insertId]);
        const a = actor(access);
        await conn.query("INSERT INTO tags_qr_agency_audit_log (agency_id,customer_id,qr_code_id,actor_type,actor_id,action,after_json) VALUES (?,?,?,?,?,'qr_created',?)", [agency.id, customerId, qrResult.insertId, a.type, a.id, JSON.stringify({ code, label, finalUrl })]);
        await conn.commit();
        return Response.json({ ok: true, qrId: qrResult.insertId, code });
    } catch (error) {
        await conn.rollback();
        console.error("QR AGENCY QR CREATE ERROR", error);
        return Response.json({ ok: false, error: error.httpStatus ? error.message : "No se pudo crear el QR" }, { status: error.httpStatus || 500 });
    } finally { conn.release(); }
}

export async function PATCH(req) {
    const body = await req.json().catch(() => null);
    const businessId = Number(body?.businessId || 0), assignmentId = Number(body?.assignmentId || 0), customerId = Number(body?.customerId || 0);
    const label = clean(body?.label, 190), finalUrl = safeUrl(body?.finalUrl), status = clean(body?.status, 20), stopMessage = clean(body?.stopMessage, 500);
    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);
    if (!assignmentId || !customerId || !label || !finalUrl || !statuses.has(status)) return Response.json({ ok: false, error: "Revisá cliente, nombre, destino y estado" }, { status: 400 });
    if (status === "paused" && !stopMessage) return Response.json({ ok: false, error: "Indicá el mensaje que verá el usuario mientras el QR esté pausado" }, { status: 400 });
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const agency = await agencyContext(conn, businessId, true);
        if (!agency) throw Object.assign(new Error("QR Agency no está activado"), { httpStatus: 404 });
        const [rows] = await conn.query(`SELECT x.*,q.code,q.label,q.final_url,q.stop_message FROM tags_qr_agency_assignments x INNER JOIN tags_qr_codes q ON q.id=x.qr_code_id WHERE x.id=? AND x.agency_id=? AND x.status<>'archived' LIMIT 1 FOR UPDATE`, [assignmentId, agency.id]);
        const current = rows[0];
        if (!current) throw Object.assign(new Error("QR no encontrado"), { httpStatus: 404 });
        const [customers] = await conn.query("SELECT id,email FROM tags_qr_agency_customers WHERE id=? AND agency_id=? AND status='active' LIMIT 1", [customerId, agency.id]);
        if (!customers[0]) throw Object.assign(new Error("El cliente de destino no está disponible"), { httpStatus: 409 });
        const qrStatus = status === "paused" ? "stopped" : "active";
        await conn.query("UPDATE tags_qr_codes SET label=?,value=?,final_url=?,email=?,status=?,is_active=?,stop_message=? WHERE id=?", [label, finalUrl, finalUrl, customers[0].email, qrStatus, status === "active" ? 1 : 0, stopMessage || current.stop_message || null, current.qr_code_id]);
        await conn.query("UPDATE tags_qr_agency_assignments SET customer_id=?,status=?,assigned_at=IF(?=1,NOW(),assigned_at),updated_at=NOW() WHERE id=?", [customerId, status, Number(current.customer_id) !== customerId ? 1 : 0, assignmentId]);
        const a = actor(access);
        await conn.query("INSERT INTO tags_qr_agency_audit_log (agency_id,customer_id,qr_code_id,actor_type,actor_id,action,before_json,after_json) VALUES (?,?,?,?,?,'qr_updated',?,?)", [agency.id, customerId, current.qr_code_id, a.type, a.id, JSON.stringify({ customerId: current.customer_id, label: current.label, finalUrl: current.final_url, status: current.status }), JSON.stringify({ customerId, label, finalUrl, status, stopMessage: stopMessage || null })]);
        await conn.commit();
        return Response.json({ ok: true });
    } catch (error) {
        await conn.rollback();
        console.error("QR AGENCY QR UPDATE ERROR", error);
        return Response.json({ ok: false, error: error.httpStatus ? error.message : "No se pudo modificar el QR" }, { status: error.httpStatus || 500 });
    } finally { conn.release(); }
}

export async function DELETE(req) {
    const body = await req.json().catch(() => null);
    const businessId = Number(body?.businessId || 0), assignmentId = Number(body?.assignmentId || 0);
    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const agency = await agencyContext(conn, businessId, true);
        const [rows] = await conn.query("SELECT * FROM tags_qr_agency_assignments WHERE id=? AND agency_id=? AND status<>'archived' LIMIT 1 FOR UPDATE", [assignmentId, agency?.id || 0]);
        const current = rows[0];
        if (!current) throw Object.assign(new Error("QR no encontrado"), { httpStatus: 404 });
        await conn.query("UPDATE tags_qr_agency_assignments SET status='archived',unassigned_at=NOW(),updated_at=NOW() WHERE id=?", [assignmentId]);
        await conn.query("UPDATE tags_qr_codes SET status='disabled',is_active=0 WHERE id=?", [current.qr_code_id]);
        const a = actor(access);
        await conn.query("INSERT INTO tags_qr_agency_audit_log (agency_id,customer_id,qr_code_id,actor_type,actor_id,action,before_json) VALUES (?,?,?,?,?,'qr_archived',?)", [agency.id, current.customer_id, current.qr_code_id, a.type, a.id, JSON.stringify({ status: current.status })]);
        await conn.commit();
        return Response.json({ ok: true });
    } catch (error) {
        await conn.rollback();
        console.error("QR AGENCY QR ARCHIVE ERROR", error);
        return Response.json({ ok: false, error: error.httpStatus ? error.message : "No se pudo archivar el QR" }, { status: error.httpStatus || 500 });
    } finally { conn.release(); }
}
