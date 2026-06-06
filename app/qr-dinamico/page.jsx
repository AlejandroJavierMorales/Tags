import "@/app/styles/tags_landing.css";


import {
    getOrganizationSchema,
    getWebsiteSchema,
    getLocalBusinessSchema,
    getSoftwareSchema,
    getFAQSchema,
    getBreadcrumbSchema
} from "@/app/lib/seo";
import Header from "../components/landing/Header";
import WhatsAppFloat from "../components/WhatsAppFloat";
import FAQs from "../components/landing/FAQs";
import { tagsSiteConfig } from "../config/configSite";
import Link from "next/link";
import Image from "next/image";
import TagsFooter from "../components/landing/Footer";

export const metadata = {

    metadataBase:
        new URL(tagsSiteConfig.site.url),

    title:
        "QR Inteligente con Estadísticas y Seguimiento en Tiempo Real | Tags",

    description:
        "Creá códigos QR inteligentes y dinámicos con estadísticas, analytics, seguimiento de escaneos, edición sin reimpresión y métricas en tiempo real para marketing y negocios.",

    keywords: [
        "qr inteligente",
        "qr dinámico",
        "codigo qr",
        "qr con estadísticas",
        "qr editable",
        "qr marketing",
        "qr whatsapp",
        "google reviews qr",
        "menu qr",
        "analytics qr",
        "tracking qr",
        "qr para negocios",
        "qr para restaurantes",
        "qr para hoteles",
        ...tagsSiteConfig.seo.keywords
    ],
    
    category: "technology",

    alternates: {
        canonical:
            "/qr-inteligente"
    },

    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1
        }
    },

    openGraph: {

        title:
            "QR Inteligente con Estadísticas | Tags",

        description:
            "QR dinámicos con analytics, seguimiento, métricas y estadísticas en tiempo real.",

        url:
            `${tagsSiteConfig.site.url}/qr-inteligente`,

        siteName:
            "Tags",

        locale:
            "es_AR",

        type:
            "website",

        images: [
            {
                url:
                    "/assets/images/tags/qr-inteligente.jpg",

                width: 1200,

                height: 630,

                alt:
                    "QR Inteligente con estadísticas y seguimiento"
            }
        ],
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                "max-image-preview": "large",
                "max-snippet": -1,
                "max-video-preview": -1
            }
        }
    },

    twitter: {

        card:
            "summary_large_image",

        title:
            "QR Inteligente con Estadísticas | Tags",

        description:
            "QR dinámicos con estadísticas, analytics y seguimiento de escaneos.",

        images: [
            "/assets/images/tags/qr-estadisticas.webp"
        ]
    }
};

export default function Page() {

    const BASE_URL =
        tagsSiteConfig.site.url;

    const PAGE_URL =
        `${BASE_URL}/qr-inteligente`;

    const IMAGE_URL =
        `${BASE_URL}/assets/images/tags/qr-estadisticas.webp`;

    // =====================================================
    // WEBPAGE
    // =====================================================

    const webPageSchema = {

        "@context":
            "https://schema.org",

        "@type":
            "WebPage",

        "@id":
            `${PAGE_URL}/#webpage`,

        url:
            PAGE_URL,

        name:
            "QR Inteligente con Estadísticas | Tags",

        description:
            "Plataforma de QR inteligentes con analytics, seguimiento y estadísticas en tiempo real.",

        inLanguage:
            "es-AR",

        isPartOf: {
            "@id":
                `${BASE_URL}/#website`
        },

        about: {
            "@id":
                `${BASE_URL}/#organization`
        },

        primaryImageOfPage: {

            "@type":
                "ImageObject",

            url:
                IMAGE_URL
        },

        breadcrumb: {
            "@id":
                `${PAGE_URL}/#breadcrumb`
        },

        mainEntity: {
            "@id":
                `${PAGE_URL}/#service`
        }
    };

    // =====================================================
    // SERVICE
    // =====================================================

    const qrServiceSchema = {

        "@context":
            "https://schema.org",

        "@type":
            "Service",

        "@id":
            `${PAGE_URL}/#service`,

        name:
            "QR Inteligente con Estadísticas",

        description:
            "Servicio de códigos QR dinámicos con estadísticas, analytics, seguimiento de escaneos y edición sin reimpresión.",

        provider: {
            "@id":
                `${BASE_URL}/#organization`
        },

        areaServed: {

            "@type":
                "Country",

            name:
                "Argentina"
        },

        serviceType: [
            "QR Dinámico",
            "QR Inteligente",
            "QR con Analytics",
            "QR Marketing",
            "QR para Negocios"
        ],

        isRelatedTo: {
            "@id":
                `${PAGE_URL}/#software`
        },

        mainEntityOfPage: {
            "@id":
                `${PAGE_URL}/#webpage`
        }
    };

    // =====================================================
    // SOFTWARE APPLICATION
    // =====================================================

    const softwareSchema = {

        "@context":
            "https://schema.org",

        "@type":
            "SoftwareApplication",

        "@id":
            `${PAGE_URL}/#software`,

        name:
            "Tags QR Platform",

        applicationCategory:
            "BusinessApplication",

        operatingSystem:
            "Web",

        url:
            PAGE_URL,

        image:
            IMAGE_URL,

        description:
            "Sistema de generación y administración de códigos QR inteligentes con estadísticas y seguimiento.",

        publisher: {
            "@id":
                `${BASE_URL}/#organization`
        },

        featureList: [
            "Estadísticas QR en tiempo real",
            "Seguimiento de escaneos",
            "QR dinámicos editables",
            "Analytics y métricas",
            "QR para WhatsApp",
            "QR para Google Reviews",
            "Panel de administración",
            "Edición sin reimpresión"
        ],

        offers: {

            "@type":
                "Offer",

            url:
                `${BASE_URL}/store-products`,

            price:
                "3850",

            priceCurrency:
                "ARS",

            availability:
                "https://schema.org/InStock"
        }
    };

    // =====================================================
    // FAQ
    // =====================================================

    const faqItems = [

        {
            question:
                "¿Qué es un QR inteligente?",

            answer:
                "Es un código QR dinámico que permite editar destinos, obtener estadísticas y medir resultados en tiempo real."
        },

        {
            question:
                "¿Puedo cambiar el enlace del QR después de imprimirlo?",

            answer:
                "Sí. Los QR dinámicos permiten modificar el destino sin volver a imprimir el código."
        },

        {
            question:
                "¿Qué estadísticas ofrece un QR inteligente?",

            answer:
                "Cantidad de escaneos, horarios, ciudades, dispositivos, rendimiento y métricas de campañas."
        },

        {
            question:
                "¿Los QR sirven para WhatsApp y Google Reviews?",

            answer:
                "Sí. Los QR inteligentes pueden utilizarse para WhatsApp, Google Reviews, menús digitales, ecommerce y redes sociales."
        }
    ];

    // =====================================================
    // BREADCRUMB
    // =====================================================

    const breadcrumbs = [
        {
            name:
                "Inicio",

            item: "https://www.tags.com.ar",
        },
        {
            name:
                "QR Inteligente",

            item: "https://www.tags.com.ar/qr-inteligente"
        }
    ];

    // =====================================================
    // ITEM LIST
    // =====================================================

    const itemListSchema = {

        "@context":
            "https://schema.org",

        "@type":
            "ItemList",

        "@id":
            `${PAGE_URL}/#features`,

        itemListElement: [
            {
                "@type":
                    "ListItem",

                position:
                    1,

                name:
                    "QR Dinámicos"
            },
            {
                "@type":
                    "ListItem",

                position:
                    2,

                name:
                    "Estadísticas QR"
            },
            {
                "@type":
                    "ListItem",

                position:
                    3,

                name:
                    "Analytics QR"
            },
            {
                "@type":
                    "ListItem",

                position:
                    4,

                name:
                    "Seguimiento de Escaneos"
            }
        ]
    };

    // =====================================================
    // SCHEMAS
    // =====================================================

    const schemas = [

        // ORGANIZATION
        getOrganizationSchema(),

        // WEBSITE
        getWebsiteSchema(),

        // LOCAL BUSINESS
        getLocalBusinessSchema(),

        // MAIN SOFTWARE
        getSoftwareSchema(),

        // WEBPAGE
        webPageSchema,

        // SERVICE
        qrServiceSchema,

        // SOFTWARE
        softwareSchema,

        // FAQ
        getFAQSchema(
            faqItems,
            `${PAGE_URL}/#faq`
        ),

        // BREADCRUMB
        getBreadcrumbSchema(
            breadcrumbs,
            `${PAGE_URL}/#breadcrumb`
        ),

        // ITEM LIST
        itemListSchema
    ];

    return (
        <>
            {/* JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html:
                        JSON.stringify(schemas)
                }}
            />

            <main className="tags_landing">

                <Header />

                {/* HERO */}
                <section className="tags_hero_section">

                    <div className="container">

                        <div className="row align-items-center g-5">

                            {/* CONTENT */}
                            <div className="col-12 col-lg-6">

                                <div className="tags_hero_content">

                                    <div className="tags_hero_badge">
                                        QR Inteligente • QR Dinámico • Estadísticas
                                    </div>

                                    <h1 className="tags_hero_title">
                                        QR Inteligente con
                                        <span> estadísticas </span>
                                        y seguimiento en tiempo real
                                    </h1>

                                    <p className="tags_hero_subtitle">
                                        Creá códigos QR dinámicos, editables y rastreables
                                        para campañas, negocios, restaurantes, hoteles,
                                        eventos y acciones de marketing.
                                    </p>

                                    <div className="tags_hero_features">

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Estadísticas reales
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Geolocalización
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Destinos editables
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Analytics en vivo
                                        </div>

                                    </div>

                                    <div className="tags_hero_buttons">

                                        <Link
                                            href="/store-products"
                                            className="tags_btn_primary"
                                        >
                                            Ver Productos
                                        </Link>

                                        <Link
                                            href="/demo"
                                            className="tags_btn_secondary"
                                        >
                                            Probá la Demo en Vivo
                                        </Link>

                                    </div>

                                    <p className="tags_hero_bottom_text">
                                        Ideal para campañas físicas, restaurantes,
                                        hoteles, tarjetas NFC, eventos, ecommerce,
                                        Google Reviews y WhatsApp.
                                    </p>

                                </div>

                            </div>

                            {/* IMAGE */}
                            <div className="col-12 col-lg-6">

                                <div className="tags_hero_mobile_image">

                                    {/* TU IMAGEN */}
                                    <Image
                                        src="/assets/images/tags/qr-hero.webp"
                                        alt="QR Inteligente"
                                        width={900}
                                        height={900}
                                        className="img-fluid tags_hero_image"
                                    />

                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                {/* COMO FUNCIONA */}
                <section className="tags_landing_how py-5">

                    <div className="container py-5">

                        <div className="text-center mb-5">

                            <div className="tags_landing_how_subtitle">
                                ¿Cómo funciona?
                            </div>

                            <h2 className="tags_landing_how_title">
                                Convertí un QR en una herramienta de marketing inteligente
                            </h2>

                        </div>

                        <div className="row g-4">

                            <div className="col-12 col-md-4">

                                <div className="tags_landing_how_card">

                                    <div className="tags_landing_how_number">
                                        01
                                    </div>

                                    <h5>
                                        Creá el QR
                                    </h5>

                                    <p>
                                        Generá un QR dinámico para WhatsApp,
                                        Google Reviews, menús, promociones,
                                        ecommerce o cualquier acción digital.
                                    </p>

                                </div>

                            </div>

                            <div className="col-12 col-md-4">

                                <div className="tags_landing_how_card">

                                    <div className="tags_landing_how_number">
                                        02
                                    </div>

                                    <h5>
                                        Compartilo
                                    </h5>

                                    <p>
                                        Imprimilo en vidrieras, mesas,
                                        productos, tarjetas, flyers,
                                        packaging o cartelería.
                                    </p>

                                </div>

                            </div>

                            <div className="col-12 col-md-4">

                                <div className="tags_landing_how_card">

                                    <div className="tags_landing_how_number">
                                        03
                                    </div>

                                    <h5>
                                        Medí resultados
                                    </h5>

                                    <p>
                                        Accedé a estadísticas, horarios,
                                        dispositivos, ciudades y rendimiento
                                        de cada campaña.
                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                {/* QUE ES */}
                <section className="tags_features_section">

                    <div className="tags_features_glow"></div>

                    <div className="container">

                        <div className="tags_features_header">

                            <div className="tags_features_badge">
                                Tecnología QR
                            </div>

                            <h2 className="tags_features_title">
                                ¿Qué es un código QR inteligente?
                            </h2>

                            <p className="tags_features_subtitle">
                                Un QR inteligente permite rastrear interacciones,
                                editar destinos y optimizar campañas sin volver
                                a imprimir el código.
                            </p>

                        </div>

                        <div className="row align-items-center g-5">

                            <div className="col-12 col-lg-6">

                                <div className="tags_features_image_wrapper">

                                    {/* TU IMAGEN */}
                                    <Image
                                        src="/assets/images/tags/qr-business.webp"
                                        alt="QR Marketing"
                                        width={900}
                                        height={700}
                                        className="img-fluid tags_features_image"
                                    />

                                    <div className="tags_features_image_badge">
                                        Estadísticas en tiempo real
                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-lg-6">

                                <div className="tags_features_content">

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Mucho más que un QR común
                                        </h3>

                                        <p>
                                            Los QR inteligentes permiten modificar
                                            enlaces, automatizar acciones y obtener
                                            datos reales sobre el comportamiento
                                            de los usuarios.
                                        </p>

                                        <p>
                                            Son utilizados por negocios,
                                            restaurantes, hoteles, marcas,
                                            ecommerce y campañas publicitarias.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box tags_features_highlight">

                                        <h4>
                                            Casos más utilizados
                                        </h4>

                                        <div className="tags_features_tags">

                                            <span>Google Reviews</span>
                                            <span>WhatsApp</span>
                                            <span>Menú Digital</span>
                                            <span>Promociones</span>
                                            <span>Ecommerce</span>
                                            <span>Eventos</span>
                                            <span>Redes Sociales</span>
                                            <span>Pagos</span>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                {/* DIFERENCIAS */}
                <section className="tags_services_section">

                    <div className="container">

                        <div className="tags_services_header">

                            <div className="tags_services_badge">
                                QR Estático vs QR Dinámico
                            </div>

                            <h2 className="tags_services_title">
                                Diferencia entre un QR tradicional y un QR inteligente
                            </h2>

                            <p className="tags_services_subtitle">
                                Los QR dinámicos permiten editar, administrar
                                y medir resultados reales.
                            </p>

                        </div>

                        {/* ROW */}
                        <div className="row align-items-center g-5 tags_service_row">

                            <div className="col-12 col-lg-6">

                                <div className="tags_service_content">

                                    <div className="tags_service_number">
                                        01
                                    </div>

                                    <h3>
                                        QR Estático
                                    </h3>

                                    <p>
                                        El QR tradicional no puede modificarse
                                        una vez impreso y no ofrece métricas,
                                        seguimiento ni administración avanzada.
                                    </p>

                                </div>

                            </div>

                            <div className="col-12 col-lg-6">

                                <div className="tags_service_image_wrapper">

                                    {/* TU IMAGEN */}
                                    <Image
                                        src="/assets/images/tags/qr-static.webp"
                                        alt="QR Estático"
                                        width={900}
                                        height={700}
                                        className="img-fluid tags_service_image"
                                    />

                                </div>

                            </div>

                        </div>

                        {/* ROW */}
                        <div className="row align-items-center g-5 tags_service_row flex-lg-row-reverse">

                            <div className="col-12 col-lg-6">

                                <div className="tags_service_content">

                                    <div className="tags_service_number">
                                        02
                                    </div>

                                    <h3>
                                        QR Inteligente
                                    </h3>

                                    <p>
                                        Permite editar enlaces, medir campañas,
                                        obtener estadísticas y optimizar resultados
                                        desde un panel de administración.
                                    </p>

                                </div>

                            </div>

                            <div className="col-12 col-lg-6">

                                <div className="tags_service_image_wrapper">

                                    {/* TU IMAGEN */}
                                    <Image
                                        src="/assets/images/tags/qr-dynamic.webp"
                                        alt="QR Dinámico"
                                        width={900}
                                        height={700}
                                        className="img-fluid tags_service_image"
                                    />

                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                {/* BENEFICIOS */}
                <section className="tags_products_section">

                    <div className="container">

                        <div className="tags_products_header">

                            <div className="tags_products_badge">
                                Beneficios
                            </div>

                            <h2 className="tags_products_title">
                                Todo lo que podés hacer con un QR inteligente
                            </h2>

                            <p className="tags_products_subtitle">
                                Convertí un simple escaneo en datos,
                                automatización y conversiones reales.
                            </p>

                        </div>

                        <div className="row g-4">

                            <div className="col-12 col-md-6">

                                <div className="tags_product_card">

                                    <div className="tags_product_icon">
                                        📊
                                    </div>

                                    <div>

                                        <h5>
                                            Estadísticas
                                        </h5>

                                        <p>
                                            Visualizá escaneos, horarios,
                                            dispositivos y rendimiento.
                                        </p>

                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-md-6">

                                <div className="tags_product_card">

                                    <div className="tags_product_icon">
                                        🌎
                                    </div>

                                    <div>

                                        <h5>
                                            Geolocalización
                                        </h5>

                                        <p>
                                            Descubrí desde qué ciudades
                                            escanean tus QR.
                                        </p>

                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-md-6">

                                <div className="tags_product_card">

                                    <div className="tags_product_icon">
                                        🔗
                                    </div>

                                    <div>

                                        <h5>
                                            Destinos Editables
                                        </h5>

                                        <p>
                                            Cambiá enlaces y campañas
                                            sin reimprimir el QR.
                                        </p>

                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-md-6">

                                <div className="tags_product_card">

                                    <div className="tags_product_icon">
                                        🚀
                                    </div>

                                    <div>

                                        <h5>
                                            Marketing Inteligente
                                        </h5>

                                        <p>
                                            Medí campañas físicas
                                            y digitales con datos reales.
                                        </p>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                {/* GALERIA */}
                <section className="tags_store_info">

                    <div className="container">

                        <div className="tags_store_info_card">

                            <div className="tags_products_badge mb-4">
                                Ejemplos Reales
                            </div>

                            <h2>
                                Aplicaciones reales para negocios y marcas
                            </h2>

                            <p>
                                Integrá QR inteligentes en restaurantes,
                                hoteles, productos, packaging, vidrieras,
                                tarjetas, eventos y campañas publicitarias.
                            </p>

                            <div className="row g-4 mt-4">

                                <div className="col-12 col-md-4">

                                    {/* TU IMAGEN */}
                                    <Image
                                        src="/assets/images/tags/qr-example-1.webp"
                                        alt="QR Restaurante"
                                        width={500}
                                        height={500}
                                        className="img-fluid tags_hero_image"
                                    />

                                </div>

                                <div className="col-12 col-md-4">

                                    {/* TU IMAGEN */}
                                    <Image
                                        src="/assets/images/tags/qr-example-2.webp"
                                        alt="QR Hotel"
                                        width={500}
                                        height={500}
                                        className="img-fluid tags_hero_image"
                                    />

                                </div>

                                <div className="col-12 col-md-4">

                                    {/* TU IMAGEN */}
                                    <Image
                                        src="/assets/images/tags/qr-example-3.webp"
                                        alt="QR Ecommerce"
                                        width={500}
                                        height={500}
                                        className="img-fluid tags_hero_image"
                                    />

                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                {/* CTA FINAL */}
                <section className="tags_services_section">

                    <div className="container">

                        <div className="tags_services_cta">

                            <p>
                                Potenciá tu negocio con QR inteligentes,
                                dinámicos y rastreables.
                            </p>

                            <Link
                                href="/store-products"
                                className="tags_services_button"
                            >
                                Ver Productos QR
                            </Link>

                        </div>

                    </div>

                </section>

                <FAQs
                    title="Preguntas frecuentes sobre QR Inteligentes"
                    subtitle="Todo lo que necesitás saber sobre los QR dinámicos y rastreables."
                    faqs={faqItems}
                />

                <TagsFooter />

                <div
                    className="m-0 p-0"
                    style={{
                        maxWidth: "1600px"
                    }}
                >
                    <WhatsAppFloat />
                </div>

            </main>
        </>
    );
}