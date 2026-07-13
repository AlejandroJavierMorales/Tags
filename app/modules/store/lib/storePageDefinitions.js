// =====================================
// Archivo:
// /app/modules/store/lib/storePageDefinitions.js
//
// Descripción:
// Definiciones editables de páginas fijas
// de Tags Store. No son bloques agregables.
// Usan el mismo criterio declarativo del Builder.
//
// Contexto:
// store
// =====================================

import {
    createEditorSchema
} from "./storeModuleDefinitions";

export const STORE_PAGE_CONTEXT =
    "store_page";

const buttonWidthOptions = [
    { value: "140px", label: "Chico" },
    { value: "180px", label: "Normal" },
    { value: "220px", label: "Grande" },
    { value: "100%", label: "Completo" }
];

const buttonBorderWidthOptions = [
    { value: "0", label: "Sin borde" },
    { value: "1px", label: "Fino" },
    { value: "2px", label: "Normal" },
    { value: "3px", label: "Grueso" }
];

const buttonRadiusOptions = [
    { value: "0", label: "Recto" },
    { value: "5px", label: "5 px" },
    { value: "10px", label: "10 px" },
    { value: "20px", label: "20 px" },
    { value: "999px", label: "Píldora" }
];

const buttonPaddingYOptions = [
    { value: "6px", label: "Pequeño" },
    { value: "10px", label: "Normal" },
    { value: "14px", label: "Grande" }
];

const buttonPaddingXOptions = [
    { value: "10px", label: "Pequeño" },
    { value: "16px", label: "Normal" },
    { value: "24px", label: "Grande" }
];

const buttonHoverScaleOptions = [
    { value: "none", label: "Sin efecto" },
    { value: "soft", label: "Suave" },
    { value: "normal", label: "Normal" }
];

function createButtonFields(prefix) {

    return [
        {
            key: `${prefix}ButtonAlign`, type: "select", label: "Alineación",
            options: [
                { value: "left", label: "Izquierda" },
                { value: "center", label: "Centrado" },
                { value: "right", label: "Derecha" }
            ]
        },
        { key: `${prefix}ButtonWidth`, type: "select", label: "Ancho del botón", options: buttonWidthOptions },
        { key: `${prefix}ButtonBackgroundColor`, type: "color", label: "Color de fondo" },
        { key: `${prefix}ButtonTextColor`, type: "color", label: "Color del texto" },
        { key: `${prefix}ButtonBorderColor`, type: "color", label: "Color del borde" },
        { key: `${prefix}ButtonBorderWidth`, type: "select", label: "Borde", options: buttonBorderWidthOptions },
        { key: `${prefix}ButtonRadius`, type: "select", label: "Redondeo", options: buttonRadiusOptions },
        { key: `${prefix}ButtonPaddingY`, type: "select", label: "Altura del botón", options: buttonPaddingYOptions },
        { key: `${prefix}ButtonPaddingX`, type: "select", label: "Espacio lateral del texto", options: buttonPaddingXOptions },
        { key: `${prefix}ButtonHoverBackgroundColor`, type: "color", label: "Color de fondo al pasar" },
        { key: `${prefix}ButtonHoverTextColor`, type: "color", label: "Color del texto al pasar" },
        { key: `${prefix}ButtonHoverScale`, type: "select", label: "Efecto al pasar", options: buttonHoverScaleOptions }
    ];

}

export const storePageDefinitions = {

    product_detail: {
        type: "product_detail",
        name: "Detalle de producto",
        context: STORE_PAGE_CONTEXT,
        category: "store_pages",
        isSystem: true,

        defaultContent: {
            enabled: true,
            showBreadcrumb: true,
            showFavorite: true,
            showShare: true,
            showFeaturedBadge: true,
            showCategoryBadge: true,
            showTitle: true,
            showPrice: true,
            showOldPrice: true,
            showVariants: true,
            showStock: true,
            showQuantity: true,
            showBuyNowButton: true,
            showAddToCartButton: true,
            showWhatsappButton: true,
            showShareButton: true,
            showTrustInfo: true,
            showDescription: true,

            buyButtonWidth: "",
            buyButtonBackgroundColor: "",
            buyButtonTextColor: "",
            buyButtonBorderColor: "",
            buyButtonBorderWidth: "",
            buyButtonRadius: "",
            buyButtonPaddingY: "",
            buyButtonPaddingX: "",
            buyButtonHoverBackgroundColor: "",
            buyButtonHoverTextColor: "",
            buyButtonHoverScale: "",
            buyButtonAlign: "",
            cartButtonAlign: "",
            whatsappButtonAlign: "",
            shareButtonAlign: "",

            cartButtonWidth: "",
            cartButtonBackgroundColor: "",
            cartButtonTextColor: "",
            cartButtonBorderColor: "",
            cartButtonBorderWidth: "",
            cartButtonRadius: "",
            cartButtonPaddingY: "",
            cartButtonPaddingX: "",
            cartButtonHoverBackgroundColor: "",
            cartButtonHoverTextColor: "",
            cartButtonHoverScale: "",

            whatsappButtonWidth: "",
            whatsappButtonBackgroundColor: "",
            whatsappButtonTextColor: "",
            whatsappButtonBorderColor: "",
            whatsappButtonBorderWidth: "",
            whatsappButtonRadius: "",
            whatsappButtonPaddingY: "",
            whatsappButtonPaddingX: "",
            whatsappButtonHoverBackgroundColor: "",
            whatsappButtonHoverTextColor: "",
            whatsappButtonHoverScale: "",

            shareButtonWidth: "",
            shareButtonBackgroundColor: "",
            shareButtonTextColor: "",
            shareButtonBorderColor: "",
            shareButtonBorderWidth: "",
            shareButtonRadius: "",
            shareButtonPaddingY: "",
            shareButtonPaddingX: "",
            shareButtonHoverBackgroundColor: "",
            shareButtonHoverTextColor: "",
            shareButtonHoverScale: ""
        },

        defaultStyles: {},

        defaultAnimation: {},

        editor: createEditorSchema({
            description: "Configurá la página fija donde el cliente ve el detalle de cada producto.",

            contentGroups: [
                {
                    title: "Contenido visible",
                    description: "Elegí qué partes se muestran en el detalle del producto.",
                    icon: "fields",
                    fields: [
                        { key: "showBreadcrumb", type: "checkbox", label: "Volver a la tienda", checkboxLabel: "Mostrar volver a la tienda", defaultValue: true },
                        { key: "showFavorite", type: "checkbox", label: "Favoritos", checkboxLabel: "Mostrar favoritos", defaultValue: true },
                        { key: "showShare", type: "checkbox", label: "Compartir", checkboxLabel: "Mostrar botón Compartir", defaultValue: true },
                        { key: "showFeaturedBadge", type: "checkbox", label: "Destacado", checkboxLabel: "Mostrar destacado", defaultValue: true },
                        { key: "showCategoryBadge", type: "checkbox", label: "Categoría", checkboxLabel: "Mostrar categoría", defaultValue: true },
                        { key: "showTitle", type: "checkbox", label: "Título", checkboxLabel: "Mostrar título", defaultValue: true },
                        { key: "showPrice", type: "checkbox", label: "Precio", checkboxLabel: "Mostrar precio", defaultValue: true },
                        { key: "showOldPrice", type: "checkbox", label: "Precio anterior", checkboxLabel: "Mostrar precio anterior", defaultValue: true },
                        { key: "showVariants", type: "checkbox", label: "Variantes", checkboxLabel: "Mostrar variantes", defaultValue: true },
                        { key: "showStock", type: "checkbox", label: "Stock", checkboxLabel: "Mostrar stock", defaultValue: true },
                        { key: "showQuantity", type: "checkbox", label: "Cantidad", checkboxLabel: "Mostrar cantidad", defaultValue: true },
                        { key: "showDescription", type: "checkbox", label: "Descripción", checkboxLabel: "Mostrar descripción", defaultValue: true }
                    ]
                },
                {
                    title: "Botones visibles",
                    description: "Elegí qué acciones comerciales se muestran.",
                    icon: "button",
                    fields: [
                        { key: "showBuyNowButton", type: "checkbox", label: "Comprar ahora", checkboxLabel: "Mostrar Comprar ahora", defaultValue: true },
                        { key: "showAddToCartButton", type: "checkbox", label: "Agregar al carrito", checkboxLabel: "Mostrar Agregar al carrito", defaultValue: true },
                        { key: "showWhatsappButton", type: "checkbox", label: "WhatsApp", checkboxLabel: "Mostrar WhatsApp", defaultValue: true },
                        { key: "showShareButton", type: "checkbox", label: "Compartir", checkboxLabel: "Mostrar Compartir", defaultValue: true },
                        { key: "showTrustInfo", type: "checkbox", label: "Confianza", checkboxLabel: "Mostrar información de confianza", defaultValue: true }
                    ]
                }
            ],

            extraTabs: [
                {
                    id: "buttons",
                    label: "Botones",
                    icon: "button",
                    description: "Configurá la apariencia de los botones del detalle de producto.",
                    groups: [
                        {
                            title: "Comprar ahora",
                            icon: "button",
                            fields: createButtonFields("buy")
                        },
                        {
                            title: "Agregar al carrito",
                            icon: "button",
                            fields: createButtonFields("cart")
                        },
                        {
                            title: "WhatsApp",
                            icon: "button",
                            fields: createButtonFields("whatsapp")
                        },
                        {
                            title: "Compartir",
                            icon: "button",
                            fields: createButtonFields("share")
                        }
                    ]
                }
            ],

            typography: ["category", "badge", "title", "price", "oldPrice", "stock", "text", "button"],
            animation: false
        })
    },

    cart: {
        type: "cart",
        name: "Carrito de compras",
        context: STORE_PAGE_CONTEXT,
        category: "store_pages",
        isSystem: true,

        defaultContent: {
            enabled: true,
            showTitle: true,
            showQuantity: true,
            showUnitPrice: true,
            showItemSubtotal: true,
            showRemoveButton: true,
            showCoupon: true,
            showSummary: true,
            showSubtotal: true,
            showShipping: true,
            showDiscount: true,
            showTotal: true,

            showContinueShoppingButton: true,
            showClearCartButton: true,
            showCheckoutButton: true,
            showWhatsappButton: true,

            continueShoppingButtonAlign: "",
            continueShoppingButtonWidth: "",
            continueShoppingButtonBackgroundColor: "",
            continueShoppingButtonTextColor: "",
            continueShoppingButtonBorderColor: "",
            continueShoppingButtonBorderWidth: "",
            continueShoppingButtonRadius: "",
            continueShoppingButtonPaddingY: "",
            continueShoppingButtonPaddingX: "",
            continueShoppingButtonHoverBackgroundColor: "",
            continueShoppingButtonHoverTextColor: "",
            continueShoppingButtonHoverScale: "",

            clearCartButtonAlign: "",
            clearCartButtonWidth: "",
            clearCartButtonBackgroundColor: "",
            clearCartButtonTextColor: "",
            clearCartButtonBorderColor: "",
            clearCartButtonBorderWidth: "",
            clearCartButtonRadius: "",
            clearCartButtonPaddingY: "",
            clearCartButtonPaddingX: "",
            clearCartButtonHoverBackgroundColor: "",
            clearCartButtonHoverTextColor: "",
            clearCartButtonHoverScale: "",

            checkoutButtonAlign: "",
            checkoutButtonWidth: "",
            checkoutButtonBackgroundColor: "",
            checkoutButtonTextColor: "",
            checkoutButtonBorderColor: "",
            checkoutButtonBorderWidth: "",
            checkoutButtonRadius: "",
            checkoutButtonPaddingY: "",
            checkoutButtonPaddingX: "",
            checkoutButtonHoverBackgroundColor: "",
            checkoutButtonHoverTextColor: "",
            checkoutButtonHoverScale: "",

            whatsappButtonAlign: "",
            whatsappButtonWidth: "",
            whatsappButtonBackgroundColor: "",
            whatsappButtonTextColor: "",
            whatsappButtonBorderColor: "",
            whatsappButtonBorderWidth: "",
            whatsappButtonRadius: "",
            whatsappButtonPaddingY: "",
            whatsappButtonPaddingX: "",
            whatsappButtonHoverBackgroundColor: "",
            whatsappButtonHoverTextColor: "",
            whatsappButtonHoverScale: ""
        },

        defaultStyles: {},

        defaultAnimation: {},

        editor: createEditorSchema({
            description: "Configurá la página fija del carrito de compras.",

            contentGroups: [
                {
                    title: "Contenido visible",
                    description: "Elegí qué partes se muestran en el carrito.",
                    icon: "fields",
                    fields: [
                        { key: "showTitle", type: "checkbox", label: "Título", checkboxLabel: "Mostrar título", defaultValue: true },
                        { key: "showQuantity", type: "checkbox", label: "Cantidad", checkboxLabel: "Mostrar cantidad", defaultValue: true },
                        { key: "showUnitPrice", type: "checkbox", label: "Precio unitario", checkboxLabel: "Mostrar precio unitario", defaultValue: true },
                        { key: "showItemSubtotal", type: "checkbox", label: "Subtotal por producto", checkboxLabel: "Mostrar subtotal por producto", defaultValue: true },
                        { key: "showRemoveButton", type: "checkbox", label: "Eliminar producto", checkboxLabel: "Mostrar eliminar producto", defaultValue: true },
                        { key: "showCoupon", type: "checkbox", label: "Cupón", checkboxLabel: "Mostrar cupón", defaultValue: true },
                        { key: "showSummary", type: "checkbox", label: "Resumen", checkboxLabel: "Mostrar resumen", defaultValue: true },
                        { key: "showSubtotal", type: "checkbox", label: "Subtotal", checkboxLabel: "Mostrar subtotal", defaultValue: true },
                        { key: "showShipping", type: "checkbox", label: "Envío", checkboxLabel: "Mostrar envío", defaultValue: true },
                        { key: "showDiscount", type: "checkbox", label: "Descuento", checkboxLabel: "Mostrar descuento", defaultValue: true },
                        { key: "showTotal", type: "checkbox", label: "Total", checkboxLabel: "Mostrar total", defaultValue: true }
                    ]
                },
                {
                    title: "Acciones",
                    description: "Elegí qué botones se muestran en el carrito.",
                    icon: "button",
                    fields: [
                        { key: "showContinueShoppingButton", type: "checkbox", label: "Seguir comprando", checkboxLabel: "Mostrar seguir comprando", defaultValue: true },
                        { key: "showClearCartButton", type: "checkbox", label: "Vaciar carrito", checkboxLabel: "Mostrar vaciar carrito", defaultValue: true },
                        { key: "showCheckoutButton", type: "checkbox", label: "Continuar compra", checkboxLabel: "Mostrar continuar compra", defaultValue: true },
                        { key: "showWhatsappButton", type: "checkbox", label: "WhatsApp", checkboxLabel: "Mostrar WhatsApp", defaultValue: true }
                    ]
                }
            ],

            extraTabs: [
                {
                    id: "buttons",
                    label: "Botones",
                    icon: "button",
                    description: "Configurá la apariencia de los botones del carrito.",
                    groups: [
                        {
                            title: "Seguir comprando",
                            icon: "button",
                            fields: createButtonFields("continueShopping")
                        },
                        {
                            title: "Vaciar carrito",
                            icon: "button",
                            fields: createButtonFields("clearCart")
                        },
                        {
                            title: "Continuar compra",
                            icon: "button",
                            fields: createButtonFields("checkout")
                        },
                        {
                            title: "WhatsApp",
                            icon: "button",
                            fields: createButtonFields("whatsapp")
                        }
                    ]
                }
            ],

            typography: ["title", "price", "text", "button"],
            animation: false
        })
    },

    checkout: {
        type: "checkout",
        name: "Checkout / Pago y envío",
        context: STORE_PAGE_CONTEXT,
        category: "store_pages",
        isSystem: true,

        defaultContent: {
            enabled: true,
            showTitle: true,
            showDescription: true,
            showProducts: true,
            showDelivery: true,
            showZipQuote: true,
            showCustomerData: true,
            showCoupon: true,
            showSummary: true,
            showSubtotal: true,
            showDiscount: true,
            showShipping: true,
            showTotal: true,
            showPaymentMethod: true,
            showConfirmButton: true,
            showClearCartButton: true,

            quoteButtonAlign: "",
            quoteButtonWidth: "",
            quoteButtonBackgroundColor: "",
            quoteButtonTextColor: "",
            quoteButtonBorderColor: "",
            quoteButtonBorderWidth: "",
            quoteButtonRadius: "",
            quoteButtonPaddingY: "",
            quoteButtonPaddingX: "",
            quoteButtonHoverBackgroundColor: "",
            quoteButtonHoverTextColor: "",
            quoteButtonHoverScale: "",

            couponButtonAlign: "",
            couponButtonWidth: "",
            couponButtonBackgroundColor: "",
            couponButtonTextColor: "",
            couponButtonBorderColor: "",
            couponButtonBorderWidth: "",
            couponButtonRadius: "",
            couponButtonPaddingY: "",
            couponButtonPaddingX: "",
            couponButtonHoverBackgroundColor: "",
            couponButtonHoverTextColor: "",
            couponButtonHoverScale: "",

            confirmButtonAlign: "",
            confirmButtonWidth: "",
            confirmButtonBackgroundColor: "",
            confirmButtonTextColor: "",
            confirmButtonBorderColor: "",
            confirmButtonBorderWidth: "",
            confirmButtonRadius: "",
            confirmButtonPaddingY: "",
            confirmButtonPaddingX: "",
            confirmButtonHoverBackgroundColor: "",
            confirmButtonHoverTextColor: "",
            confirmButtonHoverScale: "",

            clearCartButtonAlign: "",
            clearCartButtonWidth: "",
            clearCartButtonBackgroundColor: "",
            clearCartButtonTextColor: "",
            clearCartButtonBorderColor: "",
            clearCartButtonBorderWidth: "",
            clearCartButtonRadius: "",
            clearCartButtonPaddingY: "",
            clearCartButtonPaddingX: "",
            clearCartButtonHoverBackgroundColor: "",
            clearCartButtonHoverTextColor: "",
            clearCartButtonHoverScale: ""
        },

        defaultStyles: {},

        defaultAnimation: {},

        editor: createEditorSchema({
            description: "Configurá la página fija de checkout, pago y envío.",

            contentGroups: [
                {
                    title: "Contenido visible",
                    description: "Elegí qué partes se muestran en el checkout.",
                    icon: "fields",
                    fields: [
                        { key: "showTitle", type: "checkbox", label: "Título", checkboxLabel: "Mostrar título", defaultValue: true },
                        { key: "showDescription", type: "checkbox", label: "Descripción", checkboxLabel: "Mostrar descripción", defaultValue: true },
                        { key: "showProducts", type: "checkbox", label: "Productos", checkboxLabel: "Mostrar productos", defaultValue: true },
                        { key: "showDelivery", type: "checkbox", label: "Entrega", checkboxLabel: "Mostrar entrega", defaultValue: true },
                        { key: "showZipQuote", type: "checkbox", label: "Cotización", checkboxLabel: "Mostrar cotización por código postal", defaultValue: true },
                        { key: "showCustomerData", type: "checkbox", label: "Datos del comprador", checkboxLabel: "Mostrar datos del comprador", defaultValue: true },
                        { key: "showCoupon", type: "checkbox", label: "Cupón", checkboxLabel: "Mostrar cupón", defaultValue: true },
                        { key: "showSummary", type: "checkbox", label: "Resumen", checkboxLabel: "Mostrar resumen", defaultValue: true },
                        { key: "showSubtotal", type: "checkbox", label: "Subtotal", checkboxLabel: "Mostrar subtotal", defaultValue: true },
                        { key: "showDiscount", type: "checkbox", label: "Descuento", checkboxLabel: "Mostrar descuento", defaultValue: true },
                        { key: "showShipping", type: "checkbox", label: "Envío", checkboxLabel: "Mostrar envío", defaultValue: true },
                        { key: "showTotal", type: "checkbox", label: "Total", checkboxLabel: "Mostrar total", defaultValue: true },
                        { key: "showPaymentMethod", type: "checkbox", label: "Medio de pago", checkboxLabel: "Mostrar medio de pago", defaultValue: true }
                    ]
                },
                {
                    title: "Acciones",
                    description: "Elegí qué botones se muestran.",
                    icon: "button",
                    fields: [
                        { key: "showConfirmButton", type: "checkbox", label: "Confirmar compra", checkboxLabel: "Mostrar confirmar compra", defaultValue: true },
                        { key: "showClearCartButton", type: "checkbox", label: "Vaciar carrito", checkboxLabel: "Mostrar vaciar carrito", defaultValue: true }
                    ]
                }
            ],

            extraTabs: [
                {
                    id: "buttons",
                    label: "Botones",
                    icon: "button",
                    description: "Configurá la apariencia de los botones del checkout.",
                    groups: [
                        {
                            title: "Cotizar envío",
                            icon: "button",
                            fields: createButtonFields("quote")
                        },
                        {
                            title: "Aplicar cupón",
                            icon: "button",
                            fields: createButtonFields("coupon")
                        },
                        {
                            title: "Confirmar compra",
                            icon: "button",
                            fields: createButtonFields("confirm")
                        },
                        {
                            title: "Vaciar carrito",
                            icon: "button",
                            fields: createButtonFields("clearCart")
                        }
                    ]
                }
            ],

            typography: ["title", "text", "meta", "price", "total", "button"],
            animation: false
        })
    }

};

export function getStorePageDefinition(type) {

    return storePageDefinitions[type] || null;

}

export function getStorePageDefinitions() {

    return Object.values(storePageDefinitions);

}