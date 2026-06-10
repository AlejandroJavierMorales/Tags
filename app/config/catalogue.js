export const catalogue = [
    {
        category: "Pproductos Físicos",
        type: "hardware",
        description: "Carteles, stickers, tarjetas y soportes físicos con QR dinámico.",
        items: [
            {
                id: "acr-12",
                productType: "hardware",
                name: "Acrílico 12x12cm",
                description: "Cartel rígido ideal para mostradores, escritorios, vidrieras o recepción.",
                basePrice: 36000,
                priceLabel: "$36.000",
                billingType: "one_time",
                images: [
                    "/assets/images/tags/productos/qr-acrilico-12x12-google-transparente-base.webp",
                    "/assets/images/tags/productos/qr-acrilico-12x12-instagram-blanco-base.webp",
                    "/assets/images/tags/productos/qr-acrilico-12x12-whatsapp-blanco-base.webp",
                    "/assets/images/tags/productos/qr-acrilico-12x12-menu-blanco-base.webp"
                ],
                types: [
                    { code: "google_review", label: "Google Reviews" },
                    { code: "instagram", label: "Instagram" },
                    { code: "facebook", label: "Facebook" },
                    { code: "whatsapp", label: "WhatsApp" },
                    { code: "web", label: "Web" },
                    { code: "personalized", label: "Personalizado" }
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
                productType: "hardware",
                name: "Tarjeta PVC 5.5x8.5cm",
                description: "Tarjeta rígida ideal para eventos, acreditaciones, credenciales o códigos colgantes.",
                basePrice: 22000,
                priceLabel: "$22.000",
                billingType: "one_time",
                images: [
                    "/assets/images/tags/productos/qr-acrilico-tarjeta-55x85-colgante-menu-whatsapp-instagram.webp",
                    "/assets/images/tags/productos/qr-acrilico-tarjeta-55x85-colgante-menu-restaurante.webp",
                    "/assets/images/tags/productos/qr-acrilico-tarjeta-55x85-colgante-whatsapp-instagram-google.webp"
                ],
                types: [
                    { code: "google_review", label: "Google Reviews" },
                    { code: "instagram", label: "Instagram" },
                    { code: "facebook", label: "Facebook" },
                    { code: "whatsapp", label: "WhatsApp" },
                    { code: "web", label: "Web" },
                    { code: "personalized", label: "Personalizado" }
                ]
            },
            {
                id: "sticker-14-sv",
                productType: "hardware",
                name: "Sticker redondo 14cm sobre vidrio",
                description: "Sticker premium para vidrieras, mesas, mostradores o puntos de atención.",
                basePrice: 22000,
                priceLabel: "$22.000",
                billingType: "one_time",
                images: [
                    "/assets/images/tags/productos/qr-autoadhesivo-14x14-general.webp",
                    "/assets/images/tags/productos/qr-autoadhesivo-14x14-google.webp",
                    "/assets/images/tags/productos/qr-autoadhesivo-bajovidrio-14x14-menu.webp"
                ],
                types: [
                    { code: "google_review", label: "Google Reviews" },
                    { code: "instagram", label: "Instagram" },
                    { code: "facebook", label: "Facebook" },
                    { code: "whatsapp", label: "WhatsApp" },
                    { code: "web", label: "Web" },
                    { code: "personalized", label: "Personalizado" }
                ]
            },
            {
                id: "qr-digital-svg",
                productType: "digital",
                name: "QR digital SVG",
                description: "QR digital descargable en formato SVG para imprimir, compartir o integrar en piezas gráficas.",
                basePrice: 12000,
                priceLabel: "$12.000",
                billingType: "one_time",
                images: [
                    "/assets/images/tags/productos/qr-digital-formato-svg-en-tu-telefono.webp",
                    "/assets/images/tags/productos/qr-digital-descargable-imprimible-formato-svg.webp"
                ],
                types: [
                    { code: "digital", label: "QR Digital" }
                ]
            },
            {
                id: "tags-id-addon",
                productType: "hardware",
                name: "Tags Id",
                description: "Tarjeta personal digital inteligente con QR, NFC, vCard y perfil profesional.",
                basePrice: 32000,
                priceLabel: "$32.000",
                billingType: "monthly",
                images: [
                    "/assets/images/tags-id/tags-id-tarjeta-personal-digital.webp",
                    "/assets/images/tags-id/tags-id-targeta-personal-digital.webp",
                    "/assets/images/tags-id/tags-id-portfolio-personal.webp",
                    "/assets/images/tags-id/tags-id-doctora-bioquimica.webp"
                ],
                types: [
                    { code: "tags_id", label: "Tags Id" }
                ],
                features: [
                    "Perfil profesional público",
                    "vCard descargable",
                    "Links y redes sociales",
                    "QR y NFC",
                    "SEO personal"
                ],
                href: "/tags-id"
            },
        ]
    },
    {
        category: "Software Tags",
        type: "software",
        description: "Productos digitales, páginas públicas, identidad digital, reseñas y eventos inteligentes.",
        items: [
            {
                id: "qr-page-addon",
                productType: "software",
                name: "QR-Page",
                description: "Landing page pública para productos, servicios, negocios, catálogos o campañas QR.",
                basePrice: 0,
                priceLabel: "Consultar",
                billingType: "monthly",
                images: [
                    "/assets/images/qr-page/tags-qr-page-catalogo-productos.webp",
                    "/assets/images/qr-page/tags-qr-page-lista-de-precios-pedidos.webp",
                    "/assets/images/qr-page/tags-qr-page-reserva-restaurante.webp"
                ],
                types: [
                    { code: "qr_page", label: "QR-Page" }
                ],
                features: [
                    "Página pública indexable",
                    "Templates editables",
                    "SEO y OpenGraph",
                    "Catálogo de productos o servicios",
                    "Analytics QR"
                ],
                href: "/qr-page"
            },
            {
                id: "tags-reviews-addon",
                productType: "software",
                name: "Tags Reviews",
                description: "Interfaz personalizable para captar reseñas e inducir clientes satisfechos hacia Google Reviews.",
                basePrice: 0,
                priceLabel: "Consultar",
                billingType: "monthly",
                images: [
                    "/assets/images/tags-reviews/tags-reviews-vidriera.webp",
                    "/assets/images/tags-reviews/tags-reviews-software.webp",
                    "/assets/images/tags-reviews/tags-reviews-hotel.webp",
                    "/assets/images/tags-reviews/tags-reviews-dark.webp"
                ],
                types: [
                    { code: "tags_reviews", label: "Tags Reviews" }
                ],
                features: [
                    "Captación de reseñas",
                    "Filtro de experiencia",
                    "Página indexable",
                    "CTA a Google Reviews",
                    "Diseño personalizable"
                ],
                href: "/tags-reviews"
            },
            {
                id: "events-addon",
                productType: "software",
                name: "Tags eEvents",
                description: "Sistema de gestión de eventos inteligentes con invitaciones, invitados, confirmaciones y checkin QR, mesas, menú, música, todo!.",
                basePrice: 0,
                priceLabel: "Consultar",
                billingType: "project",
                images: [
                    "/assets/images/e-events/tags-e-events-preevento.webp",
                    "/assets/images/e-events/tags-e-events-checkin.webp",
                    "/assets/images/e-events/tags-e-events-social-media.webp",
                    "/assets/images/e-events/tags-e-events-post.webp"
                ],
                types: [
                    { code: "e_events", label: "eEvents" }
                ],
                features: [
                    "Invitaciones digitales",
                    "Confirmaciones y acompañantes",
                    "Checkin QR",
                    "Restricciones alimentarias",
                    "Cronograma y menú"
                ],
                href: "/e-events"
            }
        ]
    },
    {
        category: "Adicionales",
        type: "addon",
        description: "Extensiones para personalizar, escalar y profesionalizar cada experiencia Tags.",
        items: [
            {
                id: "custom-domain",
                productType: "addon",
                name: "Dominio Propio",
                description: "Conectá tu QR-Page, Tags Id o Reviews a un dominio propio. TuNegocio.com.ar",
                basePrice: 0,
                priceLabel: "Consultar",
                billingType: "monthly",
                images: [
                    "/assets/images/addons/tags-dominio-propio.webp"
                ],
                types: [
                    { code: "custom_domain", label: "Dominio propio" }
                ],
                features: [
                    "Dominio propio",
                    "Configuración DNS",
                    "Marca profesional",
                    "SEO avanzado"
                ]
            },
            {
                id: "custom-subdomain",
                productType: "addon",
                name: "Subdominio Personalizado",
                description: "Publicá páginas Tags bajo un subdominio personalizado de tu marca. TuMarca.Tags.com.ar",
                basePrice: 0,
                priceLabel: "Consultar",
                billingType: "monthly",
                images: [
                    "/assets/images/addons/tags-subdominio.webp"
                ],
                types: [
                    { code: "custom_subdomain", label: "Subdominio propio" }
                ],
                features: [
                    "Subdominio personalizado",
                    "Ideal para agencias",
                    "Marca blanca parcial",
                    "SEO y tracking"
                ]
            }
        ]
    }
];