export function getDefaultQRPageTemplate(business) {

    return {
        page: {
            title: business.name,
            description: `Conocé más sobre ${business.name}`,

            logo_url: null,
            cover_image_url: null,

            whatsapp: business.phone || null,
            email: business.email || null,
            phone: business.phone || null,
            address: null,

            instagram_url: null,
            facebook_url: null,
            tiktok_url: null,
            youtube_url: null,
            linkedin_url: null,
            website_url: null,

            global_styles: {
                backgroundColor: "#ffffff",
                textColor: "#111827",
                primaryColor: "#111827",
                secondaryColor: "#f3f4f6",
                fontFamily: "Arial",
                borderRadius: "14px",
                showFloatingWhatsapp: true,
                showBackToTop: true
            },

            header_config: {
                showLogo: true,
                showName: true,
                showMenu: true,
                sticky: true,
                backgroundColor: "#ffffff",
                textColor: "#111827",
                logoSize: 42,
                logoRadius: 10,
                logoFit: "contain"
            },

            footer_config: {
                showFooter: true,
                showBusinessName: true,
                showDescription: true,
                showContact: true,
                showSocialLinks: true,
                showCopyright: true,
                text: `Gracias por visitar ${business.name}.`,
                backgroundColor: "#111827",
                textColor: "#ffffff",
                linkColor: "#ffffff",
                alignment: "center"
            },

            theme_config: {
                template: "default",
                buttonStyle: "rounded",
                cardStyle: "soft",
                sectionSpacing: "normal"
            }
        },

        sections: [
            {
                type: "hero",
                title: "Presentación",
                sort_order: 1,
                settings_json: {},
                styles_json: {
                    alignment: "center"
                },
                blocks: [
                    {
                        type: "text",
                        sort_order: 1,
                        content_json: {
                            title: business.name,
                            text: `Bienvenido a la página oficial de ${business.name}.`
                        },
                        styles_json: {}
                    },
                    {
                        type: "whatsapp",
                        sort_order: 2,
                        content_json: {
                            label: "Contactar por WhatsApp",
                            phone: business.phone || "",
                            message: "Hola, quiero hacer una consulta."
                        },
                        styles_json: {}
                    }
                ]
            },
            {
                type: "social_links",
                title: "Redes sociales",
                sort_order: 2,
                settings_json: {},
                styles_json: {},
                blocks: []
            },
            {
                type: "catalog",
                title: "Catálogo",
                sort_order: 3,
                settings_json: {
                    layout: "grid"
                },
                styles_json: {},
                blocks: []
            }
        ]
    };
}