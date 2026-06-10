// app/tags-reviews/page.jsx

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
    "/tags-reviews";

const PAGE_URL =
    `${tagsSiteConfig.site.url}${PAGE_PATH}`;

const faqItems = [
    {
        question:
            "¿Qué es Tags Reviews?",

        answer:
            "Tags Reviews es una plataforma inteligente para recopilar opiniones, gestionar experiencias y aumentar reseñas positivas en Google mediante formularios personalizados, QR y NFC.",
    },
    {
        question:
            "¿Puedo personalizar las preguntas?",

        answer:
            "Sí. Podés agregar, eliminar, reordenar y personalizar preguntas según las necesidades de tu negocio.",
    },
    {
        question:
            "¿El cliente puede subir fotos?",

        answer:
            "Sí. Los clientes pueden compartir imágenes de su experiencia y crear una galería visual real de opiniones.",
    },
    {
        question:
            "¿Se puede derivar automáticamente a Google?",

        answer:
            "Sí. Podés configurar un umbral mínimo de puntuación para que las experiencias positivas sean invitadas automáticamente a dejar una reseña pública en Google.",
    },
    {
        question:
            "¿Qué pasa con las experiencias negativas?",

        answer:
            "Las experiencias con puntuaciones más bajas pueden gestionarse de forma privada para mejorar la atención y cuidar la reputación del negocio.",
    },
    {
        question:
            "¿Puedo generar contenido para redes sociales?",

        answer:
            "Sí. La plataforma permite generar imágenes PNG con reseñas reales listas para publicar en Instagram, Facebook y redes sociales.",
    },
];

export const metadata = {

    metadataBase:
        new URL(tagsSiteConfig.site.url),

    title:
        "Tags Reviews | Plataforma Inteligente de Reseñas y Reputación Online",

    description:
        "Aumentá tus reseñas positivas en Google con formularios personalizados, feedback inteligente, QR, NFC y gestión moderna de reputación online.",

    keywords: [
        ...tagsSiteConfig.seo.keywords,
        "google reviews",
        "qr google reviews",
        "reseñas google",
        "reputación online",
        "feedback clientes",
        "customer experience",
        "plataforma reseñas",
        "software reseñas",
        "reviews restaurantes",
        "reviews hoteles",
        "opiniones clientes",
        "gestión reputación",
    ],

    alternates: {
        canonical:
            PAGE_PATH,
    },

    openGraph: {

        title:
            "Tags Reviews | Más reseñas y mejor reputación online",

        description:
            "Transformá experiencias positivas en reseñas reales, reputación y contenido para redes sociales.",

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
                    "/assets/images/og/tags-reviews-og.webp",

                width:
                    1200,

                height:
                    630,

                alt:
                    "Tags Reviews plataforma de reputación online",
            }
        ]
    },

    twitter: {

        card:
            "summary_large_image",

        title:
            "Tags Reviews | Gestión inteligente de reputación",

        description:
            "Más reseñas, mejor reputación y experiencias personalizadas.",

        images: [
            "/assets/images/og/tags-reviews-og.webp",
        ],
    },
};

export default function TagsReviewsLanding() {

    const webPageSchema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${PAGE_URL}/#webpage`,
        url: PAGE_URL,
        name: "Tags Reviews",
        description:
            "Plataforma inteligente de reputación online, feedback y reseñas Google.",
        inLanguage: "es-AR",
    };

    const serviceSchema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${PAGE_URL}/#service`,
        name: "Tags Reviews",
        serviceType: [
            "Google Reviews",
            "Reputación Online",
            "Feedback Clientes",
            "Customer Experience",
        ],
        description:
            "Sistema inteligente para recopilar experiencias, gestionar feedback y aumentar reseñas positivas.",
        provider: {
            "@id":
                `${tagsSiteConfig.site.url}/#organization`
        }
    };

    const breadcrumbs = [
        ...tagsSiteConfig.breadcrumbsBase,
        {
            name:
                "Tags Reviews",

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
                                        Google Reviews • Feedback • Reputación Online
                                    </div>
                                    <div className="tags_reviews_stars mb-3">
                                        ★★★★★
                                    </div>
                                    <h1 className="tags_hero_title">
                                        Transformá experiencias positivas en
                                        <span> reputación y nuevas ventas</span>
                                    </h1>

                                    <p className="tags_hero_subtitle">
                                        Tags Reviews ayuda a negocios,
                                        hoteles, restaurantes y profesionales
                                        a recopilar opiniones, mejorar la experiencia
                                        de sus clientes y aumentar reseñas positivas
                                        en Google con una experiencia moderna,
                                        visual e inteligente.
                                    </p>

                                    <div className="tags_hero_features">

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Más reseñas positivas
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Formularios personalizables
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Gestión privada de experiencias
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Dashboard y estadísticas
                                        </div>

                                    </div>

                                    <div className="tags_hero_buttons">

                                       {/*  <Link
                                            href="/demo"
                                            className="tags_btn_primary"
                                        >
                                            Ver Demo
                                        </Link> */}

                                        <Link
                                            href="/contact"
                                            className="tags_btn_secondary"
                                        >
                                            Solicitar Información
                                        </Link>

                                    </div>

                                    <div className="tags_hero_bottom_text">
                                        Ideal para hotelería, gastronomía,
                                        turismo, servicios, comercios y negocios
                                        donde la reputación online marca la diferencia.
                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-lg-6">

                                <div className="tags_hero_image_wrapper">

                                    <Image
                                        src="/assets/images/tags-reviews/tags-reviews-dark.webp"
                                        alt="Tags Reviews"
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

                {/* PROBLEM */}

                <section className="tags_products_section">

                    <div className="container">

                        <div className="tags_products_header">

                            <div className="tags_products_badge">
                                Reputación Online
                            </div>

                            <h2 className="tags_products_title">
                                Las reseñas ya no son opcionales
                            </h2>

                            <p className="tags_products_subtitle">
                                Hoy las personas eligen negocios mirando Google.
                                Cada cliente satisfecho puede convertirse en confianza,
                                reputación y nuevas oportunidades.
                            </p>

                        </div>

                        <div className="row g-4">

                            {[
                                {
                                    icon: "⭐",
                                    title: "Más reseñas positivas",
                                    text: "Guiá a clientes satisfechos hacia Google con una experiencia moderna y simple.",
                                },
                                {
                                    icon: "🧠",
                                    title: "Feedback inteligente",
                                    text: "Recibí opiniones reales y entendé mejor cómo viven la experiencia tus clientes.",
                                },
                                {
                                    icon: "🛡️",
                                    title: "Cuidá tu reputación",
                                    text: "Las experiencias que necesitan atención pueden gestionarse de manera privada.",
                                },
                                {
                                    icon: "📈",
                                    title: "Más confianza",
                                    text: "Una buena reputación genera más consultas, reservas y ventas.",
                                },
                                {
                                    icon: "📲",
                                    title: "QR + NFC",
                                    text: "Compartí la experiencia desde carteles, mesas, stickers o soportes digitales.",
                                },
                                {
                                    icon: "🎨",
                                    title: "Experiencia personalizada",
                                    text: "Adaptá colores, temas y formularios para que se sientan parte de tu marca.",
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

                {/* HOW */}

                <section className="tags_services_section">

                    <div className="container">

                        <div className="tags_services_header">

                            <div className="tags_services_badge">
                                Cómo funciona
                            </div>

                            <h2 className="tags_services_title">
                                Una experiencia simple para el cliente.
                                Una herramienta poderosa para tu negocio.
                            </h2>

                        </div>

                        {[
                            {
                                number: "01",
                                title: "El cliente escanea el QR",
                                text: "Accede a una experiencia visual moderna desde su celular, sin instalar aplicaciones.",
                                image: "/assets/images/tags-reviews/tags-reviews-hotel.webp",
                            },
                            {
                                number: "02",
                                title: "Comparte su experiencia",
                                text: "Puede responder preguntas, calificar distintos aspectos y compartir comentarios o imágenes.",
                                image: "/assets/images/tags-reviews/tags-reviews-vidriera.webp",
                            },
                            {
                                number: "03",
                                title: "El sistema actúa inteligentemente",
                                text: "Las experiencias excelentes pueden derivarse automáticamente a Google y las demás gestionarse de manera privada.",
                                image: "/assets/images/tags-reviews/tags-reviews-dashboard.webp",
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

                {/* FEATURES */}

                <section className="tags_features_section">

                    <div className="tags_features_glow"></div>

                    <div className="container">

                        <div className="tags_features_header">

                            <div className="tags_features_badge">
                                Customer Experience
                            </div>

                            <h2 className="tags_features_title">
                                Mucho más que pedir una reseña
                            </h2>

                            <p className="tags_features_subtitle">
                                Tags Reviews transforma opiniones reales
                                en reputación, análisis y contenido para tu marca.
                            </p>

                        </div>

                        <div className="row align-items-center g-5">

                            <div className="col-12 col-lg-5">

                                <div className="tags_features_image_wrapper">

                                    <Image
                                        src="/assets/images/tags-reviews/tegs-reviews-software.webp"
                                        alt="Dashboard Tags Reviews"
                                        width={900}
                                        height={672}
                                        className="img-fluid tags_features_image"
                                    />

                                    <div className="tags_features_image_badge">
                                        Dashboard inteligente
                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-lg-7">

                                <div className="tags_features_content">

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Formularios completamente personalizables
                                        </h3>

                                        <p>
                                            Agregá, eliminá y reorganizá preguntas
                                            según el tipo de negocio y la experiencia
                                            que quieras recopilar.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Imágenes y experiencias reales
                                        </h3>

                                        <p>
                                            Tus clientes pueden compartir fotos
                                            para generar experiencias más visuales,
                                            auténticas y confiables.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Contenido listo para redes sociales
                                        </h3>

                                        <p>
                                            Generá automáticamente piezas PNG
                                            profesionales con reseñas reales listas
                                            para publicar en Instagram o redes sociales.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Dashboard y métricas
                                        </h3>

                                        <p>
                                            Visualizá respuestas, puntuaciones,
                                            clicks hacia Google, filtros, estadísticas
                                            y exportaciones PDF desde un panel centralizado.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box tags_features_highlight">

                                        <h4>
                                            Ideal para:
                                        </h4>

                                        <div className="tags_features_tags">

                                            <span>Hoteles</span>
                                            <span>Restaurantes</span>
                                            <span>Cabañas</span>
                                            <span>Turismo</span>
                                            <span>Eventos</span>
                                            <span>Servicios</span>
                                            <span>Comercios</span>
                                            <span>Gastronomía</span>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                {/* CTA */}

                <section className="tags_store_info">

                    <div className="container">

                        <div className="tags_store_info_card">

                            <div className="tags_products_badge mb-4">
                                Reputación Inteligente
                            </div>

                            <h2>
                                Cada cliente satisfecho puede ayudarte a crecer
                            </h2>

                            <p>
                                Tags Reviews convierte experiencias reales
                                en reputación positiva, confianza y contenido
                                para tu negocio.
                            </p>

                            <p>
                                Más que un QR, es una plataforma moderna
                                de customer experience y reputación online.
                            </p>

                            <div className="tags_hero_buttons justify-content-center mt-4">

                                {/* <Link
                                    href="/demo"
                                    className="tags_btn_primary"
                                >
                                    Ver Demo
                                </Link> */}

                                <Link
                                    href="/contact"
                                    className="tags_btn_secondary"
                                >
                                    Solicitar Información
                                </Link>

                            </div>

                        </div>

                    </div>

                </section>

                <FAQs
                    title="Preguntas frecuentes sobre Tags Reviews"
                    subtitle="Todo lo que necesitás saber sobre reputación online y reseñas inteligentes."
                    faqs={faqItems}
                />

                <TagsFooter />

                <WhatsAppFloat />

            </main>
        </>
    );
}