// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreCategoryMenuBlock.jsx
//
// Descripción:
// Menú público de categorías de Tags Store.
// Sin Bootstrap y compatible con themes --qr-*.
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
    content = {},
    styles = {}
}) {

    const categories =
        await getStorePublicCategories(
            entity?.id
        );

    if (!categories.length) {
        return null;
    }

    function getTextStyle(part) {
        return styles?.typography?.[part] || {};
    }

    const sectionStyle = {
        backgroundColor:
            styles.backgroundColor || undefined,

        color:
            styles.textColor || undefined,

        textAlign:
            styles.alignment || undefined,

        padding:
            styles.padding || undefined,

        marginTop:
            styles.marginTop || undefined,

        marginBottom:
            styles.marginBottom || undefined
    };

    const allCategoriesText =
        content.allCategoriesText ||
        "Todos";

    return (

        <section
            className="store_category_menu"
            style={sectionStyle}
        >

            <div className="store_category_menu_inner">

                <a
                    href="#store-products"
                    className="store_category_chip active"
                    style={getTextStyle("button")}
                >
                    {allCategoriesText}
                </a>

                {

                    categories.map(category => (

                        <a
                            key={category.id}
                            href={`#category-${category.slug}`}
                            className="store_category_chip"
                            style={getTextStyle("button")}
                        >
                            {category.name}
                        </a>

                    ))

                }

            </div>

        </section>

    );

}