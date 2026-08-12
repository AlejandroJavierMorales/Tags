"use client";

import RestoMenuBlock from "./RestoMenuBlock";

export default function RestoFeaturedProductsBlock({ entity, content = {}, styles = {} }) {
    const limit = Math.max(1, Number(content.limit || 8));
    const allProducts = Array.isArray(entity?.products) ? entity.products : [];
    const mode = content.mode || "featured";
    const products = allProducts.filter(product => {
        if (mode === "offer") {
            return Number(product.is_offer) === 1;
        }
        if (mode === "recommended") {
            return Number(product.is_recommended) === 1;
        }
        if (mode === "new") {
            return Number(product.is_new) === 1;
        }
        if (mode.startsWith("category:")) {
            return Number(product.category_id) === Number(mode.slice("category:".length));
        }
        return Number(product.is_featured) === 1;
    }).slice(0, limit);
    return <RestoMenuBlock entity={{ ...entity, products }} content={{ ...content, showSearch: false, showCategories: false }} styles={styles} />;
}
