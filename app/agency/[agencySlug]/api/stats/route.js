export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getBusinessStats } from "@/app/lib/businessStats";
import { getQrAgencyCustomerSession } from "@/app/modules/qr-agency/lib/getQrAgencyCustomerSession";

function dateRange(days) {
    const count = Math.min(365, Math.max(1, Number(days) || 30));
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - count + 1);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export async function GET(req, { params }) {
    const { agencySlug } = await params;
    const session = await getQrAgencyCustomerSession(agencySlug);
    if (!session) return Response.json({ ok: false, error: "La sesión venció" }, { status: 401 });

    const query = new URL(req.url).searchParams;
    const [[agency]] = await db.query("SELECT settings_json FROM tags_qr_agencies WHERE id=? LIMIT 1", [session.agency_id]);
    let settings = {};
    try { settings = typeof agency?.settings_json === "object" ? (agency.settings_json || {}) : JSON.parse(agency?.settings_json || "{}"); } catch { settings = {}; }
    if (settings.customerStatsEnabled === false) return Response.json({ ok: false, disabled: true, error: "Las estadísticas no están habilitadas para clientes" }, { status: 403 });

    const requestedQrId = Number(query.get("qrId") || 0);
    const [rows] = await db.query(
        `SELECT a.qr_code_id AS id FROM tags_qr_agency_assignments a
         WHERE a.agency_id=? AND a.customer_id=? AND a.status IN ('active','paused')`,
        [session.agency_id, session.customer_id]
    );
    const qrIds = rows.map((row) => Number(row.id));
    if (requestedQrId && !qrIds.includes(requestedQrId)) return Response.json({ ok: false, error: "QR no disponible" }, { status: 403 });
    const range = dateRange(query.get("days"));
    const stats = await getBusinessStats({ businessId: session.business_id, from: range.from, to: range.to, qrIds: requestedQrId ? [requestedQrId] : qrIds });
    return Response.json({ ok: true, filters: { ...range, days: Number(query.get("days") || 30), qrId: requestedQrId || "all" }, stats });
}
