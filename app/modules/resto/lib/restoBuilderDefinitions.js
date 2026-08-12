import { createDefaultEditorSchema } from "@/app/modules/store/lib/builder/storeBuilderSchema";

const bool = (key, label, checkboxLabel = "Mostrar") => ({ key, type: "checkbox", label, checkboxLabel });
const text = (key, label, extra = {}) => ({ key, type: "text", label, ...extra });
const area = (key, label, extra = {}) => ({ key, type: "textarea", label, ...extra });
const color = (key, label) => ({ key, target: "styles", type: "color", label });
const select = (key, label, options, extra = {}) => ({ key, type: "select", label, options, ...extra });
const image = (key = "imageUrl", label = "Imagen") => ({
    key,
    type: "image",
    label,
    module: "resto",
    variant: "builder",
    uploadLabel: `Subir ${label.toLowerCase()}`,
    storagePathKey: `${key}StoragePath`
});

const commonDesign = {
    layout: true,
    colors: true
};

const typography = ["title", "subtitle", "text", "button", "meta"];

function schema(description, content, options = {}) {
    const editor = createDefaultEditorSchema({
        description,
        content,
        typography: options.typography === false ? [] : typography,
        animation: options.animation !== false,
        ...commonDesign,
        ...options
    });

    if (options.imageTab) {
        editor.tabs.splice(1, 0, options.imageTab);
    }

    return editor;
}

const alignOptions = [
    { value: "left", label: "Izquierda" },
    { value: "center", label: "Centro" },
    { value: "right", label: "Derecha" }
];

const imageFitOptions = [
    { value: "cover", label: "Cubrir el área" },
    { value: "contain", label: "Mostrar completa" }
];

const imagePositionOptions = [
    { value: "left", label: "Izquierda" },
    { value: "center", label: "Centro" },
    { value: "right", label: "Derecha" }
];

export const RESTO_BUILDER_DEFINITIONS = {
    resto_topbar: schema("Configurá la barra informativa superior del restaurante.", [
        text("text", "Texto de la barra"),
        bool("showLocation", "Ubicación de la mesa", "Mostrar ubicación"),
        bool("showSessionStatus", "Estado de la sesión", "Mostrar estado")
    ]),

    resto_header: schema("Configurá la identidad, estado y búsqueda de la carta.", [
        bool("showLogo", "Logo", "Mostrar logo"),
        bool("showName", "Nombre del restaurante", "Mostrar nombre"),
        bool("showDescription", "Descripción", "Mostrar descripción"),
        bool("showStatus", "Estado del servicio", "Mostrar estado"),
        bool("showSearch", "Buscador", "Mostrar buscador"),
        text("searchPlaceholder", "Texto del buscador", { defaultValue: "Buscar en la carta" }),
        text("openLabel", "Texto cuando está abierto", { defaultValue: "Abierto" }),
        text("closedLabel", "Texto cuando está cerrado", { defaultValue: "Cerrado" })
    ]),

    resto_hero: schema("Diseñá la portada principal y el primer llamado a la carta.", [
        text("title", "Título principal"),
        area("subtitle", "Texto de presentación"),
        bool("showCover", "Imagen de portada", "Mostrar portada"),
        bool("showLogo", "Logo", "Mostrar logo"),
        bool("showTitle", "Título", "Mostrar título"),
        bool("showSubtitle", "Subtítulo", "Mostrar subtítulo"),
        bool("showStatus", "Estado del servicio", "Mostrar estado"),
        bool("showButton", "Botón de carta", "Mostrar botón"),
        text("buttonLabel", "Texto del botón", { defaultValue: "Ver carta" }),
        text("openLabel", "Texto abierto", { defaultValue: "Abierto" }),
        text("closedLabel", "Texto cerrado", { defaultValue: "Cerrado" })
    ], {
        imageTab: {
            id: "image",
            label: "Imagen",
            icon: "image",
            groups: [{
                title: "Portada",
                description: "Subí una imagen propia y controlá cómo se encuadra.",
                fields: [
                    image(),
                    select("imageFit", "Ajuste de imagen", imageFitOptions),
                    select("imagePositionX", "Posición horizontal", imagePositionOptions),
                    select("imagePositionY", "Posición vertical", imagePositionOptions),
                    select("heroHeight", "Altura de portada", [
                        { value: "small", label: "Compacta" },
                        { value: "medium", label: "Normal" },
                        { value: "large", label: "Grande" },
                        { value: "full", label: "Pantalla amplia" }
                    ]),
                    { key: "overlayOpacity", type: "slider", label: "Oscurecimiento", min: 0, max: 90, step: 5, suffix: "%" }
                ]
            }]
        }
    }),

    resto_service_info: schema("Mostrá horarios, medios de atención, pagos y datos del local.", [
        text("title", "Título"), area("subtitle", "Descripción"),
        bool("showStatus", "Estado del servicio", "Mostrar estado"),
        bool("showHours", "Horarios", "Mostrar horarios"),
        bool("showServiceModes", "Modalidades", "Mostrar modalidades"),
        bool("showPayments", "Medios de pago", "Mostrar pagos"),
        bool("showFeatures", "Características", "Mostrar características"),
        bool("showAddress", "Dirección", "Mostrar dirección"),
        text("openLabel", "Texto abierto"), text("closedLabel", "Texto cerrado"),
        text("hoursLabel", "Etiqueta de horarios"), text("contactLabel", "Etiqueta de contacto"),
        text("tableLabel", "Etiqueta de mesa"), area("tableDescription", "Descripción de mesa"),
        text("deliveryLabel", "Etiqueta de delivery"), area("deliveryDescription", "Descripción de delivery"),
        text("takeawayLabel", "Etiqueta de take away"), area("takeawayDescription", "Descripción de take away"),
        text("paymentsLabel", "Etiqueta de pagos"), text("featuresLabel", "Etiqueta de características"),
        text("addressLabel", "Etiqueta de dirección")
    ]),

    resto_categories: schema("Configurá el selector de categorías de la carta.", [
        text("title", "Título"), bool("showAllOption", "Opción todas", "Mostrar opción todas"),
        text("allLabel", "Texto de todas"), text("backLabel", "Texto volver"),
        bool("sticky", "Selector fijo", "Mantener visible al desplazarse")
    ]),

    resto_product_grid: schema("Configurá la carta, sus textos y la distribución de productos.", [
        text("title", "Título"), area("subtitle", "Descripción"),
        bool("showSearch", "Buscador", "Mostrar buscador"),
        bool("showCategories", "Categorías", "Mostrar categorías"),
        bool("showDescription", "Descripción de productos", "Mostrar descripción"),
        bool("showPrice", "Precios", "Mostrar precios"),
        select("columnsDesktop", "Columnas en escritorio", [{ value: 2, label: "2" }, { value: 3, label: "3" }, { value: 4, label: "4" }]),
        select("columnsTablet", "Columnas en tablet", [{ value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }]),
        select("columnsMobile", "Columnas en celular", [{ value: 1, label: "1" }, { value: 2, label: "2" }])
    ]),

    resto_featured_products: schema("Mostrá una selección de productos destacados en la página pública.", [
        text("title", "Título"), area("subtitle", "Descripción"),
        select("mode", "Tipo de colección", [
            { value: "featured", label: "Destacados" },
            { value: "offer", label: "Ofertas" },
            { value: "recommended", label: "Recomendados" },
            { value: "new", label: "Novedades" }
        ]),
        { key: "limit", type: "number", label: "Cantidad máxima de productos", min: 1, max: 24 },
        bool("showDescription", "Descripción de productos", "Mostrar descripción"),
        bool("showPrice", "Precios", "Mostrar precios")
    ]),

    resto_trust_bar: schema("Mostrá beneficios o información destacada del restaurante.", [
        {
            key: "items",
            type: "repeater",
            label: "Beneficios",
            addLabel: "Agregar beneficio",
            itemFields: [
                { key: "title", type: "text", label: "Título" },
                { key: "text", type: "textarea", label: "Descripción" }
            ]
        }
    ]),

    resto_order_status: schema("Definí qué información ve el cliente sobre su pedido.", [
        text("title", "Título"), bool("showOrderNumber", "Número de pedido", "Mostrar número"),
        bool("showPreparationStatus", "Estado de preparación", "Mostrar estado"),
        bool("showEstimatedTime", "Tiempo estimado", "Mostrar tiempo"),
        bool("showItemsCount", "Cantidad de productos", "Mostrar cantidad"),
        bool("showTotal", "Total", "Mostrar total"), bool("showProgress", "Progreso", "Mostrar progreso")
    ]),

    resto_service_actions: schema("Configurá los accesos de contacto, ubicación y redes sociales.", [
        text("title", "Título"), bool("showTitle", "Título", "Mostrar título"), bool("showLabels", "Etiquetas", "Mostrar etiquetas"),
        bool("showWhatsapp", "WhatsApp", "Mostrar WhatsApp"), text("whatsappLabel", "Texto WhatsApp"), text("whatsapp", "Número WhatsApp"),
        bool("showPhone", "Teléfono", "Mostrar teléfono"), text("phoneLabel", "Texto teléfono"), text("phone", "Número teléfono"),
        bool("showLocation", "Ubicación", "Mostrar ubicación"), text("locationLabel", "Texto ubicación"), area("address", "Dirección"),
        bool("showEmail", "Email", "Mostrar email"), text("emailLabel", "Texto email"), text("email", "Email"),
        bool("showShare", "Compartir", "Mostrar compartir"), text("shareLabel", "Texto compartir"),
        bool("showInstagram", "Instagram", "Mostrar Instagram"), text("instagram", "URL Instagram"),
        bool("showFacebook", "Facebook", "Mostrar Facebook"), text("facebook", "URL Facebook"),
        bool("showTikTok", "TikTok", "Mostrar TikTok"), text("tiktok", "URL TikTok"),
        bool("showX", "X", "Mostrar X"), text("x", "URL X")
    ]),

    resto_reviews_cta: schema("Configurá la invitación para que tus clientes dejen una reseña.", [
        text("title", "Título"), area("subtitle", "Descripción"), text("buttonLabel", "Texto del botón")
    ]),

    resto_reviews: schema("Configurá la presentación de las reseñas del restaurante.", [
        text("title", "Título"), area("subtitle", "Descripción"),
        bool("showSummary", "Resumen", "Mostrar resumen"), bool("showNavigation", "Navegación", "Mostrar navegación")
    ]),

    resto_footer: schema("Configurá la identidad, contacto y redes del pie de página.", [
        bool("showLogo", "Logo", "Mostrar logo"), bool("showName", "Nombre", "Mostrar nombre"),
        bool("showDescription", "Descripción", "Mostrar descripción"), area("description", "Descripción personalizada"),
        bool("showAddress", "Dirección", "Mostrar dirección"), text("address", "Dirección"),
        bool("showPhone", "Teléfono", "Mostrar teléfono"), text("phone", "Teléfono"),
        bool("showWhatsapp", "WhatsApp", "Mostrar WhatsApp"), text("whatsapp", "WhatsApp"),
        bool("showEmail", "Email", "Mostrar email"), text("email", "Email"),
        bool("showInstagram", "Instagram", "Mostrar Instagram"), text("instagram", "URL Instagram"),
        bool("showFacebook", "Facebook", "Mostrar Facebook"), text("facebook", "URL Facebook"),
        bool("showTikTok", "TikTok", "Mostrar TikTok"), text("tiktok", "URL TikTok"),
        bool("showX", "X", "Mostrar X"), text("x", "URL X"), bool("showPoweredBy", "Marca Tags", "Mostrar marca Tags")
    ])
};

export function getRestoBuilderDefinition(blockType) {
    return RESTO_BUILDER_DEFINITIONS[blockType] || null;
}
