// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreProductGridBlock.jsx
//
// Descripción:
// Grilla pública de productos de Tags Store.
// Sin Bootstrap y compatible con themes --qr-*.
//
// Contexto:
// store
// =====================================

import {
    getStorePublicProducts
}
from "../../lib/getStorePublicProducts";

import StoreProductGridClient
    from "../public/StoreProductGridClient";

export default async function StoreProductGridBlock({
    entity,
    content = {}
}) {

    const title =
        content.title ||
        "Todos los productos";

    const limit =
        content.limit ||
        24;

    const products =
        await getStorePublicProducts(
            entity?.id,
            limit
        );

    return (
        <section
            id="store-products"
            className="store_products_section"
        >
            <div className="store_products_inner">

                <div className="store_products_header">

                    <div>
                        <span className="store_badge">
                            Catálogo
                        </span>

                        <h2 className="store_products_title">
                            {title}
                        </h2>

                        <p className="store_products_text">
                            Elegí tus productos y consultá disponibilidad.
                        </p>
                    </div>

                </div>

                <StoreProductGridClient
                    store={entity}
                    products={products}
                    settings={{
                        ...(content || {}),
                        ...(entity?.settings_json || {})
                    }}
                />

            </div>
        </section>
    );
}