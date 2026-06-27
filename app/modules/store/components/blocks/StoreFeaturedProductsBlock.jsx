// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreFeaturedProductsBlock.jsx
//
// Descripción:
// Productos destacados.
//
// Contexto:
// store
// =====================================

import Image
    from "next/image";

import Link
    from "next/link";

import {
    getStoreFeaturedProducts
}
    from "../../lib/getStoreFeaturedProducts";

import {
    formatStorePrice
}
    from "../../lib/formatStorePrice";

export default async function StoreFeaturedProductsBlock({
    entity,
    content = {}
}) {

    const products =
        await getStoreFeaturedProducts(
            entity?.id,
            content.limit || 8
        );

    if (!products.length) {
        return null;
    }

    return (
        <section className="py-5 bg-white">

            <div className="container">

                <div className="mb-4">

                    <span className="badge rounded-pill text-bg-success mb-2">
                        Destacados
                    </span>

                    <h2 className="fw-bold mb-0">
                        Productos destacados
                    </h2>

                </div>

                <div className="store_featured_slider">

                    {
                        products.map(
                            (product) => (

                                <div
                                    key={product.id}
                                    className="store_featured_slide"
                                >
                                    <Link
                                        href={`/p/${entity.slug}/products/${product.id}`}
                                        className="store_product_card_link"
                                    >
                                        <div
                                            className="
                                            card
                                            h-100
                                            border-0
                                            shadow-sm
                                            rounded-4
                                            overflow-hidden
                                        "
                                        >

                                            {
                                                product.image_url ? (

                                                    <div className="store_product_image_wrap">
                                                        <Image
                                                            src={product.image_url}
                                                            alt={product.title}
                                                            fill
                                                            sizes="
                                                            (max-width: 575px) 100vw,
                                                            (max-width: 767px) 50vw,
                                                            (max-width: 991px) 33vw,
                                                            25vw
                                                        "
                                                            className="store_product_image"
                                                        />
                                                    </div>

                                                ) : (

                                                    <div className="store_product_image_placeholder text-muted small">
                                                        Sin imagen
                                                    </div>

                                                )
                                            }

                                            <div className="card-body">

                                                <div className="fw-semibold mb-2">
                                                    {product.title}
                                                </div>

                                                {
                                                    product.sale_price ? (

                                                        <>
                                                            <div className="fw-bold">
                                                                {
                                                                    formatStorePrice(
                                                                        product.sale_price,
                                                                        product.currency
                                                                    )
                                                                }
                                                            </div>

                                                            <div
                                                                className="
                                                                small
                                                                text-muted
                                                                text-decoration-line-through
                                                            "
                                                            >
                                                                {
                                                                    formatStorePrice(
                                                                        product.price,
                                                                        product.currency
                                                                    )
                                                                }
                                                            </div>
                                                        </>

                                                    ) : (

                                                        <div className="fw-bold">
                                                            {
                                                                formatStorePrice(
                                                                    product.price,
                                                                    product.currency
                                                                )
                                                            }
                                                        </div>

                                                    )
                                                }

                                            </div>

                                        </div>
                                    </Link>
                                </div>

                            )
                        )
                    }

                </div>

            </div>

        </section>
    );

}