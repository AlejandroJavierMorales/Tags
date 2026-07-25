// =====================================
// Archivo:
// /app/modules/resto/lib/restoModuleRegistry.js
//
// Descripción:
// Registro central de módulos públicos
// disponibles para el builder de Tags Resto.
//
// Vincula únicamente los componentes
// visuales actualmente existentes.
//
// Contexto:
// resto
// =====================================

import RestoTopbarBlock
    from "@/app/modules/resto/components/blocks/RestoTopbarBlock";

import RestoHeaderBlock
    from "@/app/modules/resto/components/blocks/RestoHeaderBlock";

import RestoHeroBlock
    from "@/app/modules/resto/components/blocks/RestoHeroBlock";

import RestoCategoriesBlock
    from "@/app/modules/resto/components/blocks/RestoCategoriesBlock";

import RestoMenuBlock
    from "@/app/modules/resto/components/blocks/RestoMenuBlock";

import RestoOrderStatusBlock
    from "@/app/modules/resto/components/blocks/RestoOrderStatusBlock";

import RestoServiceInfoBlock from "../components/blocks/RestoServiceInfoBlock";

import RestoActionsBlock
    from "@/app/modules/resto/components/blocks/RestoActionsBlock";

import RestoFooterBlock
    from "@/app/modules/resto/components/blocks/RestoFooterBlock";

import RestoReviewsCTA
    from "@/app/modules/resto/components/blocks/RestoReviewsCTA";

import RestoReviewsBlock
    from "@/app/modules/resto/components/blocks/RestoReviewsBlock";

const restoModules = {

    resto_topbar: {
        type: "resto_topbar",
        label: "Barra superior",
        category: "estructura",

        component:
            RestoTopbarBlock,

        defaultContent: {
            text:
                "Pedidos desde la mesa",
            showLocation:
                true,
            showSessionStatus:
                true
        },

        defaultStyles: {},

        defaultAnimation: {
            enabled: false,
            type: "none",
            duration: 400,
            delay: 0
        }
    },

    resto_header: {
        type: "resto_header",
        label: "Encabezado",
        category: "estructura",

        component:
            RestoHeaderBlock,

        defaultContent: {
            showLogo:
                true,
            showName:
                true,
            showDescription:
                true,
            showCart:
                true
        },

        defaultStyles: {},

        defaultAnimation: {
            enabled: false,
            type: "none",
            duration: 400,
            delay: 0
        }
    },

    resto_hero: {
        type: "resto_hero",
        label: "Portada",
        category: "contenido",

        component:
            RestoHeroBlock,

        defaultContent: {
            title:
                "Bienvenidos",
            subtitle:
                "Descubrí nuestra carta y realizá tu pedido.",
            showCover:
                true,
            showLocation:
                true
        },

        defaultStyles: {},

        defaultAnimation: {
            enabled: true,
            type: "fade-up",
            duration: 500,
            delay: 0
        }
    },

    resto_service_info: {
        type: "resto_service_info",
        label: "Información del servicio",
        category: "servicio",
        component:
            RestoServiceInfoBlock,
        defaultContent: {
            showLocation:
                true,
            showGuests:
                true,
            showSessionStatus:
                true,
            showPreparationMessage:
                true,
            preparationMessage:
                "Tu pedido será preparado luego de confirmarlo."
        },

        defaultStyles: {},

        defaultAnimation: {
            enabled: true,
            type: "fade-up",
            duration: 450,
            delay: 50
        }
    },

    resto_categories: {
        type: "resto_categories",
        label: "Categorías",
        category: "catalogo",

        component:
            RestoCategoriesBlock,

        defaultContent: {
            title:
                "Nuestra carta",
            showAllOption:
                true,
            allLabel:
                "Todo",
            sticky:
                false
        },

        defaultStyles: {},

        defaultAnimation: {
            enabled: true,
            type: "fade-up",
            duration: 450,
            delay: 50
        }
    },

    resto_featured_products: {
        type: "resto_featured_products",
        label: "Productos destacados",
        category: "catalogo",

        defaultContent: {
            title:
                "Recomendados",
            subtitle:
                "Los favoritos de nuestra carta.",
            limit:
                8,
            showDescription:
                true,
            showPrice:
                true
        },

        defaultStyles: {},

        defaultAnimation: {
            enabled: true,
            type: "fade-up",
            duration: 500,
            delay: 100
        }
    },

    resto_product_grid: {
        type: "resto_product_grid",
        label: "Carta de productos",
        category: "catalogo",

        component:
            RestoMenuBlock,

        defaultContent: {
            title:
                "Menú",
            subtitle:
                "Elegí tus productos y agregalos al pedido.",
            showSearch:
                true,
            showCategories:
                true,
            showDescription:
                true,
            showPrice:
                true,
            columnsDesktop:
                3,
            columnsTablet:
                2,
            columnsMobile:
                1
        },

        defaultStyles: {},

        defaultAnimation: {
            enabled: true,
            type: "fade-up",
            duration: 500,
            delay: 100
        }
    },

    resto_order_status: {
        type: "resto_order_status",
        label: "Estado del pedido",
        category: "pedidos",

        component:
            RestoOrderStatusBlock,

        defaultContent: {
            title:
                "Tu pedido",
            showCurrentOrder:
                true,
            showOrderHistory:
                true,
            showPreparationStatus:
                true
        },

        defaultStyles: {},

        defaultAnimation: {
            enabled: true,
            type: "fade-up",
            duration: 450,
            delay: 50
        }
    },
    resto_reviews_cta: {
        type: "resto_reviews_cta",
        label: "Invitación a reseñas",
        category: "reviews",

        component:
            RestoReviewsCTA,

        defaultContent: {},

        defaultStyles: {},

        defaultAnimation: {
            enabled: true,
            type: "fade-up",
            duration: 450,
            delay: 50
        }
    },
    resto_service_actions: {
        type: "resto_service_actions",
        label: "Acciones rápidas",
        category: "servicio",

        component:
            RestoActionsBlock,

        defaultContent: {

            title:
                "Acciones rápidas",

            showWhatsapp:
                true,

            whatsapp:
                "+54 9 351 555-1234",

            whatsappLabel:
                "WhatsApp",

            showPhone:
                true,

            phone:
                "+54 351 555-1234",

            phoneLabel:
                "Llamar",

            showEmail:
                true,

            email:
                "info@resto.com",

            emailLabel:
                "Email",

            showLocation:
                true,

            address:
                "Av. Principal 123",

            locationLabel:
                "Cómo llegar",

            showShare:
                true,

            shareLabel:
                "Compartir",

            showInstagram:
                true,

            instagram:
                "https://instagram.com/tags.qr",

            showFacebook:
                true,

            facebook:
                "https://facebook.com",

            showTikTok:
                true,

            tiktok:
                "https://tiktok.com",

            showX:
                true,

            x:
                "https://x.com"

        },

        defaultStyles: {},

        defaultAnimation: {
            enabled: true,
            type: "fade-up",
            duration: 450,
            delay: 50
        }
    },

    resto_trust_bar: {
        type: "resto_trust_bar",
        label: "Información destacada",
        category: "contenido",

        defaultContent: {
            items: [
                {
                    icon: "utensils",
                    title: "Pedido desde la mesa",
                    text: "Elegí y confirmá tu pedido."
                },
                {
                    icon: "clock",
                    title: "Seguimiento",
                    text: "Consultá el estado de preparación."
                },
                {
                    icon: "bell",
                    title: "Atención",
                    text: "Llamá al personal cuando lo necesites."
                }
            ]
        },

        defaultStyles: {},

        defaultAnimation: {
            enabled: true,
            type: "fade-up",
            duration: 500,
            delay: 100
        }
    },
    resto_reviews: {
        type: "resto_reviews",
        label: "Reseñas",
        category: "reviews",

        component:
            RestoReviewsBlock,

        defaultContent: {},

        defaultStyles: {},

        defaultAnimation: {
            enabled: true,
            type: "fade-up",
            duration: 450,
            delay: 50
        }
    },

    resto_footer: {
        type: "resto_footer",
        label: "Pie de página",
        category: "estructura",

        component:
            RestoFooterBlock,

        defaultContent: {

            showLogo:
                true,

            showName:
                true,

            showDescription:
                true,

            description:
                "Gracias por visitarnos. ¡Te esperamos nuevamente!",

            showAddress:
                true,

            address:
                "Av. Principal 123",

            showWhatsapp:
                true,

            whatsapp:
                "+54 9 351 555-1234",

            showPhone:
                true,

            phone:
                "+54 351 555-1234",

            showEmail:
                true,

            email:
                "info@resto.com",

            showInstagram:
                true,

            instagram:
                "https://instagram.com/tags.qr",

            showFacebook:
                true,

            facebook:
                "https://facebook.com",

            showTikTok:
                true,

            tiktok:
                "https://tiktok.com",

            showX:
                true,

            x:
                "https://x.com",

            showPoweredBy:
                true

        },

        defaultStyles: {},

        defaultAnimation: {
            enabled: false,
            type: "none",
            duration: 400,
            delay: 0
        }
    },

};

export function getRestoModule(
    blockType
) {

    if (!blockType) {
        return null;
    }

    return (
        restoModules[blockType] ||
        null
    );

}

export function getRestoModules() {

    return Object.values(
        restoModules
    );

}

export function getRestoModulesList() {

    return Object.values(
        restoModules
    );

}

export function getRestoModulesByCategory(
    category
) {

    return Object.values(
        restoModules
    ).filter(
        module =>
            module.category === category
    );

}

export function isRestoModule(
    blockType
) {

    return Boolean(
        restoModules[blockType]
    );

}

export {
    restoModules
};