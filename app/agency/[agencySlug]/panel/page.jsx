import { redirect } from "next/navigation";
import { getQrAgencyCustomerSession } from "@/app/modules/qr-agency/lib/getQrAgencyCustomerSession";
import QrAgencyCustomerPanel from "@/app/modules/qr-agency/components/public/QrAgencyCustomerPanel";

export const dynamic = "force-dynamic";

export default async function QrAgencyCustomerPanelPage({ params }) {
    const { agencySlug } = await params;
    const session = await getQrAgencyCustomerSession(agencySlug);
    if (!session) redirect(`/agency/${agencySlug}/login?error=session_expired`);
    return <QrAgencyCustomerPanel agencySlug={agencySlug} customerName={session.customer_name} />;
}
