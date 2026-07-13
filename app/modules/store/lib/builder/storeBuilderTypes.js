// =====================================
// Archivo:
// /app/modules/store/lib/builder/storeBuilderTypes.js
//
// Descripción:
// Tipos livianos para el Builder Admin
// de Tags Store. No importa componentes
// públicos ni módulos con acceso a DB.
// =====================================

export const STORE_SECTION_TYPES = [
    { value: "topbar", label: "Barra fija" },
    { value: "header", label: "Encabezado" },
    { value: "hero", label: "Sección principal" },
    { value: "products", label: "Catálogo" },
    { value: "featured_products", label: "Colección de productos" },
    { value: "trust", label: "Confianza" },
    { value: "promo", label: "Promoción" },
    { value: "help", label: "Ayuda" },
    { value: "footer", label: "Pie de página" },
];

export const STORE_BLOCK_TYPES = [
    { value: "store_topbar", label: "Barra fija", category: "layout", isSystem: true },
    { value: "store_header", label: "Encabezado tienda", category: "layout", isSystem: true },
    /* { value: "store_category_menu", label: "Menú de categorías", category: "navigation", isSystem: true }, */
    { value: "store_hero", label: "Seccion principal", category: "hero", isSystem: false },
    { value: "store_trust_bar", label: "Beneficios", category: "commerce", isSystem: false },
    { value: "store_featured_products", label: "Colección de Productos", category: "products", isSystem: false },
    { value: "store_promo_banner", label: "Banner promocional", category: "marketing", isSystem: false },
    { value: "store_product_grid", label: "Grilla de productos", category: "products", isSystem: true },
    { value: "store_help_bar", label: "Ayuda y contacto", category: "support", isSystem: false },
    { value: "store_product_reviews_cta", label: "Calificar productos", category: "commerce", isSystem: false },
    { value: "store_footer", label: "Pie de tienda", category: "layout", isSystem: true },
    {    value: "store_reviews",    label: "Reseñas de clientes"},
];