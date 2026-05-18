export const catalogue = [
    {
        category: "Carteles QR Acrílicos",
        items: [
            {
                id: "acr-12",
                name: "Acrílico 12x12cm con base o de colgar",
                description: "Cartel rígido ideal para mostradores o escritorios, vidrieras. Podés elegirlos con base, colgante y todos van con cinta doble faz para pegarlos donde quieras.",
                basePrice: 36000,
                images: [
                    "/assets/images/tags/productos/qr-acrilico-12x12-google-transparente-base.webp",
                    "/assets/images/tags/productos/qr-acrilico-12x12-instagram-blanco-base.webp",
                    "/assets/images/tags/productos/qr-acrilico-12x12-whatsapp-blanco-base.webp",
                    "/assets/images/tags/productos/qr-acrilico-12x12-menu-blanco-base.webp",
                    "/assets/images/tags/productos/qr-acrilico-12x12-whatsapp-blanco-colgar.webp",
                    "/assets/images/tags/productos/qr-acrilico-12x12-instagram-blanco-colgar.webp",
                    "/assets/images/tags/productos/qr-acrilico-12x12-google-blanco-colgar.webp",
                ],

                types: [
                    { code: "google_review", label: "Google Reviews" },
                    { code: "instagram", label: "Instagram" },
                    { code: "facebook", label: "Facebook" },
                    { code: "whatsapp", label: "WhatsApp" },
                    { code: "web", label: "Web" },
                    { code: "personalized", label: "Personalizado" },
                ],
                variants: {
                    material: [
                        { code: "blanco", label: "Blanco" },
                        { code: "transparente", label: "Transparente" }
                    ],
                    support: [
                        { code: "base", label: "Con base" },
                        { code: "colgante", label: "Para colgar" }
                    ]
                }

            },
            {
                id: "tarj-55-85",
                name: "Tarjeta Pvc 5.5x8.5cm de colgar",
                description: "Cartel rígido ideal para eventos, con porta tarjeta transparente y cinta de colgar",
                basePrice: 22000,
                images: [
                    "/assets/images/tags/productos/qr-acrilico-tarjeta-55x85-colgante-menu-whatsapp-instagram.webp",
                    "/assets/images/tags/productos/qr-acrilico-tarjeta-55x85-colgante-menu-restaurante.webp",
                    "/assets/images/tags/productos/qr-acrilico-tarjeta-55x85-colgante-whatsapp-instagram-google.webp",
                ],

                types: [
                    { code: "google_review", label: "Google Reviews" },
                    { code: "instagram", label: "Instagram" },
                    { code: "facebook", label: "Facebook" },
                    { code: "whatsapp", label: "WhatsApp" },
                    { code: "web", label: "Web" },
                    { code: "personalized", label: "Personalizado" },
                ]
            }
        ]
    },
    {
        category: "Carteles QR Autoadhesivos",
        items: [
            {
                id: "sticker-14-sv",
                name: "Sticker redondo 14cm sobre vidrio",
                description: "Ideal para vidrieras, mesas de restaurantes, escritorios",
                basePrice: 30000,
                images: [
                    "/assets/images/tags/productos/qr-autoadhesivo-14x14-general.webp",
                    "/assets/images/tags/productos/qr-autoadhesivo-14x14-google.webp",
                    "/assets/images/tags/productos/qr-autoadhesivo-bajovidrio-14x14-menu.webp",
                ],

                types: [
                    { code: "google_review", label: "Google Reviews" },
                    { code: "instagram", label: "Instagram" },
                    { code: "facebook", label: "Facebook" },
                    { code: "whatsapp", label: "WhatsApp" },
                    { code: "web", label: "Web" },
                    { code: "personalized", label: "Personalizado" },
                ]
            },
            {
                id: "sticker-14-bv",
                name: "Sticker redondo de 14cm bajo vidrio",
                description: "Ideal para vidrieras de comercios",
                basePrice: 30000,
                images: [
                    "/assets/images/tags/productos/qr-autoadhesivo-bajovidrio-14x14-whatsapp-instagram.webp",
                    "/assets/images/tags/productos/qr-autoadhesivo-bajovidrio-14x14-menu.webp",
                    "/assets/images/tags/productos/qr-autoadhesivo-14x14-general.webp",
                ],

                types: [
                    { code: "google_review", label: "Google Reviews" },
                    { code: "instagram", label: "Instagram" },
                    { code: "facebook", label: "Facebook" },
                    { code: "whatsapp", label: "WhatsApp" },
                    { code: "web", label: "Web" },
                    { code: "personalized", label: "Personalizado" },
                ]
            }
        ]
    },
    {
        category: "Carteles QR Digitales",
        items: [
            {
                id: "qr-digital-svg",
                name: "QR digital en formato svg",
                description: "QR digital en formato svg ideal para reimprimir en folletos, campañas de publicidad, llaveros o imanes NFC o el destino que vos elijas.",
                basePrice: 12000,
                images: [
                    "/assets/images/tags/productos/qr-digital-formato-svg-en-tu-telefono.webp",
                    "/assets/images/tags/productos/qr-digital-descargable-imprimible-formato-svg.webp",
                ],

                types: [
                    { code: "digital", label: "QR Digital" },
                    /* { code: "instagram", label: "Instagram" },
                    { code: "facebook", label: "Facebook" },
                    { code: "whatsapp", label: "WhatsApp" },
                    { code: "web", label: "Web" },
                    { code: "personalized", label: "Personalizado" }, */
                ]
            }
        ]
    }
];