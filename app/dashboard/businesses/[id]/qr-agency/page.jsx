import QrAgencyAdminPage from "@/app/modules/qr-agency/components/admin/QrAgencyAdminPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function QrAgencyDashboardPage({ params }) {
    const { id } = await params;
    return <QrAgencyAdminPage businessId={id} />;
}
