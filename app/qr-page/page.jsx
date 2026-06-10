// app/qr-page/page.jsx

import "@/app/styles/tags_landing.css";

import Image from "next/image";
import Link from "next/link";

import Header from "../components/landing/Header";
import TagsFooter from "../components/landing/Footer";
import FAQs from "../components/landing/FAQs";
import WhatsAppFloat from "../components/WhatsAppFloat";

import { tagsSiteConfig } from "../config/configSite";

import {
    getOrganizationSchema,
    getWebsiteSchema,
    getLocalBusinessSchema,
    getSoftwareSchema,
    getFAQSchema,
    getBreadcrumbSchema
} from "@/app/lib/seo";

const PAGE_PATH =
    "/qr-page";

const PAGE_URL =
    `${tagsSiteConfig.site.url}${PAGE_PATH}`;

const IMAGE_URL =
    `${tagsSiteConfig.site.url}/assets/images/tags/tags_qr_setup.webp`;

const faqItems = [
    {
        question:
            "¿Qué es QR-Page?",

        answer:
            "QR-Page convierte un código QR en una página moderna y personalizada donde podés mostrar productos, servicios, redes sociales, WhatsApp, ubicación y mucho más.",
    },
    {
        question:
            "¿Necesito saber programar para usar QR-Page?",

        answer:
            "No. QR-Page fue diseñada para que cualquier persona pueda editar colores, textos, imágenes y contenido de forma simple.",
    },
    {
        question:
            "¿Puedo elegir distintos diseños?",

        answer:
            "Sí. Podés comenzar desde distintos templates y personalizar completamente colores, tipografías, imágenes, secciones y estilo visual.",
    },
    {
        question:
            "¿Las páginas aparecen en Google?",

        answer:
            "Sí. Las QR-Page están preparadas para indexarse en Google y verse correctamente al compartirlas en redes sociales y WhatsApp.",
    },
    {
        question:
            "¿Puedo mostrar productos o servicios?",

        answer:
            "Sí. QR-Page permite crear catálogos, menús digitales, portfolios, perfiles profesionales y páginas comerciales.",
    },
    {
        question:
            "¿Funciona con QR físicos y digitales?",

        answer:
            "Sí. Puede utilizarse con carteles QR, stickers, tarjetas NFC, QR digitales o cualquier soporte físico o virtual.",
    },
];

export const metadata = {

    metadataBase:
        new URL(tagsSiteConfig.site.url),

    title:
        "QR-Page | Páginas Inteligentes para QR y Negocios | Tags",

    description:
        "Transformá cualquier QR en una página moderna y personalizada para mostrar productos, servicios, redes sociales, WhatsApp, catálogos y mucho más.",

    keywords: [
        ...tagsSiteConfig.seo.keywords,
        "landing QR",
        "pagina para QR",
        "catalogo QR",
        "menu digital",
        "pagina para negocios",
        "perfil profesional",
        "landing editable",
        "QR inteligente",
    ],

    alternates: {
        canonical:
            PAGE_PATH,
    },

    openGraph: {

        title:
            "QR-Page | Convertí un QR en una página profesional",

        description:
            "Mostrá productos, servicios, contacto, redes y mucho más desde una página moderna y personalizada conectada a tu QR.",

        url:
            PAGE_URL,

        siteName:
            tagsSiteConfig.site.shortName,

        locale:
            tagsSiteConfig.site.locale,

        type:
            "website",

        images: [
            {
                url:
                    "/assets/images/og/tags-qr-page-og.webp",

                width:
                    1200,

                height:
                    630,

                alt:
                    "QR-Page Tags",
            }
        ]
    },

    twitter: {

        card:
            "summary_large_image",

        title:
            "QR-Page | Landing Pages para QR",

        description:
            "Creá páginas modernas y personalizadas conectadas a tus QR.",

        images: [
            "/assets/images/og/tags-qr-page-og.webp"
        ],
    },
};

export default function QRPageLanding() {

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
            "QR-Page | Páginas inteligentes para QR",

        description:
            "Páginas modernas y personalizables para negocios, productos, servicios y perfiles conectados con QR.",

        inLanguage:
            "es-AR",
    };

    const serviceSchema = {

        "@context":
            "https://schema.org",

        "@type":
            "Service",

        "@id":
            `${PAGE_URL}/#service`,

        name:
            "QR-Page",

        description:
            "Servicio de páginas personalizadas conectadas a códigos QR.",

        provider: {
            "@id":
                `${tagsSiteConfig.site.url}/#organization`
        },
    };

    const breadcrumbs = [
        ...tagsSiteConfig.breadcrumbsBase,
        {
            name:
                "QR-Page",

            url:
                PAGE_URL,
        }
    ];

    const schemas = [
        getOrganizationSchema(),
        getWebsiteSchema(),
        getLocalBusinessSchema(),
        getSoftwareSchema(),
        webPageSchema,
        serviceSchema,
        getFAQSchema(
            faqItems,
            `${PAGE_URL}/#faq`
        ),
        getBreadcrumbSchema(
            breadcrumbs,
            `${PAGE_URL}/#breadcrumb`
        )
    ];

    return (
        <>
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

                            <div className="col-12 col-lg-6">

                                <div className="tags_hero_content">

                                    <div className="tags_hero_badge">
                                        Templates • Catálogo • Redes • WhatsApp
                                    </div>

                                    <h1 className="tags_hero_title">
                                        Transformá cualquier QR en una
                                        <span> página profesional para tu negocio</span>
                                    </h1>

                                    <p className="tags_hero_subtitle">
                                        Mostrá productos, servicios, redes sociales,
                                        WhatsApp, ubicación, promociones o información
                                        importante desde una página moderna,
                                        personalizable y lista para compartir.
                                    </p>

                                    <div className="tags_hero_features">

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Diseños modernos
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Personalización completa
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Catálogo y links
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Visible en Google
                                        </div>

                                    </div>

                                    <div className="tags_hero_mobile_image d-block d-lg-none">

                                        <Image
                                            src="/assets/images/qr-page/tags-qr-page-catalogo-productos.webp"
                                            alt="QR-Page"
                                            width={750}
                                            height={570}
                                            className="img-fluid tags_hero_image"
                                            priority
                                            style={{
                                                height: "auto"
                                            }}
                                        />

                                    </div>

                                    <div className="tags_hero_buttons">

                                        {/* <Link
                                            href="/demo"
                                            className="tags_btn_primary"
                                        >
                                            Ver Demo
                                        </Link> */}

                                        <Link
                                            href="/store-products"
                                            className="tags_btn_secondary"
                                        >
                                            Ver Productos
                                        </Link>

                                    </div>

                                    <div className="tags_hero_bottom_text">
                                        Ideal para negocios, restaurantes,
                                        profesionales, turismo, eventos,
                                        alojamientos y productos físicos con QR o NFC.
                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-lg-6">

                                <div className="tags_hero_image_wrapper d-none d-lg-block">

                                    <Image
                                        src="/assets/images/qr-page/tags-qr-page-catalogo-productos.webp"
                                        alt="QR-Page"
                                        width={700}
                                        height={550}
                                        className="img-fluid tags_hero_image"
                                        priority
                                    />

                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                {/* TEMPLATES */}

                <section className="tags_products_section">

                    <div className="container">

                        <div className="tags_products_header">

                            <div className="tags_products_badge">
                                Diseños y Templates
                            </div>

                            <h2 className="tags_products_title">
                                Elegí el estilo que mejor representa tu negocio
                            </h2>

                            <p className="tags_products_subtitle">
                                Comenzá desde un diseño listo para usar y personalizalo
                                completamente con tus colores, imágenes y contenido.
                            </p>

                        </div>

                        <div className="row g-4">

                            {[
                                {
                                    icon: "🏪",
                                    title: "Negocios",
                                    text: "Perfecto para comercios, locales, servicios y marcas.",
                                },
                                {
                                    icon: "🛍️",
                                    title: "Catálogos",
                                    text: "Mostrá productos, precios, promociones y consultas.",
                                },
                                {
                                    icon: "👤",
                                    title: "Perfil Profesional",
                                    text: "Ideal para profesionales, freelancers y networking.",
                                },
                                {
                                    icon: "🍽️",
                                    title: "Menú Digital",
                                    text: "Cartas y menús modernos para gastronomía.",
                                },
                                {
                                    icon: "🔗",
                                    title: "Link Hub",
                                    text: "Centralizá redes sociales, links y contacto.",
                                },
                                {
                                    icon: "✨",
                                    title: "Diseño Personalizado",
                                    text: "Adaptalo completamente a tu identidad visual.",
                                },
                            ].map((item) => (

                                <div
                                    key={item.title}
                                    className="col-12 col-md-6 col-xl-4"
                                >

                                    <article className="tags_product_card">

                                        <div className="tags_product_icon">
                                            {item.icon}
                                        </div>

                                        <div>

                                            <h3>
                                                {item.title}
                                            </h3>

                                            <p>
                                                {item.text}
                                            </p>

                                        </div>

                                    </article>

                                </div>

                            ))}

                        </div>

                    </div>

                </section>

                {/* EXPERIENCE */}

                <section className="tags_features_section">

                    <div className="tags_features_glow"></div>

                    <div className="container">

                        <div className="tags_features_header">

                            <div className="tags_features_badge">
                                Mucho más que un QR
                            </div>

                            <h2 className="tags_features_title">
                                Creá una experiencia digital moderna para tus clientes
                            </h2>

                            <p className="tags_features_subtitle">
                                Convertí un simple escaneo en una experiencia visual,
                                profesional y mucho más atractiva para tu negocio.
                            </p>

                        </div>

                        <div className="row align-items-center g-5">

                            <div className="col-12 col-lg-5">

                                <div className="tags_features_image_wrapper">

                                    <Image
                                        src="/assets/images/qr-page/tags-qr-page-lista-de-precios-pedidos.webp"
                                        alt="QR-Page analytics"
                                        width={900}
                                        height={672}
                                        className="img-fluid tags_features_image"
                                    />

                                    <div className="tags_features_image_badge">
                                        Diseño + interacción + métricas
                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-lg-7">

                                <div className="tags_features_content">

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Mostrá lo importante
                                        </h3>

                                        <p>
                                            Productos, servicios, promociones,
                                            ubicación, contacto, links, WhatsApp,
                                            redes sociales y mucho más.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Personalización total
                                        </h3>

                                        <p>
                                            Cambiá colores, imágenes, estilos,
                                            tipografías, secciones y diseño
                                            para adaptarlo a tu marca.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Funciona perfecto en celular
                                        </h3>

                                        <p>
                                            Todas las QR-Page están optimizadas
                                            para verse modernas y profesionales
                                            desde cualquier dispositivo.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box tags_features_highlight">

                                        <h4>
                                            Ideal para:
                                        </h4>

                                        <div className="tags_features_tags">

                                            <span>Negocios</span>
                                            <span>Restaurantes</span>
                                            <span>Hoteles</span>
                                            <span>Eventos</span>
                                            <span>Turismo</span>
                                            <span>Profesionales</span>
                                            <span>Inmobiliarias</span>
                                            <span>Marcas</span>

                                        </div>

                                    </div>

                                    <div className="tags_features_cta">

                                        <p>
                                            Mostrá tu negocio de una forma más moderna y profesional.
                                        </p>

                                        <Link
                                            href="/contact"
                                            className="tags_features_button"
                                        >
                                            Consultar QR-Page
                                        </Link>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                {/* HOW */}

                <section className="tags_services_section">

                    <div className="container">

                        <div className="tags_services_header">

                            <div className="tags_services_badge">
                                Fácil de usar
                            </div>

                            <h2 className="tags_services_title">
                                Tu QR listo en minutos
                            </h2>

                            <p className="tags_services_subtitle">
                                No necesitás conocimientos técnicos.
                                Todo fue pensado para que puedas gestionarlo fácilmente.
                            </p>

                        </div>

                        {[
                            {
                                number: "01",
                                title: "Elegí un diseño",
                                text: "Seleccioná un template pensado para tu negocio o estilo.",
                                image: "/assets/images/tags-dashboard-cliente-telefono.webp",
                            },
                            {
                                number: "02",
                                title: "Personalizá tu página",
                                text: "Agregá imágenes, textos, productos, redes sociales y contacto.",
                                image: "/assets/images/tags-panel-de-configuracion.webp",
                            },
                            {
                                number: "03",
                                title: "Compartí y medí resultados",
                                text: "Tu QR queda listo para compartir, imprimir o usar donde quieras.",
                                image: "/assets/images/tags-medi-resultados-de-escaneos.webp",
                            },
                        ].map((step, index) => (

                            <div
                                key={step.number}
                                className="row align-items-center g-5 tags_service_row"
                            >

                                <div
                                    className={`col-12 col-lg-6 ${index % 2 === 1 ? "order-lg-2" : ""}`}
                                >

                                    <div className="tags_service_image_wrapper">

                                        <Image
                                            src={step.image}
                                            alt={step.title}
                                            width={900}
                                            height={672}
                                            className="img-fluid tags_service_image"
                                        />

                                    </div>

                                </div>

                                <div
                                    className={`col-12 col-lg-6 ${index % 2 === 1 ? "order-lg-1" : ""}`}
                                >

                                    <div className="tags_service_content">

                                        <div className="tags_service_number">
                                            {step.number}
                                        </div>

                                        <h3>
                                            {step.title}
                                        </h3>

                                        <p>
                                            {step.text}
                                        </p>

                                    </div>

                                </div>

                            </div>

                        ))}

                    </div>

                </section>

                {/* CTA */}

                <section className="tags_store_info">

                    <div className="container">

                        <div className="tags_store_info_card">

                            <div className="tags_products_badge mb-4">
                                QR + Página + Diseño
                            </div>

                            <h2>
                                Todo conectado en una sola experiencia
                            </h2>

                            <p>
                                Unificá QR físicos, QR digitales,
                                landing pages, redes sociales,
                                WhatsApp y contenido personalizado
                                en una solución simple y moderna.
                            </p>

                            <p>
                                Ideal para transformar un simple QR
                                en una herramienta real de comunicación,
                                marketing y conversión.
                            </p>

                        </div>

                    </div>

                </section>

                <FAQs
                    title="Preguntas frecuentes sobre QR-Page"
                    subtitle="Todo lo que necesitás saber sobre páginas inteligentes para QR."
                    faqs={faqItems}
                />

                <TagsFooter />

                <WhatsAppFloat />

            </main>
        </>
    );
}