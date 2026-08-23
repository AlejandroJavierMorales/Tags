import { getDefaultQRPageTemplate } from "@/app/modules/qr-page/lib/defaultQRPageTemplate";

export function getDefaultDirectoryTemplate(business) {
    const template = getDefaultQRPageTemplate(business);
    return {
        ...template,
        page: {
            ...template.page,
            title: business.name,
            description: business.description || `Conocé más sobre ${business.name}`,
            logo_url: business.logo_url || null,
            cover_image_url: business.cover_url || null,
            whatsapp: business.whatsapp || business.phone || null,
            address: business.address || null,
            website_url: business.website_url || null,
            instagram_url: business.instagram_url || null,
            facebook_url: business.facebook_url || null,
            global_styles: {
                ...(template.page.global_styles || {}),
                backgroundColor: "#f4f8f5",
                textColor: "#173a2d",
                primaryColor: "#26734f",
                secondaryColor: "#e9f3ed",
                fontFamily: "Arial",
                borderRadius: "18px"
            },
            header_config: {
                isVisible: true,
                showCover: true,
                showLogo: true,
                showName: true,
                showLocation: true,
                showMenu: true,
                drawerDirection: "right",
                eyebrow: "",
                title: "",
                subtitle: ""
            },
            footer_config: {
                showFooter: true,
                showLogo: true,
                showBusinessName: true,
                showDescription: true,
                showContact: true,
                showSocialLinks: true,
                title: "",
                contactTitle: "Contacto",
                socialTitle: "Seguinos",
                text: ""
            }
        },
        sections: [
            {
                type: "content",
                title: "Presentación",
                sort_order: 1,
                settings_json: { directoryBaseSlot: "presentation" },
                styles_json: {},
                blocks: [{
                    type: "web_section",
                    sort_order: 1,
                    content_json: {
                        title: business.name,
                        eyebrow: "PRESENTACIÓN",
                        subtitle: "",
                        highlightedText: business.description || "",
                        paragraphs: [],
                        images: [],
                        imageLayout: "grid"
                    },
                    styles_json: {}
                }]
            },
            {
                type: "content",
                title: "Galería",
                sort_order: 2,
                settings_json: { directoryBaseSlot: "gallery" },
                styles_json: {},
                blocks: [{ type: "gallery", sort_order: 1, content_json: { eyebrow: "GALERÍA", title: `Conocé ${business.name}`, subtitle: "", images: [], maxImages: 8, imageLayout: "grid" }, styles_json: { alignment: "left" } }]
            },
            {
                type: "content",
                title: "Beneficios",
                sort_order: 3,
                settings_json: { directoryBaseSlot: "benefits" },
                styles_json: {},
                blocks: [{ type: "benefits", sort_order: 1, content_json: { eyebrow: "BENEFICIOS", title: "Beneficios para vos", subtitle: "Promociones vigentes de este negocio" }, styles_json: { alignment: "left" } }]
            },
            {
                type: "catalog",
                title: "Catálogo",
                sort_order: 4,
                settings_json: { directoryBaseSlot: "catalog" },
                styles_json: {},
                blocks: [{ type: "catalog", sort_order: 1, content_json: { eyebrow: "CATÁLOGO", title: "Productos y servicios", subtitle: "", highlightedText: "", paragraphs: [], searchPlaceholder: "Buscar por producto o categoría", allCategoriesLabel: "Todos" }, styles_json: { alignment: "left" } }]
            },
            {
                type: "content",
                title: "Contacto",
                sort_order: 5,
                settings_json: { directoryBaseSlot: "contact" },
                styles_json: {},
                blocks: [{ type: "contact_info", sort_order: 1, content_json: { eyebrow: "CONTACTO", title: "Hablemos", subtitle: "", showWhatsapp: true, showPhone: true, showEmail: true, showAddress: true, showWebsite: true, whatsappLabel: "WhatsApp", phoneLabel: "Teléfono", emailLabel: "Email", addressLabel: "Dirección", directionsAction: "Cómo llegar" }, styles_json: { alignment: "left" } }]
            }
        ]
    };
}
