// =====================================
// Archivo:
// /app/modules/store/lib/defaultStoreTemplate.js
//
// Descripción:
// Plantilla comercial por defecto
// utilizada al crear una nueva tienda.
//
// Contexto:
// store
// =====================================

export const defaultStoreTemplate = [
    {
        section_type: "topbar",
        sort_order: 1,
        blocks: [
            {
                block_type: "store_topbar"
            }
        ]
    },

    {
        section_type: "header",
        sort_order: 2,
        blocks: [
            {
                block_type: "store_header"
            }
        ]
    },

    {
        section_type: "hero",
        sort_order: 3,
        blocks: [
            {
                block_type: "store_hero"
            }
        ]
    },

    {
        section_type: "products",
        sort_order: 4,
        blocks: [
            {
                block_type: "store_product_grid"
            }
        ]
    },

    {
        section_type: "reviews",
        sort_order: 5,
        blocks: [
            {
                block_type: "store_reviews"
            }
        ]
    },

    {
        section_type: "featured_products",
        sort_order: 6,
        blocks: [
            {
                block_type: "store_featured_products"
            }
        ]
    },

    {
        section_type: "promo",
        sort_order: 7,
        blocks: [
            {
                block_type: "store_promo_banner"
            }
        ]
    },

    {
        section_type: "trust",
        sort_order: 8,
        blocks: [
            {
                block_type: "store_trust_bar"
            }
        ]
    },

    {
        section_type: "product_reviews_cta",
        sort_order: 9,
        blocks: [
            {
                block_type: "store_product_reviews_cta"
            }
        ]
    },

    {
        section_type: "help",
        sort_order: 10,
        blocks: [
            {
                block_type: "store_help_bar"
            }
        ]
    },

    {
        section_type: "footer",
        sort_order: 11,
        blocks: [
            {
                block_type: "store_footer"
            }
        ]
    }
];