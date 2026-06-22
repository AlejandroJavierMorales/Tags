// =====================================
// PAGE: /dashboard/businesses/[id]/store/inventory
// Descripción: Gestión masiva de inventario de Tags Tienda.
// =====================================

import StoreInventoryClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({ params }) {
    const { id } =
        await params;

    return (
        <StoreInventoryClient
            businessId={id}
        />
    );
}