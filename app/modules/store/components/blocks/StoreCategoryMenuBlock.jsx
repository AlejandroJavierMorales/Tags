// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreCategoryMenuBlock.jsx
//
// Descripción:
// Menú público de categorías de Tags Store.
//
// Contexto:
// store
// =====================================

import {
    getStorePublicCategories
}
from "../../lib/getStorePublicCategories";

export default async function StoreCategoryMenuBlock({
    entity,
    content = {}
}) {
    const categories =
        await getStorePublicCategories(
            entity?.id
        );

    if (!categories.length) {
        return null;
    }

    return (
        <section className="py-3 bg-white border-bottom">
            <div className="container">
                <div className="d-flex gap-2 overflow-auto pb-1">
                    <a
                        href="#store-products"
                        className="btn btn-success btn-sm rounded-pill px-3 flex-shrink-0"
                    >
                        Todos
                    </a>

                    {
                        categories.map(
                            (category) => (
                                <a
                                    key={category.id}
                                    href={`#category-${category.slug}`}
                                    className="btn btn-outline-dark btn-sm rounded-pill px-3 flex-shrink-0"
                                >
                                    {category.name}
                                </a>
                            )
                        )
                    }
                </div>
            </div>
        </section>
    );
}