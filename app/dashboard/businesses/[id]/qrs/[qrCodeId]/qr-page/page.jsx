import QRPageBuilderClient
    from "./pageClient";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

export const metadata = {
    title: "Editar QR-Page | Tags",
    robots: {
        index: false,
        follow: false
    }
};

export default async function QRPageBuilderPage({
    params
}) {

    const businessId =
        params.id;

    const qrCodeId =
        params.qrCodeId;

    const access =
        await requireQRPageAccess(
            businessId
        );

    if (!access.ok) {
        return (
            <div style={{ padding: 40 }}>
                <h2>Sin acceso</h2>
                <p>{access.error}</p>
            </div>
        );
    }

    return (
        <QRPageBuilderClient
            businessId={businessId}
            qrCodeId={qrCodeId}
            business={access.business}
            session={access.session}
        />
    );
}