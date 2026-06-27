// =====================================
// Archivo:
// /app/modules/store/lib/storeModuleRegistry.js
//
// Descripción:
// Registro central de módulos de Tags Store.
// Define módulos disponibles, componentes,
// contenido por defecto, estilos, animaciones
// y metadatos de contexto.
//
// Utilizado por:
// - BuilderBlockRenderer
// - StoreRenderer
// - Store Builder
// - Templates
//
// Contexto:
// store
// =====================================

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

import StoreHelpBarBlock
    from "../components/blocks/StoreHelpBarBlock";

import StoreFooterBlock
    from "../components/blocks/StoreFooterBlock";

export const STORE_CONTEXT = "store";

export const storeModuleRegistry = {

    store_topbar: {
        type: "store_topbar",
        name: "Barra superior",
        context: STORE_CONTEXT,
        category: "layout",
        component: StoreTopbarBlock,
        isSystem: true,
        defaultContent: {
            text: "Envíos a todo el país",
            whatsappText: "Consultar por WhatsApp",
            showWhatsapp: true
        },
        defaultStyles: {},
        defaultAnimation: {
            type: "fadeDown",
            duration: 500
        }
    },

    store_header: {
        type: "store_header",
        name: "Encabezado tienda",
        context: STORE_CONTEXT,
        category: "layout",
        component: StoreHeaderBlock,
        isSystem: true,
        defaultContent: {
            showLogo: true,
            showName: true,
            showSearch: true,
            showCart: true
        },
        defaultStyles: {},
        defaultAnimation: {
            type: "none"
        }
    },

    store_category_menu: {
        type: "store_category_menu",
        name: "Menú de categorías",
        context: STORE_CONTEXT,
        category: "navigation",
        component: StoreCategoryMenuBlock,
        isSystem: true,
        dataSource: "categories",
        defaultContent: {
            display: "horizontal",
            showAllOption: true
        },
        defaultStyles: {},
        defaultAnimation: {
            type: "fadeUp",
            duration: 500
        }
    },

    store_hero: {
        type: "store_hero",
        name: "Hero principal",
        context: STORE_CONTEXT,
        category: "hero",
        component: StoreHeroBlock,
        isSystem: false,
        defaultContent: {
            title: "Tu tienda online",
            subtitle: "Comprá fácil, rápido y seguro.",
            primaryButtonText: "Ver productos",
            primaryButtonAction: "scroll_products",
            secondaryButtonText: "Consultar",
            secondaryButtonAction: "whatsapp",
            imageUrl: ""
        },
        defaultStyles: {},
        defaultAnimation: {
            type: "fadeUp",
            duration: 600
        }
    },

    store_trust_bar: {
        type: "store_trust_bar",
        name: "Beneficios",
        context: STORE_CONTEXT,
        category: "commerce",
        component: StoreTrustBarBlock,
        isSystem: false,
        defaultContent: {
            items: [
                {
                    title: "Compra segura",
                    text: "Tus pedidos siempre registrados"
                },
                {
                    title: "Envíos",
                    text: "Coordinamos la entrega"
                },
                {
                    title: "Atención directa",
                    text: "Consultanos por WhatsApp"
                }
            ]
        },
        defaultStyles: {},
        defaultAnimation: {
            type: "fadeUp",
            duration: 500
        }
    },

    store_featured_products: {
        type: "store_featured_products",
        name: "Productos destacados",
        context: STORE_CONTEXT,
        category: "products",
        component: StoreFeaturedProductsBlock,
        isSystem: false,
        dataSource: "featured_products",
        defaultContent: {
            title: "Productos destacados",
            limit: 8,
            showTitle: true
        },
        defaultStyles: {},
        defaultAnimation: {
            type: "fadeUp",
            duration: 500
        }
    },

    store_promo_banner: {
        type: "store_promo_banner",
        name: "Banner promocional",
        context: STORE_CONTEXT,
        category: "marketing",
        component: StorePromoBannerBlock,
        isSystem: false,
        defaultContent: {
            title: "Promociones especiales",
            subtitle: "Consultá ofertas, combos y beneficios disponibles.",
            buttonText: "Ver ofertas",
            buttonAction: "scroll_products"
        },
        defaultStyles: {},
        defaultAnimation: {
            type: "zoomIn",
            duration: 500
        }
    },

    store_product_grid: {
        type: "store_product_grid",
        name: "Grilla de productos",
        context: STORE_CONTEXT,
        category: "products",
        component: StoreProductGridBlock,
        isSystem: true,
        dataSource: "products",
        defaultContent: {
            title: "Todos los productos",
            showFilters: true,
            showSearch: true,
            columnsDesktop: 4,
            columnsTablet: 3,
            columnsMobile: 2
        },
        defaultStyles: {},
        defaultAnimation: {
            type: "fadeUp",
            duration: 500
        }
    },

    store_help_bar: {
        type: "store_help_bar",
        name: "Ayuda y contacto",
        context: STORE_CONTEXT,
        category: "support",
        component: StoreHelpBarBlock,
        isSystem: false,
        defaultContent: {
            title: "¿Necesitás ayuda?",
            text: "Escribinos y te asesoramos antes de comprar.",
            buttonText: "Hablar por WhatsApp",
            buttonAction: "whatsapp"
        },
        defaultStyles: {},
        defaultAnimation: {
            type: "fadeUp",
            duration: 500
        }
    },

    store_footer: {
        type: "store_footer",
        name: "Pie de tienda",
        context: STORE_CONTEXT,
        category: "layout",
        component: StoreFooterBlock,
        isSystem: true,
        defaultContent: {
            showContact: true,
            showSocial: true,
            showLegal: true
        },
        defaultStyles: {},
        defaultAnimation: {
            type: "none"
        }
    }

};

export function getStoreModule(type) {
    return storeModuleRegistry[type] || null;
}

export function getStoreModulesList() {
    return Object.values(
        storeModuleRegistry
    );
}

export function getStoreModulesByCategory(category) {
    return Object.values(
        storeModuleRegistry
    ).filter(
        (module) =>
            module.category === category
    );
}