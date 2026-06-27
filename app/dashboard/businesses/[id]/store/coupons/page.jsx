// =====================================
// PAGE:
// /dashboard/businesses/[businessId]/store/coupons
//
// Descripción:
// Página de administración de cupones
// de Tags Tienda.
//
// Contexto:
// store
// =====================================

import StoreCouponsPageClient
    from "./pageClient";

export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";

export default async function StoreCouponsPage({
    params
}) {
    return (
        <StoreCouponsPageClient
            businessId={params.id}
        />
    );
}
