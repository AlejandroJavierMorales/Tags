// =====================================
// PAGE: app/dashboard/businesses/[id]/portal/page.js
// Descripción: Página admin del Portal Público del cliente.
// =====================================

import PortalAdminClient from "./pageClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function PortalAdminPage({ params }) {
    return (
        <PortalAdminClient
            businessId={params.id}
        />
    );
}