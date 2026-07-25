// =====================================
// Archivo:
// /app/modules/resto/lib/defaultRestoTemplate.js
//
// Descripción:
// Plantilla pública por defecto utilizada
// al crear una nueva aplicación Tags Resto.
//
// Contexto:
// resto
// =====================================

export const defaultRestoTemplate = [
    {
        section_type: "topbar",
        sort_order: 1,
        blocks: [
            {
                block_type: "resto_topbar",
                sort_order: 1
            }
        ]
    },

    {
        section_type: "header",
        sort_order: 2,
        blocks: [
            {
                block_type: "resto_header",
                sort_order: 1
            }
        ]
    },

    {
        section_type: "hero",
        sort_order: 3,
        blocks: [
            {
                block_type: "resto_hero",
                sort_order: 1
            }
        ]
    },

    {
        section_type: "service_info",
        sort_order: 4,
        blocks: [
            {
                block_type: "resto_service_info",
                sort_order: 1
            }
        ]
    },

    {
        section_type: "categories",
        sort_order: 5,
        blocks: [
            {
                block_type: "resto_categories",
                sort_order: 1
            }
        ]
    },

    {
        section_type: "featured_products",
        sort_order: 6,
        blocks: [
            {
                block_type: "resto_featured_products",
                sort_order: 1
            }
        ]
    },

    {
        section_type: "products",
        sort_order: 7,
        blocks: [
            {
                block_type: "resto_product_grid",
                sort_order: 1
            }
        ]
    },

    {
        section_type: "order_status",
        sort_order: 8,
        blocks: [
            {
                block_type: "resto_order_status",
                sort_order: 1
            }
        ]
    },

    {
        section_type: "service_actions",
        sort_order: 9,
        blocks: [
            {
                block_type: "resto_service_actions",
                sort_order: 1
            }
        ]
    },

    {
        section_type: "trust",
        sort_order: 10,
        blocks: [
            {
                block_type: "resto_trust_bar",
                sort_order: 1
            }
        ]
    },
    {
        section_type: "reviews_cta",
        sort_order: 11,
        blocks: [
            {
                block_type: "resto_reviews_cta",
                sort_order: 1
            }
        ]
    },
    {
        section_type: "reviews",
        sort_order: 12,
        blocks: [
            {
                block_type: "resto_reviews",
                sort_order: 1
            }
        ]
    },

    {
        section_type: "footer",
        sort_order: 13,
        blocks: [
            {
                block_type: "resto_footer",
                sort_order: 1
            }
        ]
    }
];