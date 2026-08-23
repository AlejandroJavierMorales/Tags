export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getQrAgencyCustomerSession } from "@/app/modules/qr-agency/lib/getQrAgencyCustomerSession";

const clean = (v, n = 255) => String(v || "").trim().slice(0, n);
function safeUrl(v) {
    try {
        const u = new URL(clean(v, 2000));
        return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password ? u.toString() : "";
    } catch { return ""; }
}

export async function GET(req, { params }) {
    const { agencySlug } = await params;
    const session = await getQrAgencyCustomerSession(agencySlug);
    if (!session) return Response.json({ ok: false, error: "La sesión venció" }, { status: 401 });
    const [qrs] = await db.query(
        `SELECT x.id assignment_id,x.status assignment_status,q.id qr_id,q.code,q.label,q.final_url,q.stop_message,q.total_clicks,q.last_click_at,q.browser_geolocation_enabled
         FROM tags_qr_agency_assignments x
         INNER JOIN tags_qr_codes q ON q.id=x.qr_code_id
         WHERE x.agency_id=? AND x.customer_id=? AND x.status IN ('active','paused')
         ORDER BY q.label,q.code`,
        [session.agency_id, session.customer_id]
    );
    return Response.json({ ok: true, customer: { name: session.customer_name, email: session.customer_email }, qrs });
}

export async function PATCH(req, { params }) {
    const { agencySlug } = await params;
    const session = await getQrAgencyCustomerSession(agencySlug);
    if (!session) return Response.json({ ok: false, error: "La sesión venció" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const assignmentId = Number(body?.assignmentId || 0);
    const label = clean(body?.label, 190);
    const finalUrl = safeUrl(body?.finalUrl);
    const status = clean(body?.status, 20);
    const stopMessage = clean(body?.stopMessage, 500);
    const browserGeolocationEnabled = body?.browserGeolocationEnabled ? 1 : 0;
    if (!assignmentId || !label || !finalUrl || !["active", "paused"].includes(status)) return Response.json({ ok: false, error: "Revisá el nombre, el destino y el estado" }, { status: 400 });
    if (status === "paused" && !stopMessage) return Response.json({ ok: false, error: "Indicá el mensaje de pausa" }, { status: 400 });
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.query(
            `SELECT x.*,q.label,q.final_url,q.stop_message,q.browser_geolocation_enabled
             FROM tags_qr_agency_assignments x INNER JOIN tags_qr_codes q ON q.id=x.qr_code_id
             WHERE x.id=? AND x.agency_id=? AND x.customer_id=? AND x.status IN ('active','paused') LIMIT 1 FOR UPDATE`,
            [assignmentId, session.agency_id, session.customer_id]
        );
        const current = rows[0];
        if (!current) { await conn.rollback(); return Response.json({ ok: false, error: "QR no encontrado" }, { status: 404 }); }
        await conn.query(
            "UPDATE tags_qr_codes SET label=?,value=?,final_url=?,status=?,is_active=?,browser_geolocation_enabled=?,stop_message=? WHERE id=?",
            [label, finalUrl, finalUrl, status === "paused" ? "stopped" : "active", status === "active" ? 1 : 0, browserGeolocationEnabled, stopMessage || current.stop_message || null, current.qr_code_id]
        );
        await conn.query("UPDATE tags_qr_agency_assignments SET status=?,updated_at=NOW() WHERE id=?", [status, assignmentId]);
        await conn.query(
            "INSERT INTO tags_qr_agency_audit_log (agency_id,customer_id,qr_code_id,actor_type,actor_id,action,before_json,after_json) VALUES (?,?,?,'customer',?,'qr_customer_updated',?,?)",
            [session.agency_id, session.customer_id, current.qr_code_id, String(session.customer_id), JSON.stringify({ label: current.label, finalUrl: current.final_url, status: current.status }), JSON.stringify({ label, finalUrl, status, stopMessage: stopMessage || null, browserGeolocationEnabled })]
        );
        await conn.commit();
        return Response.json({ ok: true });
    } catch (error) {
        await conn.rollback();
        console.error("QR AGENCY CUSTOMER QR UPDATE ERROR", error);
        return Response.json({ ok: false, error: "No se pudo modificar el QR" }, { status: 500 });
    } finally { conn.release(); }
}
