export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { renderToBuffer } from "@react-pdf/renderer";
import BusinessReportPDF from "@/app/components/pdf/BusinessReportPDF";
import { getBusinessStats } from "@/app/lib/businessStats";
import { db } from "@/app/lib/tags-db";
import { getQrAgencyAdminAccess, qrAgencyAdminError } from "@/app/modules/qr-agency/lib/getQrAgencyAdminAccess";

function dateRange(days) {
    const safeDays = Math.min(365, Math.max(1, Number(days) || 30));
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - safeDays + 1);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export async function POST(req) {
    const { searchParams } = new URL(req.url);
    const businessId = Number(searchParams.get("businessId") || 0);
    const customerId = Number(searchParams.get("customerId") || 0);
    const qrId = Number(searchParams.get("qrId") || 0);
    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);

    try {
        const [[agency]] = await db.query(
            `SELECT a.id,b.name AS business_name,b.email AS business_email
             FROM tags_qr_agencies a INNER JOIN tags_businesses b ON b.id=a.business_id
             WHERE a.business_id=? AND a.status='active' LIMIT 1`, [businessId]
        );
        if (!agency) return Response.json({ ok: false, error: "QR Agency no está activo" }, { status: 404 });
        const [rows] = await db.query(
            `SELECT a.qr_code_id AS id,a.customer_id,c.name AS customer_name
             FROM tags_qr_agency_assignments a
             LEFT JOIN tags_qr_agency_customers c ON c.id=a.customer_id
             WHERE a.agency_id=? AND a.status<>'archived'`, [agency.id]
        );
        let scoped = rows;
        if (customerId) scoped = scoped.filter((row) => Number(row.customer_id) === customerId);
        if (qrId) scoped = scoped.filter((row) => Number(row.id) === qrId);
        const range = dateRange(searchParams.get("days"));
        const body = await req.json().catch(() => ({}));
        const stats = await getBusinessStats({ businessId, from: range.from, to: range.to, qrIds: scoped.map((row) => Number(row.id)) });
        const data = {
            ...stats,
            charts: body?.charts || {},
            reportScope: {
                title: "QR Agency · Reporte de estadísticas",
                customer: scoped[0]?.customer_name || (customerId ? "Cliente seleccionado" : "Todos los clientes"),
                qr: qrId ? "QR seleccionado" : "Todos los QRs seleccionados"
            },
            business: { id: businessId, name: agency.business_name, email: agency.business_email }
        };
        const pdf = await renderToBuffer(<BusinessReportPDF data={data} />);
        return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=qr-agency-stats-${businessId}.pdf` } });
    } catch (error) {
        console.error("QR Agency stats PDF error:", error);
        return Response.json({ ok: false, error: "No se pudo generar el reporte PDF" }, { status: 500 });
    }
}
