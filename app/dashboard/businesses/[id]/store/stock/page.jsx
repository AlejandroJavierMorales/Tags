// =====================================
// PAGE: /dashboard/businesses/[id]/store/stock
// Descripción: Dashboard de stock de Tags Tienda.
// =====================================

import StoreStockDashboardClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({
    params
}) {
    const { id } =
        await params;

    return (
        <StoreStockDashboardClient
            businessId={id}
        />
    );
}