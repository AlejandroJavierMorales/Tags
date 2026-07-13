// =====================================
// Archivo:
// /app/modules/store/lib/builder/storeBuilderSchema.js
//
// Descripción:
// Schema base de edición para módulos
// del Builder de Tags Store.
// =====================================

export const STORE_TYPOGRAPHY_PARTS = [
    { key: "title", label: "Título" },
    { key: "subtitle", label: "Subtítulo" },
    { key: "text", label: "Texto" },
    { key: "highlight", label: "Texto destacado" },
    { key: "button", label: "Botón" },
    { key: "price", label: "Precio" },
    { key: "oldPrice", label: "Precio anterior" },
    { key: "meta", label: "Meta / detalle" }
];

export const STORE_ANIMATION_TYPES = [
    { value: "none", label: "Sin animación" },
    { value: "fadeUp", label: "Fade arriba" },
    { value: "fadeDown", label: "Fade abajo" },
    { value: "zoomIn", label: "Zoom" },
    { value: "slideLeft", label: "Desde izquierda" },
    { value: "slideRight", label: "Desde derecha" }
];

export const STORE_ANIMATION_DURATION_OPTIONS = [
    { value: 300, label: "Rápida" },
    { value: 500, label: "Normal" },
    { value: 800, label: "Lenta" }
];

export const STORE_SPACING_OPTIONS = [
    { value: "0", label: "Sin separación" },
    { value: "12px", label: "Poca" },
    { value: "24px", label: "Media" },
    { value: "40px", label: "Mucha" }
];

export const STORE_PADDING_OPTIONS = [
    { value: "0", label: "Sin espacio interno" },
    { value: "12px", label: "Poco" },
    { value: "24px", label: "Medio" },
    { value: "40px", label: "Mucho" }
];

export const STORE_ALIGNMENT_OPTIONS = [
    { value: "left", label: "A la izquierda" },
    { value: "center", label: "Centrado" },
    { value: "right", label: "A la derecha" }
];

export const STORE_DEFAULT_VISIBILITY_GROUP = {
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
            type: "switch",
            label: "Mostrar en la tienda",
            checkboxLabel: "Sí, mostrar este bloque"
        }
    ]
};

function normalizeTypographyParts(typography = []) {
    return typography
        .map(part => {
            if (typeof part === "object" && part?.key) {
                return part;
            }

            return STORE_TYPOGRAPHY_PARTS.find(item =>
                item.key === part
            );
        })
        .filter(Boolean);
}

function createDefaultContentTab(content = []) {
    return {
        id: "content",
        label: "Contenido",
        icon: "content",
        description: "Editá los textos, opciones y datos visibles de este bloque.",
        groups: [
            STORE_DEFAULT_VISIBILITY_GROUP,
            {
                title: "Contenido visible",
                description: "Configurá la información que verá el cliente en esta sección.",
                icon: "fields",
                fields: content
            }
        ]
    };
}

function createDefaultDesignTab({
    layout = true,
    colors = true
} = {}) {
    const groups = [];

    if (layout) {
        groups.push({
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
                    options: STORE_ALIGNMENT_OPTIONS
                },
                {
                    key: "marginTop",
                    target: "styles",
                    type: "select",
                    label: "Separación superior",
                    emptyLabel: "Normal",
                    options: STORE_SPACING_OPTIONS
                },
                {
                    key: "marginBottom",
                    target: "styles",
                    type: "select",
                    label: "Separación inferior",
                    emptyLabel: "Normal",
                    options: STORE_SPACING_OPTIONS
                },
                {
                    key: "padding",
                    target: "styles",
                    type: "select",
                    label: "Espacio interno",
                    emptyLabel: "Normal",
                    options: STORE_PADDING_OPTIONS
                }
            ]
        });
    }

    if (colors) {
        groups.push({
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
        });
    }

    if (!groups.length) {
        return null;
    }

    return {
        id: "design",
        label: "Diseño",
        icon: "palette",
        description: "Ajustá presentación, colores y espaciado sin salir del sistema visual de la tienda.",
        groups
    };
}

function createDefaultTypographyTab(typography = []) {
    const parts =
        normalizeTypographyParts(typography);

    if (!parts.length) {
        return null;
    }

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
                        parts
                    }
                ]
            }
        ]
    };
}

function createDefaultButtonsTab(buttons = []) {
    if (!buttons.length) {
        return null;
    }

    return {
        id: "buttons",
        label: "Botones",
        icon: "button",
        description: "Configurá estilos puntuales para botones de este bloque.",
        groups: [
            {
                title: "Botones del bloque",
                description: "Estos ajustes aplican solo a los botones definidos por este módulo.",
                icon: "button",
                fields: buttons.map(button => ({
                    key: button,
                    target: "styles",
                    type: "buttonGroup",
                    label: button === "primary"
                        ? "Botón principal"
                        : button === "secondary"
                            ? "Botón secundario"
                            : button
                }))
            }
        ]
    };
}

function createDefaultAnimationTab(animation = true) {
    if (!animation) {
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
                        options: STORE_ANIMATION_TYPES
                    },
                    {
                        key: "duration",
                        target: "animation",
                        type: "select",
                        label: "Velocidad",
                        options: STORE_ANIMATION_DURATION_OPTIONS
                    }
                ]
            }
        ]
    };
}

function createDefaultAdvancedTab(advanced = true) {
    if (!advanced) {
        return null;
    }

    return null;
}

function normalizeCustomTabs(tabs = []) {
    return tabs
        .filter(Boolean)
        .map(tab => ({
            ...tab,
            groups: Array.isArray(tab.groups)
                ? tab.groups
                : []
        }));
}

export function createDefaultEditorSchema({
    tabs = null,
    content = [],
    typography = [],
    buttons = [],
    layout = true,
    colors = true,
    animation = true,
    advanced = true,
    description = ""
} = {}) {
    if (Array.isArray(tabs)) {
        return {
            description,
            tabs: normalizeCustomTabs(tabs)
        };
    }

    return {
        description,
        tabs: [
            createDefaultContentTab(content),
            createDefaultDesignTab({
                layout,
                colors
            }),
            createDefaultButtonsTab(buttons),
            createDefaultTypographyTab(typography),
            createDefaultAnimationTab(animation),
            createDefaultAdvancedTab(advanced)
        ].filter(Boolean)
    };
}