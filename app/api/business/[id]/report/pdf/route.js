import { renderToBuffer } from "@react-pdf/renderer";
import BusinessReportPDF from "@/app/components/pdf/BusinessReportPDF";
import { getBusinessStats } from "@/app/lib/businessStats";

export async function POST(req, { params }) {
    try {
        const businessId = params.id;

        // ================= QUERY PARAMS =================
        const { searchParams } = new URL(req.url);

        const from = searchParams.get("from") || null;
        const to = searchParams.get("to") || null;
        const qrId = searchParams.get("qr_id") || null;

        // ================= BODY (CHARTS) =================
        const body = await req.json();
        const charts = body?.charts || {};

/*         console.log("📄 API Report:", {
            businessId,
            from,
            to,
            qrId,
            hasCharts: !!charts
        }); */

        // ================= DATA =================
        const stats = await getBusinessStats({
            businessId,
            from,
            to,
            qrId,
        });

        // 👇 MUY IMPORTANTE: agregar charts al data
        const pdfData = {
            ...stats,
            charts
        };

        // ================= PDF =================
        const pdfBuffer = await renderToBuffer(
            <BusinessReportPDF data={pdfData} />
        );

        return new Response(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename=report-${businessId}.pdf`
            }
        });

    } catch (e) {
        console.error("❌ PDF ERROR:", e);

        return Response.json(
            { error: "PDF generation failed" },
            { status: 500 }
        );
    }
}