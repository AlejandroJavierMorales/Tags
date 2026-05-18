// app/tags/demo/page.jsx

import { tagsSiteConfig } from "../config/configSite";
import TagsDemoPage from "./pageCliient";

export const metadata = {

    metadataBase: new URL(
        tagsSiteConfig.site.url
    ),

    title:
        "Demo QR en Vivo | Tags - Estadísticas y Gestión QR",

    description:
        "Probá Tags en vivo. Configurá un código QR real, escanealo y visualizá estadísticas en tiempo real de dispositivos, ciudades, navegadores y escaneos.",

    keywords: [

        ...tagsSiteConfig.seo.keywords,

        "Demo QR",
        "QR en vivo",
        "Estadísticas QR",
        "QR dinámico",
        "Tracking QR",
        "Analíticas QR",
        "Escaneos QR",
        "Dashboard QR",
        "QR Google Reviews",
        "QR WhatsApp",
        "QR Instagram",
        "QR NFC",
    ],

    alternates: {

        canonical:
            `${tagsSiteConfig.site.url}/demo`,
    },

    openGraph: {

        title:
            "Demo QR en Vivo | Tags",

        description:
            "Configurá un QR real y mirá estadísticas en tiempo real.",

        url:
            `${tagsSiteConfig.site.url}/demo`,

        siteName:
            tagsSiteConfig.site.name,

        locale:
            "es_AR",

        type:
            "website",

        images: [

            {
                url:
                    `${tagsSiteConfig.site.url}/assets/images/tags/qr-estadisticas.webp`,

                width: 1200,
                height: 630,

                alt:
                    "Demo QR Tags",
            }
        ]
    },

    twitter: {

        card:
            "summary_large_image",

        title:
            "Demo QR en Vivo | Tags",

        description:
            "Probá estadísticas QR reales en tiempo real.",

        images: [
            `${tagsSiteConfig.site.url}/assets/images/tags/qr-estadisticas.webp`
        ],
    },

    robots: {

        index: true,
        follow: true,

        googleBot: {

            index: true,
            follow: true,

            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        }
    }
};

export default function DemoPage() {

    const schemas = [

        // =========================
        // ORGANIZATION
        // =========================
        {
            "@context": "https://schema.org",

            "@type": "Organization",

            "@id":
                `${tagsSiteConfig.site.url}/#organization`,

            name:
                "Tags",

            url:
                tagsSiteConfig.site.url,

            logo:
                `${tagsSiteConfig.site.url}/logo.png`,

            image:
                `${tagsSiteConfig.site.url}/logo.png`,

            email:
                tagsSiteConfig.contact.email,

            telephone:
                tagsSiteConfig.contact.phone,

            sameAs:
                Object.values(tagsSiteConfig.social),

            description:
                "Plataforma de gestión, estadísticas y reporting de códigos QR dinámicos.",
        },

        // =========================
        // WEBSITE
        // =========================
        {
            "@context": "https://schema.org",

            "@type": "WebSite",

            "@id":
                `${tagsSiteConfig.site.url}/#website`,

            url:
                tagsSiteConfig.site.url,

            name:
                "Tags",

            publisher: {

                "@id":
                    `${tagsSiteConfig.site.url}/#organization`
            }
        },

        // =========================
        // WEBPAGE
        // =========================
        {
            "@context": "https://schema.org",

            "@type": "WebPage",

            "@id":
                `${tagsSiteConfig.site.url}/demo#webpage`,

            url:
                `${tagsSiteConfig.site.url}/demo`,

            name:
                "Demo QR en Vivo | Tags",

            description:
                "Demo interactiva para probar estadísticas QR en tiempo real.",

            inLanguage:
                "es-AR",

            isPartOf: {

                "@id":
                    `${tagsSiteConfig.site.url}/#website`
            },

            about: {

                "@id":
                    `${tagsSiteConfig.site.url}/#organization`
            },

            primaryImageOfPage: {

                "@type": "ImageObject",

                url:
                    `${tagsSiteConfig.site.url}/assets/images/tags/qr-estadisticas.webp`,
            },

            speakable: {

                "@type": "SpeakableSpecification",

                cssSelector: [
                    ".tags_demo_title",
                    ".tags_demo_subtitle"
                ]
            }
        },

        // =========================
        // SOFTWARE APPLICATION
        // =========================
        {
            "@context": "https://schema.org",

            "@type": "SoftwareApplication",

            "@id":
                `${tagsSiteConfig.site.url}/demo#software`,

            name:
                "Tags QR Demo",

            applicationCategory:
                "BusinessApplication",

            applicationSubCategory:
                "QR Analytics Platform",

            operatingSystem:
                "Web",

            description:
                "Demo interactiva de estadísticas QR dinámicas en tiempo real.",

            creator: {

                "@id":
                    `${tagsSiteConfig.site.url}/#organization`
            },

            offers: {

                "@type": "Offer",

                price: "0",

                priceCurrency: "ARS",
            },

            potentialAction: {

                "@type": "UseAction",

                target:
                    `${tagsSiteConfig.site.url}/demo`
            },

            featureList: [

                "Estadísticas QR en tiempo real",
                "Tracking de escaneos",
                "Analíticas por ciudad",
                "Analíticas por navegador",
                "Tracking por dispositivo",
                "QR dinámicos editables",
            ]
        },

        // =========================
        // FAQ
        // =========================
        {
            "@context": "https://schema.org",

            "@type": "FAQPage",

            "@id":
                `${tagsSiteConfig.site.url}/demo#faq`,

            mainEntity: [

                {
                    "@type": "Question",

                    name:
                        "¿La demo utiliza códigos QR reales?",

                    acceptedAnswer: {

                        "@type": "Answer",

                        text:
                            "Sí. La demo utiliza códigos QR reales conectados a la plataforma Tags."
                    }
                },

                {
                    "@type": "Question",

                    name:
                        "¿Las estadísticas se actualizan en tiempo real?",

                    acceptedAnswer: {

                        "@type": "Answer",

                        text:
                            "Sí. Los escaneos y métricas se actualizan automáticamente en tiempo real."
                    }
                },

                {
                    "@type": "Question",

                    name:
                        "¿Puedo editar el destino del QR?",

                    acceptedAnswer: {

                        "@type": "Answer",

                        text:
                            "Sí. La demo permite modificar el enlace del QR dinámico."
                    }
                },

                {
                    "@type": "Question",

                    name:
                        "¿Qué estadísticas puedo visualizar?",

                    acceptedAnswer: {

                        "@type": "Answer",

                        text:
                            "Podés visualizar ciudades, navegadores, dispositivos, escaneos totales y actividad diaria."
                    }
                }
            ]
        },

        // =========================
        // BREADCRUMB
        // =========================
        {
            "@context": "https://schema.org",

            "@type": "BreadcrumbList",

            "@id":
                `${tagsSiteConfig.site.url}/demo#breadcrumb`,

            itemListElement: [

                {
                    "@type": "ListItem",

                    position: 1,

                    name: "Inicio",

                    item:
                        tagsSiteConfig.site.url,
                },

                {
                    "@type": "ListItem",

                    position: 2,

                    name: "Demo QR",

                    item:
                        `${tagsSiteConfig.site.url}/demo`,
                }
            ]
        }
    ];

    return (
        <>

            {/* SEO JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(schemas),
                }}
            />

            <TagsDemoPage />

        </>
    );
}