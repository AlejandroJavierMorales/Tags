// =====================================
// Archivo:
// /app/modules/store/lib/storeModuleRegistry.js
//
// Descripción:
// Registro de render de módulos de Tags Store.
// Agrega componentes React a las definiciones
// livianas de storeModuleDefinitions.
// =====================================

import {
    STORE_CONTEXT,
    storeModuleDefinitions
}
    from "@/app/modules/store/lib/storeModuleDefinitions";

import StoreTopbarBlock
    from "../components/blocks/StoreTopbarBlock";

import StoreHeaderBlock
    from "../components/blocks/StoreHeaderBlock";

import StoreCategoryMenuBlock
    from "../components/blocks/StoreCategoryMenuBlock";

import StoreHeroBlock
    from "../components/blocks/StoreHeroBlock";

import StoreTrustBarBlock
    from "../components/blocks/StoreTrustBarBlock";

import StoreFeaturedProductsBlock
    from "../components/blocks/StoreFeaturedProductsBlock";

import StorePromoBannerBlock
    from "../components/blocks/StorePromoBannerBlock";

import StoreProductGridBlock
    from "../components/blocks/StoreProductGridBlock";

import StoreProductReviewsCTABlock
    from "../components/blocks/StoreProductReviewsCTABlock";

import StoreHelpBarBlock
    from "../components/blocks/StoreHelpBarBlock";

import StoreFooterBlock
    from "../components/blocks/StoreFooterBlock";
import StoreReviewsBlock from "../components/blocks/StoreReviewsBlock";

export {
    STORE_CONTEXT
};

export const storeModuleRegistry = {

    store_topbar: {
        ...storeModuleDefinitions.store_topbar,
        component:
            StoreTopbarBlock
    },

    store_header: {
        ...storeModuleDefinitions.store_header,
        component:
            StoreHeaderBlock
    },

    store_category_menu: {
        ...storeModuleDefinitions.store_category_menu,
        component:
            StoreCategoryMenuBlock
    },

    store_hero: {
        ...storeModuleDefinitions.store_hero,
        component:
            StoreHeroBlock
    },

    store_trust_bar: {
        ...storeModuleDefinitions.store_trust_bar,
        component:
            StoreTrustBarBlock
    },

    store_featured_products: {
        ...storeModuleDefinitions.store_featured_products,
        component:
            StoreFeaturedProductsBlock
    },

    store_promo_banner: {
        ...storeModuleDefinitions.store_promo_banner,
        component:
            StorePromoBannerBlock
    },

    store_product_grid: {
        ...storeModuleDefinitions.store_product_grid,
        component:
            StoreProductGridBlock
    },

    store_product_reviews_cta: {
        ...storeModuleDefinitions.store_product_reviews_cta,
        component:
            StoreProductReviewsCTABlock
    },

    store_help_bar: {
        ...storeModuleDefinitions.store_help_bar,
        component:
            StoreHelpBarBlock
    },
    store_reviews: {
        ...storeModuleDefinitions.store_reviews,
        component:
            StoreReviewsBlock
    },
        store_footer: {
        ...storeModuleDefinitions.store_footer,
        component:
            StoreFooterBlock
    },

};

export function getStoreModule(type) {

    return (
        storeModuleRegistry[type] ||
        null
    );

}

export function getStoreModulesList() {

    return Object.values(
        storeModuleRegistry
    );

}

export function getStoreModulesByCategory(
    category
) {

    return Object.values(
        storeModuleRegistry
    ).filter(
        module =>
            module.category ===
            category
    );

}