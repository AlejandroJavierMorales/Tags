// app/tags/contact/page.jsx

import "@/app/styles/tags_landing.css";

import Image from "next/image";

import Header from "../components/landing/Header";
import Footer from "../components/landing/Footer";
import WhatsAppFloat from "../components/WhatsAppFloat";

import ContactForm from "../components/contact/ContactForm";


import { catalogue } from "../config/catalogue";
import { tagsSiteConfig } from "../config/configSite";

import {
    getOrganizationSchema,
    getWebsiteSchema,
    getLocalBusinessSchema,
    getSoftwareSchema,
    getFAQSchema,
    getBreadcrumbSchema
} from "@/app/lib/seo";

const PAGE_PATH = "/contact";

const PAGE_URL =
    process.env.NEXT_PUBLIC_BASE_URL_PROD
    || "http://localhost:3000";

const IMAGE_URL =
    `${tagsSiteConfig.site.url}/assets/images/og/tags-contacto-og.webp`;

export const metadata = {
    metadataBase:
        new URL(tagsSiteConfig.site.url),

    title:
        "Contacto | Tags - Soluciones QR, NFC y Carteles Personalizados",

    description:
        "Contactate con Tags para solicitar carteles QR personalizados, QR dinámicos, Google Reviews, NFC, stickers QR, menú digital y plataforma de estadísticas.",

    keywords: [
        ...tagsSiteConfig.seo.keywords,
        "Contacto Tags",
        "Carteles QR personalizados",
        "QR dinámicos",
        "Google Reviews QR",
        "QR NFC",
        "WhatsApp QR",
        "Menú digital",
        "Stickers QR",
        "Plataforma QR",
    ],

    alternates: {
        canonical:
            PAGE_PATH,
    },

    openGraph: {
        title:
            "Contacto | Tags - Soluciones QR para negocios",

        description:
            "Consultá por productos QR físicos, NFC, Google Reviews, menú digital, WhatsApp QR y plataforma de estadísticas.",

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
                    IMAGE_URL,

                width:
                    1200,

                height:
                    630,

                alt:
                    "Contacto Tags soluciones QR y NFC",
            }
        ],
    },

    twitter: {
        card:
            "summary_large_image",

        title:
            "Contacto | Tags",

        description:
            "Solicitá soluciones QR, NFC y cartelería personalizada para tu negocio.",

        images: [
            IMAGE_URL,
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
        },
    },
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

    const faqItems = [
        {
            question: "¿Cómo puedo solicitar un presupuesto?",
            answer: "Podés solicitar un presupuesto completando el formulario de contacto o escribiéndonos por WhatsApp.",
        },
        {
            question: "¿Realizan envíos a toda Argentina?",
            answer: "Sí. Realizamos envíos de productos QR y cartelería personalizada a todo el país.",
        },
        {
            question: "¿Los códigos QR son editables?",
            answer: "Sí. Los códigos QR dinámicos permiten modificar el destino sin necesidad de reimprimir el producto.",
        },
        {
            question: "¿Puedo solicitar diseños personalizados?",
            answer: "Sí. Diseñamos carteles QR personalizados adaptados a la identidad visual de cada negocio.",
        },
        {
            question: "¿Los productos incluyen NFC?",
            answer: "Sí. Muchos de nuestros productos pueden incorporar tecnología NFC.",
        },
        {
            question: "¿Qué estadísticas ofrece la plataforma?",
            answer: "La plataforma permite visualizar escaneos, dispositivos, ubicación geográfica y comportamiento de usuarios.",
        },
    ];

    const webPageSchema = {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "@id": `${PAGE_URL}/#webpage`,
        url: PAGE_URL,
        name: "Contacto | Tags",
        description:
            "Página de contacto de Tags para consultas comerciales y soporte sobre soluciones QR, NFC y cartelería personalizada.",
        inLanguage: "es-AR",
        isPartOf: {
            "@id": `${tagsSiteConfig.site.url}/#website`
        },
        about: {
            "@id": `${tagsSiteConfig.site.url}/#organization`
        },
        mainEntity: {
            "@id": `${tagsSiteConfig.site.url}/#localbusiness`
        },
        primaryImageOfPage: {
            "@type": "ImageObject",
            "@id": `${PAGE_URL}/#primaryimage`,
            url: IMAGE_URL,
            contentUrl: IMAGE_URL,
            width: 1200,
            height: 630,
            caption: "Contacto Tags soluciones QR y NFC"
        }
    };

    const serviceSchema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${PAGE_URL}/#service`,
        name: "Asesoramiento comercial Tags",
        serviceType: [
            "Soluciones QR",
            "Carteles QR personalizados",
            "QR dinámicos",
            "NFC para negocios",
            "Google Reviews QR",
            "Menú digital"
        ],
        description:
            "Servicio de asesoramiento para implementar soluciones QR físicas, digitales, NFC y plataforma de estadísticas para negocios.",
        provider: {
            "@id": `${tagsSiteConfig.site.url}/#organization`
        },
        areaServed: {
            "@type": "Country",
            name: "Argentina"
        }
    };

    const breadcrumbs = [
        ...tagsSiteConfig.breadcrumbsBase,
        {
            name: "Contacto",
            url: PAGE_URL,
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