// =====================================
// COMPONENT: StoreProductCard
// Descripción: Card pública de producto de Tags Tienda.
// =====================================

import {
    formatStorePrice,
    getProductFinalPrice,
    hasProductSale
} from "../lib/formatStorePrice";

export default function StoreProductCard({
    product,
    store
}) {
    const currency =
        product.currency || store.currency || "ARS";

    const finalPrice =
        getProductFinalPrice(product);

    const hasSale =
        hasProductSale(product);

    return (
        <article className="store_public_product_card">

            <div className="store_public_product_image_box">
                {product.primary_image_url ? (
                    <img
                        src={product.primary_image_url}
                        alt={product.title}
                        className="store_public_product_image"
                    />
                ) : (
                    <div className="store_public_product_placeholder">
                        📦
                    </div>
                )}

                {Number(product.is_featured) === 1 && (
                    <span className="store_public_badge">
                        Destacado
                    </span>
                )}
            </div>

            <div className="store_public_product_body">

                <small className="store_public_product_category">
                    {product.category_name || "Producto"}
                </small>

                <h3>
                    {product.title}
                </h3>

                <p>
                    {product.description || ""}
                </p>

                <div className="store_public_price_row">
                    <strong>
                        {formatStorePrice(finalPrice, currency)}
                    </strong>

                    {hasSale && (
                        <small>
                            {formatStorePrice(product.price, currency)}
                        </small>
                    )}
                </div>

                {Number(product.variants_count || 0) > 0 && (
                    <div className="store_public_variants_note">
                        Tiene variantes
                    </div>
                )}

                <a
                    href={`/p/${store.slug}/products/${product.id}`}
                    className="store_public_btn"
                >
                    Ver producto
                </a>

            </div>

        </article>
    );
}