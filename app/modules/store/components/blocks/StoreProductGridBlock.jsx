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
    content = {},
    styles = {}
}) {

    const title =
        content.title ||
        "Todos los productos";

    const description =
        content.description ||
        "Elegí tus productos y consultá disponibilidad.";

    const badgeText =
        content.badgeText ||
        "Catálogo";

    const showBadge =
        content.showBadge !== false;

    const showSectionTitle =
        content.showSectionTitle !== false;

    const showDescription =
        content.showDescription !== false;

    const limit =
        content.limit ||
        24;

    const products =
        await getStorePublicProducts(
            entity?.id,
            limit
        );

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

    return (
        <section
            id="store-products"
            className="store_products_section"
            style={sectionStyle}
        >
            <div className="store_products_inner">

                <div className="store_products_header">

                    <div>
                        {showBadge && (
                            <span
                                className="store_badge"
                                style={getTextStyle("meta")}
                            >
                                {badgeText}
                            </span>
                        )}

                        {showSectionTitle && (
                            <h2
                                className="store_products_title"
                                style={getTextStyle("title")}
                            >
                                {title}
                            </h2>
                        )}

                        {showDescription && (
                            <p
                                className="store_products_text"
                                style={getTextStyle("text")}
                            >
                                {description}
                            </p>
                        )}
                    </div>

                </div>

                <StoreProductGridClient
                    store={entity}
                    products={products}
                    settings={{
                        ...(content || {}),
                        ...(entity?.settings_json || {}),
                        typography: styles?.typography || {}
                    }}
                />

            </div>
        </section>
    );
}
