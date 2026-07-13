// =====================================
// PAGE:
// /dashboard/businesses/[id]/store/product-reviews
//
// Descripción:
// Página administrativa de reseñas de
// productos de Tags Tienda.
//
// Contexto:
// store / commerce-reviews
// =====================================

import StoreProductReviewsClient
    from "./pageClient";

export default async function StoreProductReviewsPage({
    params
}) {

    const resolvedParams =
        await params;

    const businessId =
        resolvedParams.id;

    return (
        <StoreProductReviewsClient
            businessId={businessId}
        />
    );

}