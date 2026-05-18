// app/tags/contact/page.jsx

import "@/app/styles/tags_landing.css";

import Image from "next/image";

import Header from "../components/landing/Header";
import Footer from "../components/landing/Footer";
import WhatsAppFloat from "../components/WhatsAppFloat";

import ContactForm from "../components/contact/ContactForm";


import { catalogue } from "../config/catalogue";
import { tagsSiteConfig } from "../config/configSite";

export const metadata = {

    metadataBase: new URL(
        tagsSiteConfig.site.url
    ),

    title:
        "Contacto | Tags - Plataforma QR y Carteles QR Personalizados",

    description:
        "Contactate con Tags para solicitar carteles QR personalizados, QR dinámicos, Google Reviews, NFC, stickers QR y plataforma de estadísticas de escaneo.",

    keywords: [

        ...tagsSiteConfig.seo.keywords,

        "Contacto Tags",
        "Soporte QR",
        "Carteles QR personalizados",
        "Google Reviews QR",
        "QR dinámicos",
        "QR NFC",
        "WhatsApp QR",
        "Menú digital",
        "Stickers QR",

    ],

    alternates: {

        canonical:
            `${tagsSiteConfig.site.url}/contact`,
    },

    openGraph: {

        title:
            "Contacto | Tags",

        description:
            "Solicitá información sobre soluciones QR físicas y digitales para negocios.",

        url:
            `${tagsSiteConfig.site.url}/contact`,

        siteName:
            tagsSiteConfig.site.name,

        locale:
            "es_AR",

        type:
            "website",

        images: [

            {
                url:
                    tagsSiteConfig.site.image,

                width:
                    1200,

                height:
                    630,

                alt:
                    "Contacto Tags",
            }
        ]
    },

    twitter: {

        card:
            "summary_large_image",

        title:
            "Contacto | Tags",

        description:
            "Contactanos para implementar soluciones QR y NFC para tu negocio.",

        images: [
            tagsSiteConfig.site.image
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

export default function ContactPage() {

    const featuredImages = [
        catalogue[0].items[0].images[0],
        catalogue[0].items[1].images[0],
        catalogue[1].items[0].images[0],
        catalogue[2].items[0].images[0],
    ];

    const whatsappMessage = encodeURIComponent(
        "Hola! Quiero consultar por productos QR y la plataforma Tags."
    );

    const whatsappUrl =
        `https://wa.me/${tagsSiteConfig.contact.phone.replace(/\D/g, "")}?text=${whatsappMessage}`;

    // =========================
    // SCHEMAS
    // =========================

    const schemas = [

        // =====================================================
        // ORGANIZATION
        // =====================================================

        {
            "@context": "https://schema.org",

            "@type": "Organization",

            "@id":
                `${tagsSiteConfig.site.url}/#organization`,

            name:
                tagsSiteConfig.organization.name,

            url:
                tagsSiteConfig.organization.url,

            logo:
                tagsSiteConfig.organization.logo,

            image:
                tagsSiteConfig.organization.logo,

            email:
                tagsSiteConfig.contact.email,

            telephone:
                tagsSiteConfig.contact.phone,

            sameAs:
                Object.values(tagsSiteConfig.social),

            description:
                tagsSiteConfig.site.description,

            contactPoint: [

                {
                    "@type": "ContactPoint",

                    telephone:
                        tagsSiteConfig.contact.phone,

                    contactType:
                        "customer support",

                    areaServed:
                        "AR",

                    availableLanguage: [
                        "Spanish"
                    ]
                }
            ],

            parentOrganization: {

                "@type": "Organization",

                name:
                    tagsSiteConfig.organization.parentOrganization.name,

                url:
                    tagsSiteConfig.organization.parentOrganization.url,
            }
        },

        // =====================================================
        // LOCAL BUSINESS
        // =====================================================

        {
            "@context": "https://schema.org",

            "@type": "LocalBusiness",

            "@id":
                `${tagsSiteConfig.site.url}/#localbusiness`,

            name:
                tagsSiteConfig.contact.name,

            description:
                tagsSiteConfig.site.description,

            image:
                tagsSiteConfig.organization.logo,

            logo:
                tagsSiteConfig.organization.logo,

            url:
                tagsSiteConfig.site.url,

            telephone:
                tagsSiteConfig.contact.phone,

            email:
                tagsSiteConfig.contact.email,

            sameAs:
                Object.values(tagsSiteConfig.social),

            priceRange:
                "$$",

            currenciesAccepted:
                "ARS",

            paymentAccepted: [
                "Cash",
                "Credit Card",
                "Debit Card",
                "Mercado Pago",
                "Bank Transfer"
            ],

            openingHours: [
                "Mo-Fr 09:00-18:00"
            ],

            address: {

                "@type": "PostalAddress",

                streetAddress:
                    tagsSiteConfig.contact.streetAddress,

                addressLocality:
                    tagsSiteConfig.contact.city,

                addressRegion:
                    tagsSiteConfig.contact.region,

                postalCode:
                    tagsSiteConfig.contact.postalCode,

                addressCountry:
                    tagsSiteConfig.contact.country,
            },

            geo: {

                "@type": "GeoCoordinates",

                latitude:
                    -31.905003992017754,

                longitude:
                    -64.5758572,
            },

            hasMap:
                "https://www.google.com/maps?q=-31.905003992017754,-64.5758572",

            parentOrganization: {
                "@id":
                    `${tagsSiteConfig.site.url}/#organization`
            },

            knowsAbout: [

                "Códigos QR",
                "QR dinámicos",
                "Google Reviews",
                "QR para negocios",
                "QR para restaurantes",
                "QR para hoteles",
                "QR para turismo",
                "NFC",
                "Menú digital",
                "Cartelería QR",
                "Estadísticas QR",
                "Gestión QR",
                "QR WhatsApp",
                "QR Instagram"
            ]
        },

        // =====================================================
        // WEBPAGE
        // =====================================================

        {
            "@context": "https://schema.org",

            "@type": "WebPage",

            "@id":
                `${tagsSiteConfig.site.url}/contact#webpage`,

            url:
                `${tagsSiteConfig.site.url}/contact`,

            name:
                "Contacto | Tags",

            description:
                "Página de contacto de Tags para consultas comerciales y soporte sobre soluciones QR.",

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
                    featuredImages[0]
            },

            speakable: {

                "@type":
                    "SpeakableSpecification",

                cssSelector: [
                    ".tags_hero_title",
                    ".tags_hero_subtitle"
                ]
            }
        },

        // =====================================================
        // CONTACT PAGE
        // =====================================================

        {
            "@context": "https://schema.org",

            "@type": "ContactPage",

            "@id":
                `${tagsSiteConfig.site.url}/contact#contactpage`,

            name:
                "Contacto | Tags",

            description:
                "Página de contacto de Tags para consultas comerciales y soporte sobre soluciones QR.",

            url:
                `${tagsSiteConfig.site.url}/contact`,

            isPartOf: {
                "@id":
                    `${tagsSiteConfig.site.url}/#website`
            },

            mainEntity: {
                "@id":
                    `${tagsSiteConfig.site.url}/#localbusiness`
            }
        },

        // =====================================================
        // IMAGE OBJECT
        // =====================================================

        {
            "@context": "https://schema.org",

            "@type": "ImageObject",

            "@id":
                `${tagsSiteConfig.site.url}/contact#heroimage`,

            contentUrl:
                featuredImages[0],

            url:
                featuredImages[0],

            caption:
                "Carteles QR personalizados Tags"
        },

        // =====================================================
        // FAQ PAGE
        // =====================================================

        {
            "@context": "https://schema.org",

            "@type": "FAQPage",

            "@id":
                `${tagsSiteConfig.site.url}/contact#faq`,

            mainEntity: [

                {
                    "@type": "Question",

                    name:
                        "¿Cómo puedo solicitar un presupuesto?",

                    acceptedAnswer: {

                        "@type": "Answer",

                        text:
                            "Podés solicitar un presupuesto completando el formulario de contacto o escribiéndonos por WhatsApp."
                    }
                },

                {
                    "@type": "Question",

                    name:
                        "¿Realizan envíos a toda Argentina?",

                    acceptedAnswer: {

                        "@type": "Answer",

                        text:
                            "Sí. Realizamos envíos de productos QR y cartelería personalizada a todo el país."
                    }
                },

                {
                    "@type": "Question",

                    name:
                        "¿Los códigos QR son editables?",

                    acceptedAnswer: {

                        "@type": "Answer",

                        text:
                            "Sí. Los códigos QR dinámicos permiten modificar el destino sin necesidad de reimprimir el producto."
                    }
                },

                {
                    "@type": "Question",

                    name:
                        "¿Puedo solicitar diseños personalizados?",

                    acceptedAnswer: {

                        "@type": "Answer",

                        text:
                            "Sí. Diseñamos carteles QR personalizados adaptados a la identidad visual de cada negocio."
                    }
                },

                {
                    "@type": "Question",

                    name:
                        "¿Los productos incluyen NFC?",

                    acceptedAnswer: {

                        "@type": "Answer",

                        text:
                            "Sí. Muchos de nuestros productos pueden incorporar tecnología NFC."
                    }
                },

                {
                    "@type": "Question",

                    name:
                        "¿Qué estadísticas ofrece la plataforma?",

                    acceptedAnswer: {

                        "@type": "Answer",

                        text:
                            "La plataforma permite visualizar escaneos, dispositivos, ubicación geográfica y comportamiento de usuarios."
                    }
                }
            ]
        },

        // =====================================================
        // BREADCRUMB
        // =====================================================

        {
            "@context": "https://schema.org",

            "@type": "BreadcrumbList",

            "@id":
                `${tagsSiteConfig.site.url}/contact#breadcrumb`,

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

                    name: "Contacto",

                    item:
                        `${tagsSiteConfig.site.url}/contact`,
                }
            ]
        }
    ];

    return (
        <>

            {/* SEO JSON LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(schemas),
                }}
            />

            <main>

                <Header />

                {/* HERO */}
                <section className="tags_hero_section">

                    <div className="container">

                        <div className="row align-items-center g-5">

                            {/* LEFT */}
                            <div className="col-12 col-lg-6">

                                <div className="tags_hero_content">

                                    <div className="tags_hero_badge">
                                        Contacto Comercial y Asesoramiento
                                    </div>

                                    <h1 className="tags_hero_title">
                                        Soluciones QR inteligentes para
                                        <span>
                                            {" "}
                                            negocios, turismo y eventos
                                        </span>
                                    </h1>

                                    <p className="tags_hero_subtitle">
                                        Contactanos para implementar carteles QR físicos,
                                        códigos QR digitales, Google Reviews,
                                        menús digitales, redes sociales, NFC y
                                        herramientas de estadísticas avanzadas
                                        para tu negocio.
                                    </p>

                                    <div className="tags_hero_features">

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Carteles QR personalizados
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            QR dinámicos editables
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Estadísticas en tiempo real
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Integración NFC
                                        </div>

                                    </div>

                                </div>

                            </div>

                            {/* RIGHT */}
                            <div className="col-12 col-lg-6">

                                <div className="tags_hero_image_wrapper">

                                    <Image
                                        src={featuredImages[0]}
                                        alt="Carteles QR personalizados"
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

                {/* CONTACT */}
                <section className="py-5">

                    <div className="container">

                        <div className="row g-5">

                            {/* FORM */}
                            <div className="col-12 col-lg-7">

                                <div className="tags_card_contact">

                                    <div className="mb-4">

                                        <div className="tags_section_badge">
                                            Contactanos
                                        </div>

                                        <h2 className="tags_section_title mt-3">
                                            Solicitanos información
                                        </h2>

                                        <p className="tags_section_subtitle">
                                            Completá el formulario y elegí si querés
                                            enviar tu consulta por WhatsApp o email.
                                        </p>

                                    </div>

                                    <ContactForm />

                                </div>

                            </div>

                            {/* INFO */}
                            <div className="col-12 col-lg-5">

                                <div className="tags_card_contact_info">

                                    <div className="tags_section_badge">
                                        Información
                                    </div>

                                    <h3 className="mt-3 mb-4">
                                        Datos de contacto
                                    </h3>

                                    <div className="tags_contact_item">

                                        <strong>
                                            Empresa
                                        </strong>

                                        <p>
                                            {tagsSiteConfig.contact.name}
                                        </p>

                                    </div>

                                    <div className="tags_contact_item">

                                        <strong>
                                            Dirección
                                        </strong>

                                        <p>
                                            {tagsSiteConfig.contact.address}
                                        </p>

                                    </div>

                                    <div className="tags_contact_item">

                                        <strong>
                                            Teléfono
                                        </strong>

                                        <p>
                                            {tagsSiteConfig.contact.phone}
                                        </p>

                                    </div>

                                    <div className="tags_contact_item">

                                        <strong>
                                            Email
                                        </strong>

                                        <p>
                                            {tagsSiteConfig.contact.email}
                                        </p>

                                    </div>

                                    <div className="tags_contact_item">

                                        <strong>
                                            Sitio web
                                        </strong>

                                        <p>
                                            {tagsSiteConfig.contact.web}
                                        </p>

                                    </div>



                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                {/* IMAGES */}
                <section className="tags_contact_gallery">

                    <div className="container">

                        <div className="row g-4">

                            {featuredImages.map((img, index) => (

                                <div
                                    className="col-6 col-lg-3"
                                    key={index}
                                >

                                    <div className="tags_contact_gallery_card">

                                        <Image
                                            src={img}
                                            alt="Productos QR Tags"
                                            width={500}
                                            height={500}
                                            className="img-fluid"
                                        />

                                    </div>

                                </div>

                            ))}

                        </div>

                    </div>

                </section>

                {/* SEO CONTENT */}
                <section className="tags_contact_seo">

                    <div className="container">

                        <div className="tags_contact_seo_content">

                            <div className="tags_contact_badge">
                                Plataforma QR + Productos físicos
                            </div>

                            <h2 className="tags_contact_seo_title">
                                Soluciones QR inteligentes para negocios
                            </h2>

                            <p className="tags_contact_seo_text">

                                En Tags desarrollamos soluciones completas de
                                códigos QR dinámicos para negocios, restaurantes,
                                hoteles, turismo, comercios y eventos.

                            </p>

                            <p className="tags_contact_seo_text">

                                Fabricamos carteles QR físicos personalizados en
                                acrílico, PVC, stickers premium y formatos digitales
                                descargables para Google Reviews, WhatsApp,
                                Instagram, Facebook, sitios web y menús digitales.

                            </p>

                            <p className="tags_contact_seo_text">

                                Nuestra plataforma permite gestionar códigos QR
                                dinámicos, visualizar estadísticas de escaneo,
                                modificar enlaces sin reimprimir productos y
                                analizar el comportamiento de los usuarios en
                                tiempo real.

                            </p>

                            <p className="tags_contact_seo_text">

                                También desarrollamos soluciones con tecnología NFC
                                para facilitar interacciones rápidas desde celulares
                                compatibles y mejorar la experiencia del cliente.

                            </p>

                        </div>

                    </div>

                </section>

                <Footer />

                <div
                    className="m-0 p-0"
                    style={{ maxWidth: "1600px" }}
                >
                    {/* <WhatsAppFloat /> */}
                </div>

            </main>

        </>
    );
}