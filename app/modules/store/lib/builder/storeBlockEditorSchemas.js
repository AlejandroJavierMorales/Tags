// =====================================
// Archivo:
// /app/modules/store/lib/builder/storeBlockEditorSchemas.js
//
// Descripción:
// Schemas livianos para editar bloques
// del Builder de Tags Store.
// =====================================

export const STORE_BLOCK_EDITOR_SCHEMAS = {
    store_hero: {
        content: [
            { key: "title", label: "Título", type: "text" },
            { key: "subtitle", label: "Subtítulo", type: "textarea" },
            { key: "primaryButtonText", label: "Botón principal", type: "text" },
            { key: "secondaryButtonText", label: "Botón secundario", type: "text" },
            { key: "imageUrl", label: "Imagen", type: "text" }
        ]
    },

    store_help_bar: {
        content: [
            { key: "title", label: "Título", type: "text" },
            { key: "text", label: "Texto", type: "textarea" },
            { key: "buttonText", label: "Texto del botón", type: "text" }
        ]
    },

    store_promo_banner: {
        content: [
            { key: "title", label: "Título", type: "text" },
            { key: "subtitle", label: "Subtítulo", type: "textarea" },
            { key: "buttonText", label: "Texto del botón", type: "text" }
        ]
    },

    store_featured_products: {
        content: [
            { key: "title", label: "Título", type: "text" },
            { key: "limit", label: "Cantidad", type: "number" },
            { key: "showTitle", label: "Mostrar título", type: "checkbox" }
        ]
    },

    store_product_grid: {
        content: [
            { key: "title", label: "Título", type: "text" },
            { key: "showFilters", label: "Mostrar filtros", type: "checkbox" },
            { key: "showSearch", label: "Mostrar buscador", type: "checkbox" },
            { key: "columnsDesktop", label: "Columnas escritorio", type: "number" },
            { key: "columnsTablet", label: "Columnas tablet", type: "number" },
            { key: "columnsMobile", label: "Columnas mobile", type: "number" }
        ]
    }
};

export function getStoreBlockEditorSchema(type) {
    return STORE_BLOCK_EDITOR_SCHEMAS[type] || {
        content: []
    };
}