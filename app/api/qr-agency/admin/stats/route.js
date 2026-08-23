export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getBusinessStats } from "@/app/lib/businessStats";
import { getQrAgencyAdminAccess, qrAgencyAdminError } from "@/app/modules/qr-agency/lib/getQrAgencyAdminAccess";

function dateRange(days) {
    const safeDays = Math.min(365, Math.max(1, Number(days) || 30));
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - safeDays + 1);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const businessId = Number(searchParams.get("businessId") || 0);
    const customerId = Number(searchParams.get("customerId") || 0);
    const qrId = Number(searchParams.get("qrId") || 0);
    const range = dateRange(searchParams.get("days"));

    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);

    try {
        const [[agency]] = await db.query(
            `SELECT a.id,a.business_id,b.name AS business_name,b.email AS business_email
             FROM tags_qr_agencies a
             INNER JOIN tags_businesses b ON b.id=a.business_id
             WHERE a.business_id=? AND a.status='active' LIMIT 1`,
            [businessId]
        );
        if (!agency) return Response.json({ ok: false, error: "QR Agency no está activo" }, { status: 404 });

        const [customers] = await db.query(
            `SELECT c.id,c.name,c.email,COUNT(a.id) AS qr_count
             FROM tags_qr_agency_customers c
             LEFT JOIN tags_qr_agency_assignments a
               ON a.customer_id=c.id AND a.agency_id=? AND a.status<>'archived'
             WHERE c.agency_id=? AND c.status='active'
             GROUP BY c.id,c.name,c.email
             ORDER BY c.name,c.email`,
            [agency.id, agency.id]
        );

        const [assignedQrs] = await db.query(
            `SELECT a.qr_code_id AS id,a.customer_id,c.name AS customer_name,
                    q.code,q.label,q.status,q.final_url
             FROM tags_qr_agency_assignments a
             INNER JOIN tags_qr_codes q ON q.id=a.qr_code_id
             LEFT JOIN tags_qr_agency_customers c ON c.id=a.customer_id
             WHERE a.agency_id=? AND a.status<>'archived'
             ORDER BY c.name,q.label,q.code`,
            [agency.id]
        );

        let scoped = assignedQrs;
        if (customerId) scoped = scoped.filter((item) => Number(item.customer_id) === customerId);
        if (qrId) scoped = scoped.filter((item) => Number(item.id) === qrId);
        const qrIds = scoped.map((item) => Number(item.id));

        const stats = await getBusinessStats({
            businessId,
            from: range.from,
            to: range.to,
            qrIds
        });

        return Response.json({
            ok: true,
            agency: { id: agency.id, businessId, name: agency.business_name, email: agency.business_email },
            filters: { customerId: customerId || "all", qrId: qrId || "all", days: Number(searchParams.get("days") || 30), ...range },
            customers,
            qrs: assignedQrs,
            scope: scoped.length ? { customer: scoped[0]?.customer_name || null, qrCount: scoped.length } : { customer: null, qrCount: 0 },
            stats: { ...stats, business: { ...stats.business, name: agency.business_name, email: agency.business_email } }
        });
    } catch (error) {
        console.error("QR Agency stats error:", error);
        return Response.json({ ok: false, error: "No se pudieron cargar las estadísticas" }, { status: 500 });
    }
}
