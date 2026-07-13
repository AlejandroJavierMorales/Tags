// =====================================
// Archivo:
// /app/modules/store/components/public/StoreProductActions.jsx
//
// Descripción:
// Acciones rápidas del producto en la vista pública
// de detalle de Tags Store.
// Agrupa favoritos y compartir.
// =====================================

"use client";

import StoreFavoriteButton
    from "./StoreFavoriteButton";

import StoreShareButton
    from "./StoreShareButton";

export default function StoreProductActions({
    store,
    product,
    settings = {}
}) {

    const showFavorite =
        settings.content?.showFavorite !== false;

    const showShare =
        settings.content?.showShare !== false;

    if (!showFavorite && !showShare) {
        return null;
    }

    return (

        <div className="store_product_actions">

            {
                showFavorite && (

                    <StoreFavoriteButton
                        storeId={store.id}
                        productId={product.id}
                    />

                )
            }

            {
                showShare && (

                    <StoreShareButton
                        store={store}
                        product={product}
                    />

                )
            }

        </div>

    );

}