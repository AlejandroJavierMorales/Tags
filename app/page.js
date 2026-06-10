import "@/app/styles/tags_landing.css";

import Hero from "./components/landing/Hero";
import Products from "./components/landing/Products";
import Features from "./components/landing/Features";
import Footer from "./components/landing/Footer";
import Header from "./components/landing/Header";
import Services from "./components/landing/Sevices";
import FAQs from "./components/landing/FAQs";
import WhatsAppFloat from "./components/WhatsAppFloat";

import { tagsSiteConfig } from "./config/configSite";

import {
    getOrganizationSchema,
    getWebsiteSchema,
    getLocalBusinessSchema,
    getSoftwareSchema,
    getFAQSchema,
    getBreadcrumbSchema
} from "@/app/lib/seo";

export const metadata = {

    metadataBase:
        new URL(tagsSiteConfig.site.url),

    title:
        "Tags - Gestión y Reporting de Códigos QR",

    description:
        "Plataforma de soluciones digitales con códigos QR dinámicos y tecnología NFC para negocios, eventos, páginas web, reseñas Google y tarjetas digitales inteligentes.",

    keywords:
        tagsSiteConfig.seo.keywords,

    alternates: {
        canonical: "/"
    },

    openGraph: {

        title:
            "Tags - Gestión y Reporting Experiencias Digitales con Códigos QR",

        description:
            "Transformá la experiencia de tus clientes con QR dinámicos, NFC, landing pages, eventos inteligentes, reseñas Google y tarjetas digitales modernas.",

        url:
            tagsSiteConfig.site.url,

        siteName:
            "Tags",

        locale:
            "es_AR",

        type:
            "website",

        images: [
            {
                url:
                    "/assets/images/og/tags-qr-og.webp",

                width: 1200,

                height: 630,

                alt:
                    "Plataforma QR Tags"
            }
        ]
    },

    twitter: {

        card:
            "summary_large_image",

        title:
            "Tags - Gestión y Reporting de Códigos QR",

        description:
            "Plataforma QR dinámica con estadísticas y cartelería inteligente.",

        images: [
            "/assets/images/og/tags-qr-og.webp",
        ]
    }
};

export default function Page() {

    const BASE_URL =
        tagsSiteConfig.site.url;

    // =====================================================
    // WEBPAGE
    // =====================================================

    const webPageSchema = {

        "@context": "https://schema.org",

        "@type": "WebPage",

        "@id":
            `${BASE_URL}/#webpage`,

        url:
            BASE_URL,

        name:
            "Tags - Gestión y Reporting de Códigos QR",

        description:
            tagsSiteConfig.site.description,

        inLanguage:
            tagsSiteConfig.site.language,

        isPartOf: {
            "@id":
                `${BASE_URL}/#website`
        },

        about: {
            "@id":
                `${BASE_URL}/#organization`
        },

        primaryImageOfPage: {

            "@type": "ImageObject",

            url:
                `${BASE_URL}/assets/images/tags/qr-estadisticas.webp`
        },

        speakable: {

            "@type":
                "SpeakableSpecification",

            cssSelector: [
                ".tags_hero_title",
                ".tags_hero_subtitle"
            ]
        }
    };

    // =====================================================
    // SERVICES
    // =====================================================

    const serviceSchemas =
        tagsSiteConfig.services.map(
            service => ({

                "@context":
                    "https://schema.org",

                "@type":
                    "Service",

                name:
                    service.name,

                description:
                    service.description,

                provider: {
                    "@id":
                        `${BASE_URL}/#organization`
                },

                areaServed: {
                    "@type":
                        "Country",

                    name:
                        "Argentina"
                }
            })
        );

    // =====================================================
    // PRODUCTS
    // =====================================================

    const productSchemas =
        tagsSiteConfig.products.map(
            product => ({

                "@context":
                    "https://schema.org",

                "@type":
                    "Product",

                "@id":
                    `${BASE_URL}/#${product.id}`,

                name:
                    product.name,

                description:
                    product.description,

                brand: {

                    "@type":
                        "Brand",

                    name:
                        "Tags"
                },

                manufacturer: {
                    "@id":
                        `${BASE_URL}/#organization`
                },

                image:
                    `${BASE_URL}/assets/images/tags/qr-estadisticas.webp`,

                offers: {

                    "@type":
                        "Offer",

                    url:
                        `${BASE_URL}/store-products`,

                    price:
                        product.price,

                    priceCurrency:
                        product.currency,

                    availability:
                        "https://schema.org/InStock",

                    itemCondition:
                        "https://schema.org/NewCondition"
                }
            })
        );

    // =====================================================
    // BREADCRUMBS
    // =====================================================

    const breadcrumbs = [
        ...tagsSiteConfig.breadcrumbsBase
    ];

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

        // SOFTWARE
        getSoftwareSchema(),

        // WEBPAGE
        webPageSchema,

        // SERVICES
        ...serviceSchemas,

        // PRODUCTS
        ...productSchemas,

        // FAQ
        getFAQSchema(
            tagsSiteConfig.faqs.tags,
            `${BASE_URL}/#faq`
        ),

        // BREADCRUMB
        getBreadcrumbSchema(
            breadcrumbs,
            `${BASE_URL}/#breadcrumb`
        )
    ];

    return (
        <>
            {/* ===================================================== */}
            {/* JSON-LD */}
            {/* ===================================================== */}

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html:
                        JSON.stringify(schemas)
                }}
            />

            <main className="landing_container">

                <Header />

                <Hero />

                <Products />

                <Services />

                <Features />

                <FAQs
                    title="Preguntas frecuentes sobre Tags"
                    subtitle="Todo lo que necesitás saber sobre nuestra plataforma QR."
                    faqs={tagsSiteConfig.faqs.tags}
                />

                <Footer />

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