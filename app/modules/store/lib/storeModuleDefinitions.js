// =====================================
// Archivo:
// /app/modules/store/lib/storeModuleDefinitions.js
//
// Descripción:
// Definiciones declarativas de módulos
// de Tags Store. Contiene metadata,
// defaults y schema completo del editor.
// No importa componentes React.
// =====================================

export const STORE_CONTEXT = "store";

const visibilityGroup = {
    title: "Estado del bloque",
    description: "Definí cómo se identifica internamente y si se muestra en la tienda.",
    icon: "settings",
    fields: [
        {
            key: "title",
            target: "block",
            type: "text",
            label: "Nombre interno",
            help: "Este nombre es solo para ordenar y reconocer el bloque dentro del Builder."
        },
        {
            key: "is_visible",
            target: "block",
            type: "checkbox",
            label: "Mostrar en la tienda",
            checkboxLabel: "Sí, mostrar este bloque"
        }
    ]
};

const spacingOptions = [
    { value: "0", label: "Sin separación" },
    { value: "12px", label: "Poca" },
    { value: "24px", label: "Media" },
    { value: "40px", label: "Mucha" }
];

const paddingOptions = [
    { value: "0", label: "Sin espacio interno" },
    { value: "12px", label: "Poco" },
    { value: "24px", label: "Medio" },
    { value: "40px", label: "Mucho" }
];

const alignmentOptions = [
    { value: "left", label: "A la izquierda" },
    { value: "center", label: "Centrado" },
    { value: "right", label: "A la derecha" }
];

const animationOptions = [
    { value: "none", label: "Sin efecto" },
    { value: "fadeUp", label: "Aparece desde abajo" },
    { value: "fadeDown", label: "Aparece desde arriba" },
    { value: "zoomIn", label: "Aparece con zoom" },
    { value: "slideLeft", label: "Desde la izquierda" },
    { value: "slideRight", label: "Desde la derecha" }
];

const durationOptions = [
    { value: 300, label: "Rápida" },
    { value: 500, label: "Normal" },
    { value: 800, label: "Lenta" }
];

const typographyParts = {
    title: {
        key: "title",
        label: "Título principal",
        description: "Controla los títulos principales del bloque."
    },
    subtitle: {
        key: "subtitle",
        label: "Texto de presentación",
        description: "Controla bajadas, subtítulos y textos destacados."
    },
    text: {
        key: "text",
        label: "Texto",
        description: "Controla textos generales y descripciones."
    },
    button: {
        key: "button",
        label: "Botones",
        description: "Controla la tipografía de llamadas a la acción."
    },
    price: {
        key: "price",
        label: "Precio",
        description: "Controla el precio principal de productos."
    },
    oldPrice: {
        key: "oldPrice",
        label: "Precio anterior",
        description: "Controla precios tachados o valores anteriores."
    },
    meta: {
        key: "meta",
        label: "Etiqueta / detalle",
        description: "Controla textos secundarios, etiquetas y datos complementarios."
    }
};

function createContentTab(groups = []) {
    return {
        id: "content",
        label: "Contenido",
        icon: "content",
        description: "Editá los textos, opciones y datos visibles de este bloque.",
        groups: [
            visibilityGroup,
            ...groups
        ]
    };
}

function createDesignTab() {
    return {
        id: "design",
        label: "Diseño",
        icon: "palette",
        description: "Ajustá presentación, colores y espaciado sin salir del sistema visual de la tienda.",
        groups: [
            {
                title: "Composición",
                description: "Definí cómo se acomoda visualmente el contenido.",
                icon: "layout",
                fields: [
                    {
                        key: "alignment",
                        target: "styles",
                        type: "select",
                        label: "Alineación del contenido",
                        emptyLabel: "Como viene por defecto",
                        options: alignmentOptions
                    }
                ]
            },
            {
                title: "Colores",
                description: "Usá colores solo cuando necesites destacar este bloque sobre el tema actual.",
                icon: "palette",
                fields: [
                    {
                        key: "backgroundColor",
                        target: "styles",
                        type: "color",
                        label: "Color de fondo",
                        defaultValue: "#ffffff"
                    },
                    {
                        key: "textColor",
                        target: "styles",
                        type: "color",
                        label: "Color general del texto",
                        defaultValue: "#111827"
                    }
                ]
            },
            {
                title: "Espaciado",
                description: "Controlá aire superior, inferior e interno del bloque.",
                icon: "layout",
                fields: [
                    {
                        key: "marginTop",
                        target: "styles",
                        type: "select",
                        label: "Separación superior",
                        emptyLabel: "Normal",
                        options: spacingOptions
                    },
                    {
                        key: "marginBottom",
                        target: "styles",
                        type: "select",
                        label: "Separación inferior",
                        emptyLabel: "Normal",
                        options: spacingOptions
                    },
                    {
                        key: "padding",
                        target: "styles",
                        type: "select",
                        label: "Espacio interno",
                        emptyLabel: "Normal",
                        options: paddingOptions
                    }
                ]
            }
        ]
    };
}

function createTypographyTab(parts = []) {
    return {
        id: "typography",
        label: "Tipografía",
        icon: "font",
        description: "Personalizá textos puntuales del bloque sin modificar el tema general de la tienda.",
        groups: [
            {
                title: "Textos del bloque",
                description: "Estos ajustes pisan únicamente este módulo.",
                icon: "font",
                fields: [
                    {
                        key: "typography",
                        target: "styles",
                        type: "typography",
                        label: "Tipografía",
                        parts: parts.map(part => typographyParts[part]).filter(Boolean)
                    }
                ]
            }
        ]
    };
}

function createAnimationTab(enabled = true) {
    if (!enabled) {
        return null;
    }

    return {
        id: "animation",
        label: "Animaciones",
        icon: "animation",
        description: "Definí cómo aparece este bloque cuando el cliente navega la tienda.",
        groups: [
            {
                title: "Efecto de entrada",
                description: "Usá animaciones simples para acompañar la navegación sin distraer.",
                icon: "animation",
                fields: [
                    {
                        key: "type",
                        target: "animation",
                        type: "select",
                        label: "Efecto al aparecer",
                        options: animationOptions
                    },
                    {
                        key: "duration",
                        target: "animation",
                        type: "select",
                        label: "Velocidad",
                        options: durationOptions
                    }
                ]
            }
        ]
    };
}

export function createEditorSchema({
    description = "",
    contentGroups = [],
    imageTab = null,
    extraTabs = [],
    typography = [],
    animation = true
}) {
    return {
        description,
        tabs: [
            createContentTab(contentGroups),
            imageTab,
            ...extraTabs,
            createDesignTab(),
            typography.length ? createTypographyTab(typography) : null,
            createAnimationTab(animation)
        ].filter(Boolean)
    };
}


const featuredProductsEditor =
    createEditorSchema({
        description: "Mostrá productos destacados, ofertas, novedades o una categoría especial.",

        contentGroups: [
            {
                title: "Colección",
                description: "Elegí qué productos aparecen en esta sección.",
                icon: "store",
                fields: [
                    {
                        key: "mode",
                        type: "select",
                        label: "Tipo de colección",
                        options: [
                            { value: "featured", label: "Destacados" },
                            { value: "sale", label: "Ofertas" },
                            { value: "recent", label: "Novedades" },
                            { value: "category", label: "Por categoría" }
                        ]
                    },
                    { key: "limit", type: "number", label: "Cantidad de productos", min: 1, max: 24 }
                ]
            },
            {
                title: "Textos",
                description: "Configurá los textos visibles de la sección.",
                icon: "fields",
                fields: [
                    { key: "badgeText", type: "text", label: "Etiqueta superior" },
                    { key: "title", type: "text", label: "Título de la sección" },
                    { key: "description", type: "textarea", label: "Descripción" }
                ]
            },
            {
                title: "Elementos visibles",
                description: "Elegí qué partes se muestran.",
                icon: "fields",
                fields: [
                    { key: "showBadge", type: "checkbox", label: "Etiqueta", checkboxLabel: "Mostrar etiqueta", defaultValue: true },
                    { key: "showTitle", type: "checkbox", label: "Título", checkboxLabel: "Mostrar título", defaultValue: true },
                    { key: "showDescription", type: "checkbox", label: "Descripción", checkboxLabel: "Mostrar descripción", defaultValue: false },
                    { key: "showPrice", type: "checkbox", label: "Precio", checkboxLabel: "Mostrar precio", defaultValue: true },
                    { key: "showOldPrice", type: "checkbox", label: "Precio anterior", checkboxLabel: "Mostrar precio anterior", defaultValue: true },
                    { key: "showButton", type: "checkbox", label: "Botón", checkboxLabel: "Mostrar botón", defaultValue: true }
                ]
            }
        ],

        typography: ["title", "text", "price", "oldPrice", "meta", "button"]
    });


/* Compatibilizar ProductsGrid con FeaturedProducts */
/* *********************************************** */
const PRODUCT_CARD_DEFAULT_CONTENT = {
    cardStyle: "elevated",
    cardBorder: true,
    cardRadius: "20px",
    cardShadow: "soft",
    cardBackgroundColor: "",
    infoBackgroundColor: "",
    showInfoArea: true,

    imageRatio: "square",
    imageFit: "cover",
    imagePadding: "0",
    imageRadius: "0",
    imageHover: "zoom",

    showCategory: false,
    showSku: false,
    showTitle: true,
    showPrice: true,
    showOldPrice: true,
    showDiscount: true,
    showOfferBadge: true,
    showFavorite: true,
    showShare: true,
    showButton: true,

    infoAlignment: "left",
    infoPadding: "16px",

    priceColor: "",
    oldPriceColor: "",
    discountColor: "",
    offerBadgeColor: "",
    offerBadgeBackground: "",

    priceSize: "",
    oldPriceSize: "",
    discountSize: "",
    priceAlignment: "left",

    buttonText: "Ver producto",
    buttonIcon: false,
    buttonIconType: "arrow",
    buttonIconPosition: "right",
    buttonBackgroundColor: "",
    buttonTextColor: "",
    buttonBorderColor: "",
    buttonBorderWidth: "",
    buttonRadius: "",
    buttonPaddingY: "",
    buttonPaddingX: "",
    buttonSize: "normal",
    buttonFullWidth: false
};

function createProductCardExtraTabs() {

    return [
        {
            id: "cards",
            label: "Tarjetas",
            icon: "store",
            description: "Definí la personalidad visual de las tarjetas de producto.",
            groups: [
                {
                    title: "Estilo de tarjeta",
                    icon: "palette",
                    fields: [
                        {
                            key: "cardStyle",
                            type: "select",
                            label: "Estilo",
                            options: [
                                { value: "elevated", label: "Elevada" },
                                { value: "flat", label: "Plana" },
                                { value: "minimal", label: "Minimalista" }
                            ]
                        },
                        {
                            key: "cardBorder",
                            type: "checkbox",
                            label: "Borde",
                            checkboxLabel: "Mostrar borde",
                            defaultValue: true
                        },
                        {
                            key: "cardRadius",
                            type: "select",
                            label: "Redondeo",
                            options: [
                                { value: "0", label: "Recta" },
                                { value: "5px", label: "5 px" },
                                { value: "10px", label: "10 px" },
                                { value: "20px", label: "20 px" }
                            ]
                        },
                        {
                            key: "cardShadow",
                            type: "select",
                            label: "Sombra",
                            options: [
                                { value: "none", label: "Sin sombra" },
                                { value: "soft", label: "Suave" },
                                { value: "medium", label: "Media" },
                                { value: "strong", label: "Intensa" }
                            ]
                        },
                        {
                            key: "cardBackgroundColor",
                            type: "color",
                            label: "Color de fondo de tarjeta"
                        },
                        {
                            key: "infoBackgroundColor",
                            type: "color",
                            label: "Color del área de información"
                        },
                        {
                            key: "showInfoArea",
                            type: "checkbox",
                            label: "Área de información",
                            checkboxLabel: "Mostrar área de información",
                            defaultValue: true
                        }
                    ]
                }
            ]
        },

        {
            id: "image",
            label: "Imagen",
            icon: "image",
            description: "Configurá cómo se ven las imágenes de producto.",
            groups: [
                {
                    title: "Imagen del producto",
                    icon: "image",
                    fields: [
                        {
                            key: "imageRatio",
                            type: "select",
                            label: "Formato",
                            options: [
                                { value: "square", label: "Cuadrada" },
                                { value: "4-3", label: "4:3" },
                                { value: "16-9", label: "16:9" },
                                { value: "4-5", label: "Vertical 4:5" },
                                { value: "free", label: "Libre" }
                            ]
                        },
                        {
                            key: "imageFit",
                            type: "select",
                            label: "Ajuste de imagen",
                            options: [
                                { value: "cover", label: "Cubrir" },
                                { value: "contain", label: "Completa" }
                            ]
                        },
                        {
                            key: "imagePadding",
                            type: "select",
                            label: "Espacio interno",
                            options: [
                                { value: "0", label: "Sin espacio" },
                                { value: "8px", label: "Pequeño" },
                                { value: "16px", label: "Normal" },
                                { value: "24px", label: "Grande" }
                            ]
                        },
                        {
                            key: "imageRadius",
                            type: "select",
                            label: "Redondeo de imagen",
                            options: [
                                { value: "0", label: "Recta" },
                                { value: "5px", label: "5 px" },
                                { value: "10px", label: "10 px" },
                                { value: "20px", label: "20 px" }
                            ]
                        },
                        {
                            key: "imageHover",
                            type: "select",
                            label: "Efecto al pasar el mouse",
                            options: [
                                { value: "none", label: "Sin efecto" },
                                { value: "zoom", label: "Zoom suave" }
                            ]
                        }
                    ]
                }
            ]
        },

        {
            id: "product_info",
            label: "Información",
            icon: "fields",
            description: "Elegí qué datos se muestran en cada tarjeta.",
            groups: [
                {
                    title: "Datos visibles",
                    icon: "fields",
                    fields: [
                        {
                            key: "showCategory",
                            type: "checkbox",
                            label: "Categoría",
                            checkboxLabel: "Mostrar categoría",
                            defaultValue: false
                        },
                        {
                            key: "showSku",
                            type: "checkbox",
                            label: "SKU",
                            checkboxLabel: "Mostrar SKU",
                            defaultValue: false
                        },
                        {
                            key: "showTitle",
                            type: "checkbox",
                            label: "Título",
                            checkboxLabel: "Mostrar título",
                            defaultValue: true
                        },
                        {
                            key: "showFavorite",
                            type: "checkbox",
                            label: "Favoritos",
                            checkboxLabel: "Mostrar favoritos",
                            defaultValue: true
                        },
                        {
                            key: "showShare",
                            type: "checkbox",
                            label: "Compartir",
                            checkboxLabel: "Mostrar compartir",
                            defaultValue: true
                        },
                        {
                            key: "showButton",
                            type: "checkbox",
                            label: "Botón",
                            checkboxLabel: "Mostrar botón Ver producto",
                            defaultValue: true
                        },
                        {
                            key: "infoAlignment",
                            type: "select",
                            label: "Alineación",
                            options: alignmentOptions
                        },
                        {
                            key: "infoPadding",
                            type: "select",
                            label: "Espacio interno",
                            options: paddingOptions
                        }
                    ]
                }
            ]
        },

        {
            id: "price",
            label: "Precio",
            icon: "palette",
            description: "Configurá cómo se muestran los precios y descuentos.",
            groups: [
                {
                    title: "Información visible",
                    icon: "fields",
                    fields: [
                        {
                            key: "showPrice",
                            type: "checkbox",
                            label: "Precio",
                            checkboxLabel: "Mostrar precio",
                            defaultValue: true
                        },
                        {
                            key: "showOldPrice",
                            type: "checkbox",
                            label: "Precio anterior",
                            checkboxLabel: "Mostrar precio anterior",
                            defaultValue: true
                        },
                        {
                            key: "showDiscount",
                            type: "checkbox",
                            label: "Descuento",
                            checkboxLabel: "Mostrar porcentaje de descuento",
                            defaultValue: true
                        },
                        {
                            key: "showOfferBadge",
                            type: "checkbox",
                            label: "Oferta",
                            checkboxLabel: "Mostrar etiqueta Oferta",
                            defaultValue: true
                        }
                    ]
                },
                {
                    title: "Colores",
                    icon: "palette",
                    fields: [
                        {
                            key: "priceColor",
                            type: "color",
                            label: "Color del precio"
                        },
                        {
                            key: "oldPriceColor",
                            type: "color",
                            label: "Color del precio anterior"
                        },
                        {
                            key: "discountColor",
                            type: "color",
                            label: "Color del descuento"
                        },
                        {
                            key: "offerBadgeColor",
                            type: "color",
                            label: "Color del texto Oferta"
                        },
                        {
                            key: "offerBadgeBackground",
                            type: "color",
                            label: "Fondo de Oferta"
                        }
                    ]
                },
                {
                    title: "Tipografía",
                    icon: "font",
                    fields: [
                        {
                            key: "priceSize",
                            type: "select",
                            label: "Tamaño del precio",
                            options: [
                                { value: "12px", label: "12px" },
                                { value: "14px", label: "14px" },
                                { value: "16px", label: "16px" },
                                { value: "18px", label: "18px" },
                                { value: "20px", label: "20px" },
                                { value: "24px", label: "24px" },
                                { value: "28px", label: "28px" },
                                { value: "32px", label: "32px" },
                                { value: "40px", label: "40px" }
                            ]
                        },
                        {
                            key: "oldPriceSize",
                            type: "select",
                            label: "Tamaño del precio anterior",
                            options: [
                                { value: "12px", label: "12px" },
                                { value: "14px", label: "14px" },
                                { value: "16px", label: "16px" },
                                { value: "18px", label: "18px" },
                                { value: "20px", label: "20px" },
                                { value: "24px", label: "24px" },
                                { value: "28px", label: "28px" },
                                { value: "32px", label: "32px" },
                                { value: "40px", label: "40px" }
                            ]
                        },
                        {
                            key: "discountSize",
                            type: "select",
                            label: "Tamaño del descuento",
                            options: [
                                { value: "12px", label: "12px" },
                                { value: "14px", label: "14px" },
                                { value: "16px", label: "16px" },
                                { value: "18px", label: "18px" },
                                { value: "20px", label: "20px" },
                                { value: "24px", label: "24px" },
                                { value: "28px", label: "28px" },
                                { value: "32px", label: "32px" },
                                { value: "40px", label: "40px" }
                            ]
                        }
                    ]
                },
                {
                    title: "Distribución",
                    icon: "layout",
                    fields: [
                        {
                            key: "priceAlignment",
                            type: "buttonGroup",
                            label: "Alineación",
                            options: alignmentOptions
                        }
                    ]
                }
            ]
        },

        {
            id: "button",
            label: "Botón",
            icon: "button",
            description: "Configurá el botón de cada producto.",
            groups: [
                {
                    title: "Contenido",
                    icon: "button",
                    fields: [
                        {
                            key: "buttonText",
                            type: "text",
                            label: "Texto del botón"
                        },
                        {
                            key: "buttonIcon",
                            type: "checkbox",
                            label: "Icono",
                            checkboxLabel: "Mostrar icono"
                        },
                        {
                            key: "buttonIconType",
                            type: "select",
                            label: "Icono",
                            options: [
                                { value: "arrow", label: "Flecha" },
                                { value: "bag", label: "Bolsa" },
                                { value: "cart", label: "Carrito" },
                                { value: "eye", label: "Ver" }
                            ]
                        },
                        {
                            key: "buttonIconPosition",
                            type: "buttonGroup",
                            label: "Posición",
                            options: [
                                {
                                    value: "left",
                                    icon: "align_left",
                                    label: "Izquierda"
                                },
                                {
                                    value: "right",
                                    icon: "align_right",
                                    label: "Derecha"
                                }
                            ]
                        }
                    ]
                },
                {
                    title: "Apariencia",
                    icon: "palette",
                    fields: [
                        {
                            key: "buttonBackgroundColor",
                            type: "color",
                            label: "Color de fondo"
                        },
                        {
                            key: "buttonTextColor",
                            type: "color",
                            label: "Color del texto"
                        },
                        {
                            key: "buttonBorderColor",
                            type: "color",
                            label: "Color del borde"
                        },
                        {
                            key: "buttonBorderWidth",
                            type: "select",
                            label: "Borde",
                            options: [
                                { value: "0", label: "Sin borde" },
                                { value: "1px", label: "Fino" },
                                { value: "2px", label: "Normal" },
                                { value: "3px", label: "Grueso" }
                            ]
                        },
                        {
                            key: "buttonPaddingY",
                            type: "select",
                            label: "Altura del botón",
                            options: [
                                { value: "6px", label: "Pequeño" },
                                { value: "10px", label: "Normal" },
                                { value: "14px", label: "Grande" }
                            ]
                        },
                        {
                            key: "buttonPaddingX",
                            type: "select",
                            label: "Ancho del botón",
                            options: [
                                { value: "10px", label: "Pequeño" },
                                { value: "16px", label: "Normal" },
                                { value: "24px", label: "Grande" }
                            ]
                        },
                        {
                            key: "buttonRadius",
                            type: "select",
                            label: "Redondeo",
                            options: [
                                { value: "0", label: "Recto" },
                                { value: "5px", label: "5 px" },
                                { value: "10px", label: "10 px" },
                                { value: "20px", label: "20 px" },
                                { value: "999px", label: "Píldora" }
                            ]
                        },
                        {
                            key: "buttonSize",
                            type: "select",
                            label: "Tamaño",
                            options: [
                                { value: "small", label: "Pequeño" },
                                { value: "normal", label: "Normal" },
                                { value: "large", label: "Grande" }
                            ]
                        },
                        {
                            key: "buttonFullWidth",
                            type: "checkbox",
                            label: "Ancho",
                            checkboxLabel: "Usar ancho completo"
                        }
                    ]
                }
            ]
        }
    ];

}
/* ********************************************* */


export const storeModuleDefinitions = {

    store_reviews: {
        type: "store_reviews",
        name: "Reseñas de clientes",
        context: STORE_CONTEXT,
        category: "commerce",
        isSystem: false,
        dataSource: "reviews",

        defaultContent: {
            source: "both",
            layout: "slider",
            limit: 10,
            order: "newest",

            showBadge: true,
            badge: "Opiniones reales",

            showTitle: true,
            title: "Lo que dicen nuestros clientes",

            showDescription: true,
            description:
                "Conocé las experiencias y opiniones de quienes ya compraron.",

            showStars: true,
            showCustomerName: true,
            showDate: true,
            showReviewTitle: true,
            showComment: true,
            showProductName: true,
            showVerifiedBadge: true,
            showReviewType: true
        },

        defaultStyles: {},

        defaultAnimation: {
            type: "none"
        },

        editor: createEditorSchema({
            description:
                "Mostrá las reseñas públicas de experiencias, productos o ambas.",

            contentGroups: [
                {
                    title: "Reseñas",
                    description:
                        "Elegí qué opiniones se muestran y cómo se ordenan.",
                    icon: "star",

                    fields: [
                        {
                            key: "source",
                            type: "select",
                            label: "Fuente de las reseñas",
                            options: [
                                {
                                    value: "both",
                                    label: "Experiencias y productos"
                                },
                                {
                                    value: "experience",
                                    label: "Solo experiencias"
                                },
                                {
                                    value: "commerce",
                                    label: "Solo productos"
                                }
                            ]
                        },
                        {
                            key: "layout",
                            type: "select",
                            label: "Presentación",
                            options: [
                                {
                                    value: "slider",
                                    label: "Slider"
                                },
                                {
                                    value: "grid",
                                    label: "Grilla"
                                }
                            ]
                        },
                        {
                            key: "limit",
                            type: "number",
                            label: "Cantidad máxima de reseñas",
                            min: 1,
                            max: 50
                        },
                        {
                            key: "order",
                            type: "select",
                            label: "Orden",
                            options: [
                                {
                                    value: "newest",
                                    label: "Más recientes"
                                },
                                {
                                    value: "best_rating",
                                    label: "Mejor calificadas"
                                },
                                {
                                    value: "random",
                                    label: "Aleatorias"
                                }
                            ]
                        }
                    ]
                },
                {
                    title: "Encabezado",
                    description:
                        "Configurá los textos que presentan la sección.",
                    icon: "text",

                    fields: [
                        {
                            key: "showBadge",
                            type: "checkbox",
                            label: "Etiqueta",
                            checkboxLabel: "Mostrar etiqueta",
                            defaultValue: true
                        },
                        {
                            key: "badge",
                            type: "text",
                            label: "Texto de la etiqueta"
                        },
                        {
                            key: "showTitle",
                            type: "checkbox",
                            label: "Título",
                            checkboxLabel: "Mostrar título",
                            defaultValue: true
                        },
                        {
                            key: "title",
                            type: "text",
                            label: "Título"
                        },
                        {
                            key: "showDescription",
                            type: "checkbox",
                            label: "Descripción",
                            checkboxLabel: "Mostrar descripción",
                            defaultValue: true
                        },
                        {
                            key: "description",
                            type: "textarea",
                            label: "Descripción"
                        }
                    ]
                },
                {
                    title: "Contenido de las tarjetas",
                    description:
                        "Elegí qué información aparece en cada reseña.",
                    icon: "fields",

                    fields: [
                        {
                            key: "showStars",
                            type: "checkbox",
                            label: "Estrellas",
                            checkboxLabel: "Mostrar estrellas",
                            defaultValue: true
                        },
                        {
                            key: "showCustomerName",
                            type: "checkbox",
                            label: "Cliente",
                            checkboxLabel: "Mostrar nombre del cliente",
                            defaultValue: true
                        },
                        {
                            key: "showDate",
                            type: "checkbox",
                            label: "Fecha",
                            checkboxLabel: "Mostrar fecha",
                            defaultValue: true
                        },
                        {
                            key: "showReviewTitle",
                            type: "checkbox",
                            label: "Título de la reseña",
                            checkboxLabel: "Mostrar título",
                            defaultValue: true
                        },
                        {
                            key: "showComment",
                            type: "checkbox",
                            label: "Comentario",
                            checkboxLabel: "Mostrar comentario",
                            defaultValue: true
                        },
                        {
                            key: "showProductName",
                            type: "checkbox",
                            label: "Producto",
                            checkboxLabel:
                                "Mostrar nombre del producto",
                            defaultValue: true
                        },
                        {
                            key: "showVerifiedBadge",
                            type: "checkbox",
                            label: "Compra verificada",
                            checkboxLabel:
                                "Mostrar insignia cuando corresponda",
                            defaultValue: true
                        },
                        {
                            key: "showReviewType",
                            type: "checkbox",
                            label: "Tipo de reseña",
                            checkboxLabel:
                                "Mostrar Producto o Experiencia",
                            defaultValue: true
                        }
                    ]
                }
            ],

            extraTabs: [
                {
                    id: "stars",
                    label: "Estrellas",
                    icon: "star",
                    description:
                        "Personalizá los colores de la calificación.",

                    groups: [
                        {
                            title: "Apariencia",
                            description:
                                "Dejá los colores vacíos para usar los definidos por el tema.",
                            icon: "palette",

                            fields: [
                                {
                                    key: "starColor",
                                    target: "styles",
                                    type: "color",
                                    label: "Color de estrellas activas"
                                },
                                {
                                    key: "inactiveStarColor",
                                    target: "styles",
                                    type: "color",
                                    label: "Color de estrellas vacías"
                                }
                            ]
                        }
                    ]
                }
            ],

            typography: [
                "title",
                "text",
                "meta"
            ],

            animation: false
        })
    },

    store_product_reviews_cta: {
        type: "store_product_reviews_cta",
        name: "Calificar productos",
        context: STORE_CONTEXT,
        category: "commerce",
        isSystem: false,

        defaultContent: {
            showStars: true,
            showTitle: true,
            showDescription: true,
            showButton: true,

            title:
                "¿Qué te parecieron los productos?",

            description:
                "Si ya recibiste tu pedido, podés calificar los productos que compraste y ayudar a otros clientes a elegir mejor.",

            buttonText:
                "Calificar mis productos",

            modalTitle:
                "Verificá tu compra",

            modalDescription:
                "Ingresá el número de pedido y el email o teléfono utilizado en la compra."
        },

        defaultStyles: {},

        defaultAnimation: {
            type: "fadeUp",
            duration: 500
        },

        editor: createEditorSchema({
            description:
                "Permití que clientes con una compra entregada califiquen los productos de su pedido.",

            contentGroups: [
                {
                    title:
                        "Contenido",

                    description:
                        "Configurá los textos visibles del bloque.",

                    icon:
                        "fields",

                    fields: [
                        {
                            key: "showStars",
                            type: "checkbox",
                            label: "Estrellas",
                            checkboxLabel: "Mostrar estrellas",
                            defaultValue: true
                        },
                        {
                            key: "showTitle",
                            type: "checkbox",
                            label: "Título",
                            checkboxLabel: "Mostrar título",
                            defaultValue: true
                        },
                        {
                            key: "title",
                            type: "text",
                            label: "Título"
                        },
                        {
                            key: "showDescription",
                            type: "checkbox",
                            label: "Descripción",
                            checkboxLabel: "Mostrar descripción",
                            defaultValue: true
                        },
                        {
                            key: "description",
                            type: "textarea",
                            label: "Descripción"
                        },
                        {
                            key: "showButton",
                            type: "checkbox",
                            label: "Botón",
                            checkboxLabel: "Mostrar botón",
                            defaultValue: true
                        },
                        {
                            key: "buttonText",
                            type: "text",
                            label: "Texto del botón"
                        }
                    ]
                },
                {
                    title:
                        "Ventana de verificación",

                    description:
                        "Configurá los textos del modal donde se valida la compra.",

                    icon:
                        "options",

                    fields: [
                        {
                            key: "modalTitle",
                            type: "text",
                            label: "Título del modal"
                        },
                        {
                            key: "modalDescription",
                            type: "textarea",
                            label: "Descripción del modal"
                        }
                    ]
                }
            ],
            extraTabs: [
                {
                    id: "stars",
                    label: "Estrellas",
                    icon: "star",

                    groups: [
                        {
                            title: "Calificación",

                            description:
                                "Personalizá el color de las estrellas.",

                            fields: [
                                {
                                    key: "starColor",
                                    target: "styles",
                                    type: "color",
                                    label: "Color de estrellas"
                                }
                            ]
                        }
                    ]
                }
            ],
            typography: [
                "title",
                "text",
                "button"
            ],
            animation: false
        })
    },
    store_topbar: {
        type: "store_topbar",
        name: "Barra superior",
        context: STORE_CONTEXT,
        category: "layout",
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
        },
        editor: createEditorSchema({
            description: "Configurá el mensaje comercial que aparece arriba de la tienda.",
            contentGroups: [
                {
                    title: "Mensaje superior",
                    description: "Mostrá una promesa rápida como envíos, atención o promociones.",
                    icon: "text",
                    fields: [
                        { key: "text", type: "text", label: "Mensaje superior" },
                        { key: "whatsappText", type: "text", label: "Texto del botón de WhatsApp" },
                        { key: "showWhatsapp", type: "checkbox", label: "Botón de WhatsApp", checkboxLabel: "Mostrar WhatsApp" }
                    ]
                }
            ],
            typography: ["text", "button"]
        })
    },

    store_header: {
        type: "store_header",
        name: "Encabezado",
        context: STORE_CONTEXT,
        category: "layout",
        isSystem: true,
        defaultContent: {
            showLogo: true,
            showName: true,
            showDescription: true,
            showFavorites: true,
            showSearch: true,
            showCart: true,
            sticky: true,
            logoWidth: 220,
            logoHeight: 70,
            logoPadding: 0,
            logoPosition: "left"
        },
        defaultStyles: {},
        defaultAnimation: {
            type: "none"
        },
        editor: createEditorSchema({
            description: "Definí qué elementos principales se muestran en el encabezado de la tienda.",
            contentGroups: [
                {
                    title: "Elementos visibles",
                    description: "Activá o desactivá las partes principales de navegación.",
                    icon: "store",
                    fields: [
                        {
                            key: "logoPosition",
                            type: "select",
                            label: "Ubicación del logo",
                            options: [
                                {
                                    value: "left",
                                    label: "Izquierda"
                                },
                                {
                                    value: "center",
                                    label: "Centro"
                                }
                            ]
                        },

                        {
                            key: "logoWidth",
                            type: "number",
                            label: "Ancho del logo",
                            min: 30,
                            max: 500
                        },

                        {
                            key: "logoHeight",
                            type: "number",
                            label: "Alto del logo",
                            min: 20,
                            max: 300
                        },

                        {
                            key: "logoPadding",
                            type: "number",
                            label: "Espacio alrededor del logo",
                            min: 0,
                            max: 50,
                            suffix: " px"
                        },

                        {
                            key: "showLogo",
                            type: "checkbox",
                            label: "Logo",
                            checkboxLabel: "Mostrar logo"
                        },

                        {
                            key: "showName",
                            type: "checkbox",
                            label: "Nombre",
                            checkboxLabel: "Mostrar nombre"
                        },

                        {
                            key: "showDescription",
                            type: "checkbox",
                            label: "Descripción",
                            checkboxLabel: "Mostrar descripción"
                        },

                        {
                            key: "showFavorites",
                            type: "checkbox",
                            label: "Favoritos",
                            checkboxLabel: "Mostrar favoritos"
                        },

                        {
                            key: "showCart",
                            type: "checkbox",
                            label: "Carrito",
                            checkboxLabel: "Mostrar carrito"
                        },

                        {
                            key: "sticky",
                            type: "checkbox",
                            label: "Encabezado fijo",
                            checkboxLabel: "Mantener visible al desplazarse"
                        },

                        {
                            key: "logoSize",
                            type: "select",
                            label: "Tamaño del logo",
                            options: [
                                {
                                    value: "small",
                                    label: "Pequeño"
                                },
                                {
                                    value: "medium",
                                    label: "Mediano"
                                },
                                {
                                    value: "large",
                                    label: "Grande"
                                }
                            ]
                        },

                        {
                            key: "logoFit",
                            type: "select",
                            label: "Ajuste del logo",
                            options: [
                                {
                                    value: "contain",
                                    label: "Completo"
                                },
                                {
                                    value: "cover",
                                    label: "Cubrir"
                                }
                            ]
                        }

                    ]
                }
            ],

            extraTabs: createProductCardExtraTabs(),

            typography: ["title", "text", "button"],
            animation: false
        })
    },

    store_category_menu: {
        type: "store_category_menu",
        name: "Menú de categorías",
        context: STORE_CONTEXT,
        category: "navigation",
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
        },
        editor: createEditorSchema({
            description: "Organizá cómo navegan los clientes entre las categorías de productos.",
            contentGroups: [
                {
                    title: "Navegación",
                    description: "Elegí una navegación simple y clara para recorrer el catálogo.",
                    icon: "options",
                    fields: [
                        {
                            key: "display",
                            type: "select",
                            label: "Forma de mostrar las categorías",
                            options: [
                                { value: "horizontal", label: "Una al lado de otra" },
                                { value: "vertical", label: "Una debajo de otra" }
                            ]
                        },
                        {
                            key: "showAllOption",
                            type: "checkbox",
                            label: "Opción Todos",
                            checkboxLabel: "Mostrar opción “Todos”"
                        }
                    ]
                }
            ],
            typography: ["text", "button"]
        })
    },

    store_hero: {
        type: "store_hero",
        name: "Portada",
        context: STORE_CONTEXT,
        category: "hero",
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
        },
        editor: createEditorSchema({
            description: "Diseñá la primera impresión de la tienda con mensaje, acciones e imagen principal.",
            contentGroups: [
                {
                    title: "Mensaje principal",
                    description: "Contá rápido qué vendés y por qué conviene comprar acá.",
                    icon: "text",
                    fields: [
                        { key: "title", type: "text", label: "Título principal" },
                        { key: "subtitle", type: "textarea", label: "Texto de presentación" }
                    ]
                },
                {
                    title: "Botones",
                    description: "Configurá las llamadas a la acción principales de la portada.",
                    icon: "button",
                    fields: [
                        { key: "primaryButtonText", type: "text", label: "Texto del botón principal" },
                        { key: "secondaryButtonText", type: "text", label: "Texto del botón secundario" }
                    ]
                }
            ],
            imageTab: {
                id: "image",
                label: "Imagen",
                icon: "image",
                preview: "hero-image",
                description: "Subí y ajustá la imagen principal de la portada.",
                groups: [
                    {
                        title: "Imagen principal",
                        description: "Usá una imagen clara y comercial para presentar la tienda.",
                        icon: "image",
                        fields: [
                            {
                                key: "imageUrl",
                                type: "image",
                                label: "Imagen de la portada",
                                variant: "hero",
                                fileName: "hero",
                                uploadLabel: "Subir imagen",
                                storagePathKey: "imageStoragePath",
                                ogUrlKey: "imageOgUrl",
                                ogStoragePathKey: "imageOgStoragePath"
                            }
                        ]
                    },
                    {
                        title: "Ajustes de imagen",
                        description: "Controlá encuadre, altura y lectura del texto sobre la imagen.",
                        icon: "palette",
                        fields: [
                            {
                                key: "imageFit",
                                type: "select",
                                label: "Cómo acomodar la imagen",
                                options: [
                                    { value: "cover", label: "Cubrir toda la portada" },
                                    { value: "contain", label: "Mostrar la imagen completa" }
                                ]
                            },
                            {
                                key: "imagePositionX",
                                type: "select",
                                label: "Posición horizontal",
                                options: [
                                    { value: "left", label: "Izquierda" },
                                    { value: "center", label: "Centro" },
                                    { value: "right", label: "Derecha" }
                                ]
                            },
                            {
                                key: "imagePositionY",
                                type: "select",
                                label: "Posición vertical",
                                options: [
                                    { value: "top", label: "Arriba" },
                                    { value: "center", label: "Centro" },
                                    { value: "bottom", label: "Abajo" }
                                ]
                            },
                            {
                                key: "heroHeight",
                                type: "select",
                                label: "Altura de la portada",
                                options: [
                                    { value: "small", label: "Baja" },
                                    { value: "medium", label: "Media" },
                                    { value: "large", label: "Alta" },
                                    { value: "full", label: "Muy alta" }
                                ]
                            },
                            {
                                key: "overlayOpacity",
                                type: "range",
                                label: "Oscurecer imagen",
                                min: 0,
                                max: 100,
                                step: 1,
                                defaultValue: 40,
                                suffix: "%",
                                minLabel: "Claro",
                                maxLabel: "Oscuro"
                            }
                        ]
                    }
                ]
            },
            typography: ["title", "subtitle", "button"]
        })
    },

    store_trust_bar: {
        type: "store_trust_bar",
        name: "Confianza y beneficios",
        context: STORE_CONTEXT,
        category: "commerce",
        isSystem: false,
        animation: false,
        defaultContent: {
            showTitle: false,
            title: "Beneficios de comprar acá",
            showDescription: false,
            description: "Comprá con confianza y atención personalizada.",

            showItemIcon: true,
            showItemTitle: true,
            showItemText: true,

            items: [
                {
                    icon: "shield",
                    title: "Compra segura",
                    text: "Tus pedidos quedan registrados."
                },
                {
                    icon: "message",
                    title: "Atención directa",
                    text: "Consultá antes de comprar."
                },
                {
                    icon: "truck",
                    title: "Envíos y retiro",
                    text: "Coordinamos la entrega."
                }
            ],

            cardBackgroundColor: "",
            cardBorder: true,
            cardBorderColor: "",
            cardRadius: "20px",
            cardShadow: "soft",
            cardPadding: "24px",

            iconColor: "",
            iconBackgroundColor: "",
            iconSize: "normal",
            iconShape: "circle"
        },

        defaultStyles: {},

        defaultAnimation: {
            type: "fadeUp",
            duration: 500
        },

        editor: createEditorSchema({
            description: "Mostrá beneficios que ayuden al cliente a confiar antes de comprar.",

            contentGroups: [
                {
                    title: "Encabezado",
                    description: "Agregá un título opcional para presentar los beneficios.",
                    icon: "text",
                    fields: [
                        {
                            key: "showTitle",
                            type: "checkbox",
                            label: "Título",
                            checkboxLabel: "Mostrar título"
                        },
                        {
                            key: "title",
                            type: "text",
                            label: "Título"
                        },
                        {
                            key: "showDescription",
                            type: "checkbox",
                            label: "Descripción",
                            checkboxLabel: "Mostrar descripción"
                        },
                        {
                            key: "description",
                            type: "textarea",
                            label: "Descripción"
                        }
                    ]
                },
                {
                    title: "Beneficios",
                    description: "Definí qué partes se muestran y editá cada beneficio.",
                    icon: "options",
                    fields: [
                        {
                            key: "showItemIcon",
                            type: "checkbox",
                            label: "Iconos",
                            checkboxLabel: "Mostrar iconos",
                            defaultValue: true
                        },
                        {
                            key: "showItemTitle",
                            type: "checkbox",
                            label: "Títulos",
                            checkboxLabel: "Mostrar títulos",
                            defaultValue: true
                        },
                        {
                            key: "showItemText",
                            type: "checkbox",
                            label: "Textos",
                            checkboxLabel: "Mostrar textos",
                            defaultValue: true
                        },
                        {
                            key: "items",
                            type: "items",
                            label: "Beneficios",
                            addLabel: "+ Agregar beneficio",
                            itemFields: [
                                {
                                    key: "icon",
                                    type: "select",
                                    label: "Icono",
                                    defaultValue: "shield",
                                    options: [
                                        { value: "shield", label: "Escudo" },
                                        { value: "truck", label: "Camión" },
                                        { value: "package", label: "Caja" },
                                        { value: "card", label: "Tarjeta" },
                                        { value: "message", label: "Mensaje" },
                                        { value: "star", label: "Estrella" },
                                        { value: "check", label: "Check" },
                                        { value: "support", label: "Soporte" }
                                    ]
                                },
                                {
                                    key: "title",
                                    type: "text",
                                    label: "Título"
                                },
                                {
                                    key: "text",
                                    type: "textarea",
                                    label: "Texto"
                                }
                            ]
                        }
                    ]
                }
            ],

            extraTabs: [
                {
                    id: "cards",
                    label: "Tarjetas",
                    icon: "palette",
                    description: "Configurá la apariencia de las tarjetas de beneficios.",
                    groups: [
                        {
                            title: "Apariencia",
                            icon: "palette",
                            fields: [
                                {
                                    key: "cardBackgroundColor",
                                    type: "color",
                                    label: "Color de fondo"
                                },
                                {
                                    key: "cardBorder",
                                    type: "checkbox",
                                    label: "Borde",
                                    checkboxLabel: "Mostrar borde",
                                    defaultValue: true
                                },
                                {
                                    key: "cardBorderColor",
                                    type: "color",
                                    label: "Color del borde"
                                },
                                {
                                    key: "cardRadius",
                                    type: "select",
                                    label: "Redondeo",
                                    options: [
                                        { value: "0", label: "Recta" },
                                        { value: "5px", label: "5 px" },
                                        { value: "10px", label: "10 px" },
                                        { value: "20px", label: "20 px" }
                                    ]
                                },
                                {
                                    key: "cardShadow",
                                    type: "select",
                                    label: "Sombra",
                                    options: [
                                        { value: "none", label: "Sin sombra" },
                                        { value: "soft", label: "Suave" },
                                        { value: "medium", label: "Media" },
                                        { value: "strong", label: "Intensa" }
                                    ]
                                },
                                {
                                    key: "cardPadding",
                                    type: "select",
                                    label: "Espacio interno",
                                    options: paddingOptions
                                }
                            ]
                        }
                    ]
                },
                {
                    id: "icons",
                    label: "Iconos",
                    icon: "image",
                    description: "Configurá cómo se muestran los iconos de beneficios.",
                    groups: [
                        {
                            title: "Apariencia",
                            icon: "image",
                            fields: [
                                {
                                    key: "iconColor",
                                    type: "color",
                                    label: "Color del icono"
                                },
                                {
                                    key: "iconBackgroundColor",
                                    type: "color",
                                    label: "Fondo del icono"
                                },
                                {
                                    key: "iconSize",
                                    type: "select",
                                    label: "Tamaño",
                                    options: [
                                        { value: "small", label: "Chico" },
                                        { value: "normal", label: "Normal" },
                                        { value: "large", label: "Grande" }
                                    ]
                                },
                                {
                                    key: "iconShape",
                                    type: "select",
                                    label: "Forma",
                                    options: [
                                        { value: "none", label: "Sin fondo" },
                                        { value: "circle", label: "Circular" },
                                        { value: "rounded", label: "Redondeado" },
                                        { value: "square", label: "Cuadrado" }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],

            typography: ["title", "text"],
            animation: false
        })
    },
    store_featured_products: {
        type: "store_featured_products",
        name: "Colección de productos",
        context: STORE_CONTEXT,
        category: "products",
        isSystem: false,
        dataSource: "featured_products",

        defaultContent: {
            ...PRODUCT_CARD_DEFAULT_CONTENT,

            title: "Productos destacados",
            description: "",
            badgeText: "Destacados",
            mode: "featured",
            limit: 12,

            showBadge: true,
            showTitle: true,
            showDescription: false
        },

        defaultStyles: {},

        defaultAnimation: {
            type: "fadeUp",
            duration: 500
        },

        editor: createEditorSchema({
            description: "Mostrá productos destacados, ofertas, novedades o una categoría especial.",

            contentGroups: [
                {
                    title: "Colección",
                    description: "Elegí qué productos aparecen en esta sección.",
                    icon: "store",
                    fields: [
                        {
                            key: "mode",
                            type: "select",
                            label: "Tipo de colección",
                            options: [
                                {
                                    value: "featured",
                                    label: "Destacados"
                                },
                                {
                                    value: "sale",
                                    label: "Ofertas"
                                },
                                {
                                    value: "recent",
                                    label: "Novedades"
                                }
                            ]
                        },
                        {
                            key: "limit",
                            type: "number",
                            label: "Cantidad de productos",
                            min: 1,
                            max: 24
                        }
                    ]
                },
                {
                    title: "Textos",
                    description: "Configurá los textos visibles de la sección.",
                    icon: "fields",
                    fields: [
                        {
                            key: "badgeText",
                            type: "text",
                            label: "Etiqueta superior"
                        },
                        {
                            key: "title",
                            type: "text",
                            label: "Título de la sección"
                        },
                        {
                            key: "description",
                            type: "textarea",
                            label: "Descripción"
                        }
                    ]
                },
                {
                    title: "Elementos visibles",
                    description: "Elegí los textos principales que se muestran.",
                    icon: "fields",
                    fields: [
                        {
                            key: "showBadge",
                            type: "checkbox",
                            label: "Etiqueta",
                            checkboxLabel: "Mostrar etiqueta",
                            defaultValue: true
                        },
                        {
                            key: "showTitle",
                            type: "checkbox",
                            label: "Título",
                            checkboxLabel: "Mostrar título",
                            defaultValue: true
                        },
                        {
                            key: "showDescription",
                            type: "checkbox",
                            label: "Descripción",
                            checkboxLabel: "Mostrar descripción",
                            defaultValue: false
                        }
                    ]
                }
            ],

            extraTabs:
                createProductCardExtraTabs(),

            typography: [
                "title",
                "text",
                "price",
                "oldPrice",
                "meta",
                "button"
            ],

            animation:
                false
        })
    },

    store_sale_products: {
        type: "store_featured_products",
        name: "Productos en oferta",
        context: STORE_CONTEXT,
        category: "products",
        isSystem: false,
        dataSource: "featured_products",

        defaultContent: {
            title: "Productos en oferta",
            description: "",
            badgeText: "Ofertas",
            mode: "sale",
            limit: 12,

            showBadge: true,
            showTitle: true,
            showDescription: false,
            showPrice: true,
            showOldPrice: true,
            showButton: true
        },

        defaultStyles: {},

        defaultAnimation: {
            type: "fadeUp",
            duration: 500
        },

        editor: featuredProductsEditor
    },

    store_recent_products: {
        type: "store_featured_products",
        name: "Novedades",
        context: STORE_CONTEXT,
        category: "products",
        isSystem: false,
        dataSource: "featured_products",

        defaultContent: {
            title: "Últimos productos",
            description: "",
            badgeText: "Novedades",
            mode: "recent",
            limit: 12,

            showBadge: true,
            showTitle: true,
            showDescription: false,
            showPrice: true,
            showOldPrice: true,
            showButton: true
        },

        defaultStyles: {},

        defaultAnimation: {
            type: "fadeUp",
            duration: 500
        },

        editor: featuredProductsEditor
    },

    store_promo_banner: {
        type: "store_promo_banner",
        name: "Promoción",
        context: STORE_CONTEXT,
        category: "marketing",
        isSystem: false,

        defaultContent: {
            showBadge: true,
            badge: "Oferta",

            showTitle: true,
            title: "Promociones especiales",

            showDescription: true,
            subtitle: "Consultá ofertas, combos y beneficios disponibles.",

            showButton: true,
            buttonText: "Consultar",

            buttonIcon: false,
            buttonIconType: "arrow",
            buttonIconPosition: "right",

            cardBackgroundColor: "",
            cardBorder: true,
            cardBorderColor: "",
            cardRadius: "20px",
            cardShadow: "soft",
            cardPadding: "32px",

            badgeBackgroundColor: "",
            badgeTextColor: "",
            badgeRadius: "999px",

            buttonWidth: "180px",
            buttonBackgroundColor: "",
            buttonTextColor: "",
            buttonBorderColor: "",
            buttonBorderWidth: "",
            buttonRadius: "",
            buttonPaddingY: "",
            buttonPaddingX: "",

            buttonHoverBackgroundColor: "",
            buttonHoverTextColor: "",
            buttonHoverScale: ""
        },

        defaultStyles: {},

        defaultAnimation: {
            type: "zoomIn",
            duration: 500
        },

        editor: createEditorSchema({
            description: "Armá una franja comercial para promociones, combos o campañas temporales.",

            contentGroups: [
                {
                    title: "Contenido",
                    icon: "marketing",
                    fields: [
                        { key: "showBadge", type: "checkbox", label: "Etiqueta", checkboxLabel: "Mostrar etiqueta", defaultValue: true },
                        { key: "badge", type: "text", label: "Texto de la etiqueta" },
                        { key: "showTitle", type: "checkbox", label: "Título", checkboxLabel: "Mostrar título", defaultValue: true },
                        { key: "title", type: "text", label: "Título" },
                        { key: "showDescription", type: "checkbox", label: "Descripción", checkboxLabel: "Mostrar descripción", defaultValue: true },
                        { key: "subtitle", type: "textarea", label: "Descripción" },
                        { key: "showButton", type: "checkbox", label: "Botón", checkboxLabel: "Mostrar botón", defaultValue: true },
                        { key: "buttonText", type: "text", label: "Texto del botón" }
                    ]
                }
            ],

            extraTabs: [
                {
                    id: "card",
                    label: "Tarjeta",
                    icon: "palette",
                    groups: [
                        {
                            title: "Apariencia",
                            icon: "palette",
                            fields: [
                                { key: "cardBackgroundColor", type: "color", label: "Color de fondo" },
                                { key: "cardBorder", type: "checkbox", label: "Borde", checkboxLabel: "Mostrar borde", defaultValue: true },
                                { key: "cardBorderColor", type: "color", label: "Color del borde" },
                                {
                                    key: "cardRadius",
                                    type: "select",
                                    label: "Redondeo",
                                    options: [
                                        { value: "0", label: "Recta" },
                                        { value: "5px", label: "5 px" },
                                        { value: "10px", label: "10 px" },
                                        { value: "20px", label: "20 px" }
                                    ]
                                },
                                {
                                    key: "cardShadow",
                                    type: "select",
                                    label: "Sombra",
                                    options: [
                                        { value: "none", label: "Sin sombra" },
                                        { value: "soft", label: "Suave" },
                                        { value: "medium", label: "Media" },
                                        { value: "strong", label: "Intensa" }
                                    ]
                                },
                                { key: "cardPadding", type: "select", label: "Espacio interno", options: paddingOptions }
                            ]
                        }
                    ]
                },

                {
                    id: "badge",
                    label: "Etiqueta",
                    icon: "marketing",
                    groups: [
                        {
                            title: "Apariencia",
                            icon: "palette",
                            fields: [
                                { key: "badgeBackgroundColor", type: "color", label: "Color de fondo" },
                                { key: "badgeTextColor", type: "color", label: "Color del texto" },
                                {
                                    key: "badgeRadius",
                                    type: "select",
                                    label: "Redondeo",
                                    options: [
                                        { value: "0", label: "Recta" },
                                        { value: "5px", label: "5 px" },
                                        { value: "10px", label: "10 px" },
                                        { value: "20px", label: "20 px" },
                                        { value: "999px", label: "Píldora" }
                                    ]
                                }
                            ]
                        }
                    ]
                },

                {
                    id: "button",
                    label: "Botón",
                    icon: "button",
                    groups: [
                        {
                            title: "Contenido",
                            icon: "button",
                            fields: [
                                { key: "buttonIcon", type: "checkbox", label: "Icono", checkboxLabel: "Mostrar icono" },
                                {
                                    key: "buttonIconType",
                                    type: "select",
                                    label: "Icono",
                                    options: [
                                        { value: "arrow", label: "Flecha" },
                                        { value: "cart", label: "Carrito" },
                                        { value: "bag", label: "Bolsa" },
                                        { value: "eye", label: "Ver" }
                                    ]
                                },
                                {
                                    key: "buttonIconPosition",
                                    type: "select",
                                    label: "Posición del icono",
                                    options: [
                                        { value: "left", label: "Izquierda" },
                                        { value: "right", label: "Derecha" }
                                    ]
                                }
                            ]
                        },
                        {
                            title: "Apariencia",
                            icon: "palette",
                            fields: [
                                {
                                    key: "buttonWidth", type: "select", label: "Ancho del botón", options: [
                                        { value: "140px", label: "Chico" },
                                        { value: "180px", label: "Normal" },
                                        { value: "220px", label: "Grande" },
                                        { value: "100%", label: "Completo" }
                                    ]
                                },
                                { key: "buttonBackgroundColor", type: "color", label: "Color de fondo" },
                                { key: "buttonTextColor", type: "color", label: "Color del texto" },
                                { key: "buttonBorderColor", type: "color", label: "Color del borde" },
                                {
                                    key: "buttonBorderWidth", type: "select", label: "Borde", options: [
                                        { value: "0", label: "Sin borde" },
                                        { value: "1px", label: "Fino" },
                                        { value: "2px", label: "Normal" },
                                        { value: "3px", label: "Grueso" }
                                    ]
                                },
                                {
                                    key: "buttonRadius", type: "select", label: "Redondeo", options: [
                                        { value: "0", label: "Recto" },
                                        { value: "5px", label: "5 px" },
                                        { value: "10px", label: "10 px" },
                                        { value: "20px", label: "20 px" },
                                        { value: "999px", label: "Píldora" }
                                    ]
                                },
                                {
                                    key: "buttonPaddingY", type: "select", label: "Altura del botón", options: [
                                        { value: "6px", label: "Chico" },
                                        { value: "10px", label: "Normal" },
                                        { value: "14px", label: "Grande" }
                                    ]
                                },
                                {
                                    key: "buttonPaddingX", type: "select", label: "Espacio lateral del texto", options: [
                                        { value: "10px", label: "Chico" },
                                        { value: "16px", label: "Normal" },
                                        { value: "24px", label: "Grande" }
                                    ]
                                }
                            ]
                        },
                        {
                            title: "Hover",
                            icon: "palette",
                            fields: [
                                { key: "buttonHoverBackgroundColor", type: "color", label: "Color de fondo al pasar" },
                                { key: "buttonHoverTextColor", type: "color", label: "Color del texto al pasar" },
                                {
                                    key: "buttonHoverScale",
                                    type: "select",
                                    label: "Efecto al pasar",
                                    options: [
                                        { value: "none", label: "Sin efecto" },
                                        { value: "soft", label: "Suave" },
                                        { value: "normal", label: "Normal" }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],

            typography: ["title", "text", "meta"],
            animation: false
        })
    },
    store_product_grid: {
        type: "store_product_grid",
        name: "Catálogo de productos",
        context: STORE_CONTEXT,
        category: "products",
        isSystem: true,
        dataSource: "products",

        defaultContent: {
            title: "Todos los productos",
            description: "Elegí tus productos y consultá disponibilidad.",
            badgeText: "Catálogo",
            showBadge: true,
            showDescription: true,
            showFilters: true,
            showSearch: true,
            onlyFeatured: false,
            limit: 24,
            productsPerPage: 12,
            defaultSort: "recent",

            ...PRODUCT_CARD_DEFAULT_CONTENT,

            columnsDesktop: 4,
            columnsTablet: 3,
            columnsMobile: 2,
            gapX: "24px",
            gapY: "24px"
        },

        defaultStyles: {},

        defaultAnimation: {
            type: "fadeUp",
            duration: 500
        },

        editor: createEditorSchema({
            description: "Configurá cómo se presenta el catálogo completo de la tienda.",
            animation: false,
            contentGroups: [
                {
                    title: "Contenido del catálogo",
                    description: "Definí los textos principales y qué productos se muestran.",
                    icon: "store",

                    fields: [
                        { key: "title", type: "text", label: "Título del catálogo" },
                        { key: "description", type: "textarea", label: "Descripción" },
                        { key: "badgeText", type: "text", label: "Etiqueta superior" },
                        { key: "showBadge", type: "checkbox", label: "Etiqueta", checkboxLabel: "Mostrar etiqueta" },
                        { key: "showDescription", type: "checkbox", label: "Descripción", checkboxLabel: "Mostrar descripción" },
                        { key: "onlyFeatured", type: "checkbox", label: "Productos", checkboxLabel: "Mostrar solo destacados" },
                        { key: "limit", type: "number", label: "Cantidad máxima de productos", min: 1, max: 100 },
                        {
                            key: "productsPerPage", type: "select", label: "Productos por página", options: [
                                { value: 12, label: "12 productos" },
                                { value: 24, label: "24 productos" },
                                { value: 36, label: "36 productos" }
                            ]
                        },
                        {
                            key: "defaultSort", type: "select", label: "Orden inicial", options: [
                                { value: "recent", label: "Más recientes" },
                                { value: "price_asc", label: "Menor precio" },
                                { value: "price_desc", label: "Mayor precio" },
                                { value: "name_asc", label: "A-Z" },
                                { value: "name_desc", label: "Z-A" },
                                { value: "featured", label: "Destacados" }
                            ]
                        }
                    ]
                }
            ],

            extraTabs: [
                {
                    id: "cards",
                    label: "Tarjetas",
                    icon: "store",
                    description: "Definí la personalidad visual de las tarjetas de producto.",
                    groups: [
                        {
                            title: "Estilo de tarjeta",
                            icon: "palette",
                            fields: [
                                {
                                    key: "cardStyle", type: "select", label: "Estilo", options: [
                                        { value: "elevated", label: "Elevada" },
                                        { value: "flat", label: "Plana" },
                                        { value: "minimal", label: "Minimalista" }
                                    ]
                                },
                                { key: "cardBorder", type: "checkbox", label: "Borde", checkboxLabel: "Mostrar borde", defaultValue: true },
                                {
                                    key: "cardRadius", type: "select", label: "Redondeo", options: [
                                        { value: "0", label: "Recta" },
                                        { value: "5px", label: "5 px" },
                                        { value: "10px", label: "10 px" },
                                        { value: "20px", label: "20 px" }
                                    ]
                                },
                                {
                                    key: "cardShadow", type: "select", label: "Sombra", options: [
                                        { value: "none", label: "Sin sombra" },
                                        { value: "soft", label: "Suave" },
                                        { value: "medium", label: "Media" },
                                        { value: "strong", label: "Intensa" }
                                    ]
                                },
                                { key: "cardBackgroundColor", type: "color", label: "Color de fondo de tarjeta" },
                                { key: "infoBackgroundColor", type: "color", label: "Color del área de información" },
                                { key: "showInfoArea", type: "checkbox", label: "Área de información", checkboxLabel: "Mostrar área de información", defaultValue: true }
                            ]
                        }
                    ]
                },

                {
                    id: "image",
                    label: "Imagen",
                    icon: "image",
                    description: "Configurá cómo se ven las imágenes de producto.",
                    groups: [
                        {
                            title: "Imagen del producto",
                            icon: "image",
                            fields: [
                                {
                                    key: "imageRatio", type: "select", label: "Formato", options: [
                                        { value: "square", label: "Cuadrada" },
                                        { value: "4-3", label: "4:3" },
                                        { value: "16-9", label: "16:9" },
                                        { value: "4-5", label: "Vertical 4:5" },
                                        { value: "free", label: "Libre" }
                                    ]
                                },
                                {
                                    key: "imageFit", type: "select", label: "Ajuste de imagen", options: [
                                        { value: "cover", label: "Cubrir" },
                                        { value: "contain", label: "Completa" }
                                    ]
                                },
                                {
                                    key: "imagePadding", type: "select", label: "Espacio interno", options: [
                                        { value: "", label: "Por Defecto" },
                                        { value: "0", label: "Sin Espacio" },
                                        { value: "8px", label: "Pequeño" },
                                        { value: "16px", label: "Normal" },
                                        { value: "24px", label: "Mediano" }
                                    ]
                                },
                                {
                                    key: "imageRadius", type: "select", label: "Redondeo de imagen", options: [
                                        { value: "0", label: "Recta" },
                                        { value: "5px", label: "5 px" },
                                        { value: "10px", label: "10 px" },
                                        { value: "20px", label: "20 px" }
                                    ]
                                },
                                {
                                    key: "imageHover", type: "select", label: "Efecto al pasar el mouse", options: [
                                        { value: "none", label: "Sin efecto" },
                                        { value: "zoom", label: "Zoom suave" }
                                    ]
                                }
                            ]
                        }
                    ]
                },

                {
                    id: "product_info",
                    label: "Información",
                    icon: "fields",
                    description: "Elegí qué datos se muestran en cada tarjeta.",
                    groups: [
                        {
                            title: "Datos visibles",
                            icon: "fields",
                            fields: [
                                { key: "showCategory", type: "checkbox", label: "Categoría", checkboxLabel: "Mostrar categoría", defaultValue: true },
                                { key: "showSku", type: "checkbox", label: "SKU", checkboxLabel: "Mostrar SKU", defaultValue: true },
                                { key: "showTitle", type: "checkbox", label: "Título", checkboxLabel: "Mostrar título" },
                                { key: "showFavorite", type: "checkbox", label: "Favoritos", checkboxLabel: "Mostrar favoritos", defaultValue: true },
                                { key: "showShare", type: "checkbox", label: "Compartir", checkboxLabel: "Mostrar compartir", defaultValue: true },
                                { key: "showButton", type: "checkbox", label: "Botón", checkboxLabel: "Mostrar botón Ver producto", defaultValue: true },
                                { key: "infoAlignment", type: "select", label: "Alineación", options: alignmentOptions },
                                { key: "infoPadding", type: "select", label: "Espacio interno", options: paddingOptions }
                            ]
                        }
                    ]
                },
                {
                    id: "price",
                    label: "Precio",
                    icon: "palette",
                    description: "Configurá cómo se muestran los precios y descuentos.",
                    groups: [

                        {
                            title: "Información visible",
                            icon: "fields",
                            fields: [

                                {
                                    key: "showPrice",
                                    type: "checkbox",
                                    label: "Precio",
                                    checkboxLabel: "Mostrar precio"
                                },

                                {
                                    key: "showOldPrice",
                                    type: "checkbox",
                                    label: "Precio anterior",
                                    checkboxLabel: "Mostrar precio anterior"
                                },

                                {
                                    key: "showDiscount",
                                    type: "checkbox",
                                    label: "Descuento",
                                    checkboxLabel: "Mostrar porcentaje de descuento"
                                },

                                {
                                    key: "showOfferBadge",
                                    type: "checkbox",
                                    label: "Oferta",
                                    checkboxLabel: "Mostrar etiqueta Oferta"
                                }

                            ]
                        },

                        {
                            title: "Colores",
                            icon: "palette",
                            fields: [

                                {
                                    key: "priceColor",
                                    type: "color",
                                    label: "Color del precio"
                                },

                                {
                                    key: "oldPriceColor",
                                    type: "color",
                                    label: "Color del precio anterior"
                                },

                                {
                                    key: "discountColor",
                                    type: "color",
                                    label: "Color del descuento"
                                },

                                {
                                    key: "offerBadgeColor",
                                    type: "color",
                                    label: "Color del texto Oferta"
                                },

                                {
                                    key: "offerBadgeBackground",
                                    type: "color",
                                    label: "Fondo de Oferta"
                                }

                            ]
                        },

                        {
                            title: "Tipografía",
                            icon: "font",
                            fields: [

                                {
                                    key: "priceSize",
                                    type: "select",
                                    label: "Tamaño del precio",
                                    options: [
                                        { value: "12px", label: "12px" },
                                        { value: "14px", label: "14px" },
                                        { value: "16px", label: "16px" },
                                        { value: "18px", label: "18px" },
                                        { value: "20px", label: "20px" },
                                        { value: "24px", label: "24px" },
                                        { value: "28px", label: "28px" },
                                        { value: "32px", label: "32px" },
                                        { value: "40px", label: "40px" }
                                    ]
                                },

                                {
                                    key: "oldPriceSize",
                                    type: "select",
                                    label: "Tamaño del precio anterior",
                                    options: [
                                        { value: "12px", label: "12px" },
                                        { value: "14px", label: "14px" },
                                        { value: "16px", label: "16px" },
                                        { value: "18px", label: "18px" },
                                        { value: "20px", label: "20px" },
                                        { value: "24px", label: "24px" },
                                        { value: "28px", label: "28px" },
                                        { value: "32px", label: "32px" },
                                        { value: "40px", label: "40px" }
                                    ]
                                },

                                {
                                    key: "discountSize",
                                    type: "select",
                                    label: "Tamaño del descuento",
                                    options: [
                                        { value: "12px", label: "12px" },
                                        { value: "14px", label: "14px" },
                                        { value: "16px", label: "16px" },
                                        { value: "18px", label: "18px" },
                                        { value: "20px", label: "20px" },
                                        { value: "24px", label: "24px" },
                                        { value: "28px", label: "28px" },
                                        { value: "32px", label: "32px" },
                                        { value: "40px", label: "40px" }
                                    ]
                                }

                            ]
                        },

                        {
                            title: "Distribución",
                            icon: "layout",
                            fields: [

                                {
                                    key: "priceAlignment",
                                    type: "buttonGroup",
                                    label: "Alineación",
                                    options: alignmentOptions
                                }

                            ]
                        }

                    ]
                },
                {
                    id: "button",
                    label: "Botón",
                    icon: "button",
                    description: "Configurá el botón de cada producto.",
                    groups: [
                        {
                            title: "Contenido",
                            icon: "button",
                            fields: [

                                {
                                    key: "buttonText",
                                    type: "text",
                                    label: "Texto del botón"
                                },

                                {
                                    key: "buttonIcon",
                                    type: "checkbox",
                                    label: "Icono",
                                    checkboxLabel: "Mostrar icono"
                                },

                                {
                                    key: "buttonIconType",
                                    type: "select",
                                    label: "Icono",
                                    options: [
                                        {
                                            value: "arrow",
                                            label: "Flecha"
                                        },
                                        {
                                            value: "bag",
                                            label: "Bolsa"
                                        },
                                        {
                                            value: "cart",
                                            label: "Carrito"
                                        },
                                        {
                                            value: "eye",
                                            label: "Ver"
                                        }
                                    ]
                                },

                                {
                                    key: "buttonIconPosition",
                                    type: "buttonGroup",
                                    label: "Posición",
                                    options: [
                                        {
                                            value: "left",
                                            icon: "align_left",
                                            label: "Izquierda"
                                        },
                                        {
                                            value: "right",
                                            icon: "align_right",
                                            label: "Derecha"
                                        }
                                    ]
                                }

                            ]
                        },
                        {
                            title: "Apariencia",
                            icon: "palette",
                            fields: [
                                {
                                    key: "buttonBackgroundColor",
                                    type: "color",
                                    label: "Color de fondo"
                                },
                                {
                                    key: "buttonTextColor",
                                    type: "color",
                                    label: "Color del texto"
                                },
                                {
                                    key: "buttonBorderColor",
                                    type: "color",
                                    label: "Color del borde"
                                },
                                {
                                    key: "buttonBorderWidth",
                                    type: "select",
                                    label: "Borde",
                                    options: [
                                        { value: "0", label: "Sin borde" },
                                        { value: "1px", label: "Fino" },
                                        { value: "2px", label: "Normal" },
                                        { value: "3px", label: "Grueso" }
                                    ]
                                },
                                {
                                    key: "buttonPaddingY",
                                    type: "select",
                                    label: "Altura del Botón",
                                    options: [
                                        { value: "", label: "Por defecto" },
                                        { value: "6px", label: "Pequeño" },
                                        { value: "10px", label: "Normal" },
                                        { value: "14px", label: "Grande" }
                                    ]
                                },
                                {
                                    key: "buttonPaddingX",
                                    type: "select",
                                    label: "Ancho del Botón",
                                    options: [
                                        { value: "", label: "Por defecto" },
                                        { value: "10px", label: "Pequeño" },
                                        { value: "16px", label: "Normal" },
                                        { value: "24px", label: "Grande" }
                                    ]
                                },
                                {
                                    key: "buttonRadius",
                                    type: "select",
                                    label: "Redondeo",
                                    options: [
                                        { value: "0", label: "Recto" },
                                        { value: "5px", label: "5 px" },
                                        { value: "10px", label: "10 px" },
                                        { value: "20px", label: "20 px" },
                                        { value: "999px", label: "Píldora" }
                                    ]
                                },
                                {
                                    key: "buttonSize",
                                    type: "select",
                                    label: "Tamaño",
                                    options: [
                                        { value: "small", label: "Pequeño" },
                                        { value: "normal", label: "Normal" },
                                        { value: "large", label: "Grande" }
                                    ]
                                },
                                {
                                    key: "buttonFullWidth",
                                    type: "checkbox",
                                    label: "Ancho",
                                    checkboxLabel: "Usar ancho completo"
                                }
                            ]
                        }
                    ]
                }
                /* {
                    id: "layout",
                    label: "Distribución",
                    icon: "layout",
                    description: "Definí columnas y separación entre productos.",
                    groups: [
                        {
                            title: "Grilla",
                            icon: "layout",
                            fields: [
                                { key: "columnsDesktop", type: "number", label: "Columnas en computadora", min: 1, max: 6 },
                                { key: "columnsTablet", type: "number", label: "Columnas en tablet", min: 1, max: 4 },
                                { key: "columnsMobile", type: "number", label: "Columnas en celular", min: 1, max: 2 },
                                { key: "gapX", type: "select", label: "Separación horizontal", options: spacingOptions },
                                { key: "gapY", type: "select", label: "Separación vertical", options: spacingOptions }
                            ]
                        }
                    ]
                } */
            ],

            typography: ["title", "text", "meta"]
        })
    },

    store_help_bar: {
        type: "store_help_bar",
        name: "Ayuda y contacto",
        context: STORE_CONTEXT,
        category: "commerce",
        isSystem: false,

        defaultContent: {
            showTitle: true,
            title: "¿Necesitás ayuda para comprar?",

            showText: true,
            text: "Escribinos y te asesoramos antes de hacer tu pedido.",

            showButton: true,
            buttonText: "Consultar",

            cardBackgroundColor: "",
            cardBorder: true,
            cardBorderColor: "",
            cardRadius: "20px",
            cardShadow: "soft",
            cardPadding: "32px",

            buttonWidth: "180px",
            buttonBackgroundColor: "",
            buttonTextColor: "",
            buttonBorderColor: "",
            buttonBorderWidth: "",
            buttonRadius: "",
            buttonPaddingY: "",
            buttonPaddingX: "",

            buttonHoverBackgroundColor: "",
            buttonHoverTextColor: "",
            buttonHoverScale: ""
        },

        defaultStyles: {},

        defaultAnimation: {
            type: "fadeUp",
            duration: 500
        },

        editor: createEditorSchema({
            description: "Mostrá un acceso rápido para que el cliente pueda pedir ayuda o consultar antes de comprar.",

            contentGroups: [
                {
                    title: "Contenido",
                    icon: "text",
                    fields: [
                        { key: "showTitle", type: "checkbox", label: "Título", checkboxLabel: "Mostrar título", defaultValue: true },
                        { key: "title", type: "text", label: "Título" },
                        { key: "showText", type: "checkbox", label: "Texto", checkboxLabel: "Mostrar texto", defaultValue: true },
                        { key: "text", type: "textarea", label: "Texto" },
                        { key: "showButton", type: "checkbox", label: "Botón", checkboxLabel: "Mostrar botón", defaultValue: true },
                        { key: "buttonText", type: "text", label: "Texto del botón" }
                    ]
                }
            ],

            extraTabs: [
                {
                    id: "card",
                    label: "Tarjeta",
                    icon: "palette",
                    groups: [
                        {
                            title: "Apariencia",
                            icon: "palette",
                            fields: [
                                { key: "cardBackgroundColor", type: "color", label: "Color de fondo" },
                                { key: "cardBorder", type: "checkbox", label: "Borde", checkboxLabel: "Mostrar borde", defaultValue: true },
                                { key: "cardBorderColor", type: "color", label: "Color del borde" },
                                {
                                    key: "cardRadius",
                                    type: "select",
                                    label: "Redondeo",
                                    options: [
                                        { value: "0", label: "Recta" },
                                        { value: "5px", label: "5 px" },
                                        { value: "10px", label: "10 px" },
                                        { value: "20px", label: "20 px" }
                                    ]
                                },
                                {
                                    key: "cardShadow",
                                    type: "select",
                                    label: "Sombra",
                                    options: [
                                        { value: "none", label: "Sin sombra" },
                                        { value: "soft", label: "Suave" },
                                        { value: "medium", label: "Media" },
                                        { value: "strong", label: "Intensa" }
                                    ]
                                },
                                { key: "cardPadding", type: "select", label: "Espacio interno", options: paddingOptions }
                            ]
                        }
                    ]
                },
                {
                    id: "button",
                    label: "Botón",
                    icon: "button",
                    groups: [
                        {
                            title: "Apariencia",
                            icon: "palette",
                            fields: [
                                {
                                    key: "buttonWidth",
                                    type: "select",
                                    label: "Ancho del botón",
                                    options: [
                                        { value: "140px", label: "Chico" },
                                        { value: "180px", label: "Normal" },
                                        { value: "220px", label: "Grande" },
                                        { value: "100%", label: "Completo" }
                                    ]
                                },
                                { key: "buttonBackgroundColor", type: "color", label: "Color de fondo" },
                                { key: "buttonTextColor", type: "color", label: "Color del texto" },
                                { key: "buttonBorderColor", type: "color", label: "Color del borde" },
                                {
                                    key: "buttonBorderWidth",
                                    type: "select",
                                    label: "Borde",
                                    options: [
                                        { value: "0", label: "Sin borde" },
                                        { value: "1px", label: "Fino" },
                                        { value: "2px", label: "Normal" },
                                        { value: "3px", label: "Grueso" }
                                    ]
                                },
                                {
                                    key: "buttonRadius",
                                    type: "select",
                                    label: "Redondeo",
                                    options: [
                                        { value: "0", label: "Recto" },
                                        { value: "5px", label: "5 px" },
                                        { value: "10px", label: "10 px" },
                                        { value: "20px", label: "20 px" },
                                        { value: "999px", label: "Píldora" }
                                    ]
                                },
                                {
                                    key: "buttonPaddingY",
                                    type: "select",
                                    label: "Altura del botón",
                                    options: [
                                        { value: "6px", label: "Chico" },
                                        { value: "10px", label: "Normal" },
                                        { value: "14px", label: "Grande" }
                                    ]
                                },
                                {
                                    key: "buttonPaddingX",
                                    type: "select",
                                    label: "Espacio lateral del texto",
                                    options: [
                                        { value: "10px", label: "Chico" },
                                        { value: "16px", label: "Normal" },
                                        { value: "24px", label: "Grande" }
                                    ]
                                }
                            ]
                        },
                        {
                            title: "Hover",
                            icon: "palette",
                            fields: [
                                { key: "buttonHoverBackgroundColor", type: "color", label: "Color de fondo al pasar" },
                                { key: "buttonHoverTextColor", type: "color", label: "Color del texto al pasar" },
                                {
                                    key: "buttonHoverScale",
                                    type: "select",
                                    label: "Efecto al pasar",
                                    options: [
                                        { value: "none", label: "Sin efecto" },
                                        { value: "soft", label: "Suave" },
                                        { value: "normal", label: "Normal" }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],

            typography: ["title", "text"],
            animation: false
        })
    },

    store_footer: {
        type: "store_footer",
        name: "Pie de página",
        context: STORE_CONTEXT,
        category: "layout",
        isSystem: true,
        defaultContent: {
            showContact: true,
            showSocial: true,
            showLegal: true
        },
        defaultStyles: {},
        defaultAnimation: {
            type: "none"
        },
        editor: createEditorSchema({
            description: "Definí qué información aparece al final de la tienda.",
            contentGroups: [
                {
                    title: "Información visible",
                    description: "Mostrá datos útiles para cerrar confianza y contacto.",
                    icon: "fields",
                    fields: [
                        { key: "showContact", type: "checkbox", label: "Contacto", checkboxLabel: "Mostrar datos de contacto" },
                        { key: "showSocial", type: "checkbox", label: "Redes sociales", checkboxLabel: "Mostrar redes sociales" },
                        { key: "showLegal", type: "checkbox", label: "Información legal", checkboxLabel: "Mostrar información legal" }
                    ]
                }
            ],
            typography: ["title", "text", "meta"],
            animation: false
        })
    }

};

export function getStoreModuleDefinition(type) {
    return storeModuleDefinitions[type] || null;
}

export function getStoreModuleDefinitionsList() {
    return Object.values(storeModuleDefinitions);
}

export function getStoreModuleDefinitionsByCategory(category) {
    return Object.values(storeModuleDefinitions)
        .filter(module => module.category === category);
}