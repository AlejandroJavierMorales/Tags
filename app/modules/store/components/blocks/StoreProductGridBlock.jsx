// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreProductGridBlock.jsx
//
// Descripción:
// Grilla pública de productos de Tags Store.
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
            className="py-5 bg-white"
        >
            <div className="container">

                <div className="d-flex align-items-end justify-content-between gap-3 mb-4">
                    <div>
                        <span className="badge rounded-pill text-bg-success mb-2">
                            Catálogo
                        </span>

                        <h2 className="fw-bold mb-1">
                            {title}
                        </h2>

                        <p className="text-muted mb-0">
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