// app/config/configSite.js

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL_PROD
  || "http://localhost:3000";

export const tagsSiteConfig = {



  // =====================================================
  // SITE
  // =====================================================

  site: {

    name:
      "Tags",

    shortName:
      "Tags",

    url:
      BASE_URL,

    language:
      "es-AR",

    locale:
      "es_AR",

    description:
      "Plataforma de experiencias digitales inteligentes con QR dinámicos, landing pages, tarjetas digitales, reseñas Google y gestión de eventos.",

  },

  // =====================================================
  // ORGANIZATION
  // =====================================================

  organization: {

    name:
      "Tags",

    url:
      BASE_URL,

    logo:
      `${BASE_URL}/logo_tags_transparente.webp`,

    parentOrganization: {

      name:
        "CalamuchitaR",

      url:
        "https://www.calamuchitar.com",
    },
  },

  // =====================================================
  // CONTACT
  // =====================================================

  contact: {

    name:
      "Tags",

    email:
      "info@tags.com.ar",

    phone:
      "+543546562855",

    web:
      "https://tags.com.ar",

    address:
      "Los Reartes, Valle de Calamuchita, Córdoba, Argentina",

    streetAddress:
      "Villa General Belgrano",

    city:
      "Villa General Belgrano",

    region:
      "Córdoba",

    postalCode:
      "5194",

    country:
      "AR",

    latitude:
      "-31.9754",

    longitude:
      "-64.5554",
  },

  // =====================================================
  // SOCIAL
  // =====================================================

  social: {

    instagram:
      "https://instagram.com/tags.qr",

    instagram_calamuchitar:
      "https://instagram.com/calamuchitar",
  },

  // =====================================================
  // SEO
  // =====================================================

  seo: {

    keywords: [

      // CORE
      "QR dinámico",
      "QR inteligente",
      "códigos QR",
      "QR editable",
      "QR con estadísticas",
      "QR con analytics",

      // QR PAGE
      "QR Page",
      "landing page QR",
      "micrositio QR",
      "catálogo QR",
      "menú QR",

      // TAGS ID
      "tarjeta digital",
      "tarjeta NFC",
      "business card digital",
      "perfil digital",

      // REVIEWS
      "Google Reviews",
      "QR reseñas Google",
      "captar reseñas",
      "aumentar reviews Google",

      // EVENTS
      "invitaciones digitales",
      "checkin QR",
      "gestión de eventos",
      "eventos inteligentes",

      // BUSINESS
      "QR para negocios",
      "QR para restaurantes",
      "QR para hoteles",
      "QR para turismo",

      // NFC
      "NFC",
      "tarjetas NFC",
      "cartelería inteligente",
    ],
  },

  // =====================================================
  // PLATFORM
  // =====================================================

  platform: {

    name:
      "Tags Platform",

    applicationCategory:
      "BusinessApplication",

    operatingSystem:
      "Web",

    description:
      "Plataforma SaaS para gestión de QR inteligentes, landing pages, tarjetas digitales, captación de reseñas y eventos inteligentes.",

    features: [

      "QR dinámicos editables",
      "Analytics QR",
      "Landing Pages QR",
      "Tags Id",
      "Google Reviews",
      "Invitaciones digitales",
      "Checkin QR",
      "Eventos inteligentes",
      "NFC",
      "Catálogo digital",
      "QR WhatsApp",
      "QR Instagram",
      "QR Google Maps",
      "QR personalizados",
    ],

    offers: {

      price:
        "0",

      priceCurrency:
        "ARS",
    },
  },

  // =====================================================
  // PRODUCTS
  // =====================================================

  products: [

    {
      id:
        "qr-dinamicos",

      name:
        "QR Inteligentes",

      description:
        "QR dinámicos editables con estadísticas, analytics y gestión en tiempo real.",

      price:
        "0",

      currency:
        "ARS",
    },

    {
      id:
        "qr-page",

      name:
        "QR-Page",

      description:
        "Landing pages inteligentes optimizadas para QR, productos, servicios y negocios.",

      price:
        "0",

      currency:
        "ARS",
    },

    {
      id:
        "tags-id",

      name:
        "Tags Id",

      description:
        "Tarjetas digitales inteligentes con QR y NFC para profesionales y negocios.",

      price:
        "0",

      currency:
        "ARS",
    },

    {
      id:
        "tags-reviews",

      name:
        "Tags Reviews",

      description:
        "Sistema inteligente para captar, gestionar e inducir reseñas Google.",

      price:
        "0",

      currency:
        "ARS",
    },

    {
      id:
        "e-events",

      name:
        "Tags eEvents",

      description:
        "Plataforma para eventos inteligentes con invitados, QR, checkin y cronogramas.",

      price:
        "0",

      currency:
        "ARS",
    },
  ],

  // =====================================================
  // SERVICES
  // =====================================================

  services: [

    {
      name:
        "QR Inteligentes",

      description:
        "Códigos QR dinámicos editables con estadísticas y seguimiento en tiempo real.",
    },

    {
      name:
        "QR Landing Pages",

      description:
        "Páginas públicas optimizadas para campañas, negocios, catálogos y productos.",
    },

    {
      name:
        "Tags Id",

      description:
        "Tarjetas digitales inteligentes con QR, NFC y perfil profesional.",
    },

    {
      name:
        "Google Reviews",

      description:
        "Captación inteligente de reseñas y reputación online.",
    },

    {
      name:
        "Eventos Inteligentes",

      description:
        "Gestión de invitados, checkin, menú, cronograma y experiencia digital del evento.",
    },
  ],

  // =====================================================
  // FAQS
  // =====================================================

  faqs: {

    tags: [

      {
        question:
          "¿Qué es Tags?",

        answer:
          "Tags es una plataforma de experiencias digitales inteligentes basada en QR dinámicos, landing pages, tarjetas digitales, reseñas Google y eventos inteligentes.",
      },

      {
        question:
          "¿Los QR son editables?",

        answer:
          "Sí. Todos los QR dinámicos pueden editarse, pausarse, reactivarse y reutilizarse en tiempo real.",
      },

      {
        question:
          "¿Puedo ver estadísticas de escaneo?",

        answer:
          "Sí. Podés visualizar horarios, ciudades, dispositivos, navegadores y comportamiento de los usuarios.",
      },

      {
        question:
          "¿Qué es QR-Page?",

        answer:
          "QR-Page permite crear landing pages inteligentes optimizadas para productos, negocios, servicios o campañas.",
      },

      {
        question:
          "¿Qué es Tags Id?",

        answer:
          "Tags Id es una tarjeta digital inteligente con QR y NFC para compartir información personal y profesional.",
      },

      {
        question:
          "¿Qué es Tags Reviews?",

        answer:
          "Es una interfaz optimizada para captar reseñas Google y mejorar la reputación online de negocios.",
      },

      {
        question:
          "¿Qué es eEvents?",

        answer:
          "Es una plataforma de eventos inteligentes con invitados, QR, checkin, confirmaciones y herramientas interactivas.",
      },
    ],
    products: [
      {
        question:
          "¿Qué puedo comprar en la tienda Tags?",

        answer:
          "Podés consultar productos físicos como carteles QR, stickers, tarjetas y soluciones NFC, además de productos digitales, adicionales y software como QR-Page, Tags Id, Tags Reviews, eEvents y dominios personalizados.",
      },
      {
        question:
          "¿Los productos físicos incluyen QR dinámico?",

        answer:
          "Sí. Los productos físicos pueden vincularse a QR dinámicos editables desde la plataforma Tags.",
      },
      {
        question:
          "¿Puedo contratar software o funciones adicionales desde la tienda?",

        answer:
          "Sí. La tienda está preparada para consultar soluciones digitales como QR-Page, Tags Id, Tags Reviews, eEvents, Custom Domain y Custom Subdomain.",
      },
      {
        question:
          "¿Los QR se pueden modificar después de impresos?",

        answer:
          "Sí. Al trabajar con QR dinámicos, podés modificar destinos, pausar o reutilizar códigos sin volver a imprimir.",
      },
      {
        question:
          "¿Hacen productos personalizados?",

        answer:
          "Sí. Los productos pueden adaptarse a la identidad visual de cada negocio, marca o evento.",
      },
      {
        question:
          "¿La tienda tendrá carrito y pagos online?",

        answer:
          "Sí. La estructura está preparada para incorporar carrito avanzado, checkout, pagos online, suscripciones y funcionalidades adicionales.",
      },
    ],
  },

  // =====================================================
  // BREADCRUMBS
  // =====================================================

  breadcrumbsBase: [
    {
      name:
        "Inicio",

      url:
        BASE_URL,
    },
  ],
};