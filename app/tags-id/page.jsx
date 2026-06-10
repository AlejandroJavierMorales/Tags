// app/tags-id/page.jsx

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

const PAGE_PATH = "/tags-id";

const PAGE_URL =
    `${tagsSiteConfig.site.url}${PAGE_PATH}`;

const IMAGE_URL =
    `${tagsSiteConfig.site.url}/assets/images/tags/tags_qr_whatsapp.webp`;

const faqItems = [
    {
        question:
            "¿Qué es Tags Id?",

        answer:
            "Tags Id es una tarjeta personal digital inteligente. Permite compartir tu perfil, datos de contacto, redes, links y vCard desde un QR o NFC.",
    },
    {
        question:
            "¿Reemplaza a una tarjeta personal tradicional?",

        answer:
            "Sí. Tags Id lleva tu presentación a otro nivel: en vez de entregar una tarjeta que puede perderse, compartís un perfil digital que la otra persona puede guardar en su celular.",
    },
    {
        question:
            "¿La otra persona puede agendar mi contacto?",

        answer:
            "Sí. Tags Id puede incluir un botón para descargar tu vCard y guardar tu contacto instantáneamente.",
    },
    {
        question:
            "¿Funciona con QR y NFC?",

        answer:
            "Sí. Podés compartir tu Tags Id escaneando un QR o acercando el celular a una tarjeta, sticker o soporte con NFC.",
    },
    {
        question:
            "¿Puedo usarlo como curriculum o perfil profesional?",

        answer:
            "Sí. Tags Id puede funcionar como perfil personal, presentación profesional, portfolio, curriculum digital o tarjeta comercial.",
    },
    {
        question:
            "¿Puedo personalizar mi perfil?",

        answer:
            "Sí. Podés personalizar textos, imágenes, enlaces, redes, botones, colores y estilo visual.",
    },
];

export const metadata = {

    metadataBase:
        new URL(tagsSiteConfig.site.url),

    title:
        "Tags Id | Tarjeta Personal Digital Inteligente con QR y NFC",

    description:
        "Reemplazá las tarjetas personales tradicionales por una tarjeta digital inteligente con QR, NFC, perfil profesional, redes, links y vCard para guardar contactos.",

    keywords: [
        ...tagsSiteConfig.seo.keywords,
        "tarjeta personal digital",
        "tarjeta digital",
        "tarjeta NFC",
        "tarjeta QR",
        "business card digital",
        "vCard QR",
        "perfil profesional digital",
        "curriculum digital",
        "networking digital",
        "tarjeta inteligente",
    ],

    alternates: {
        canonical:
            PAGE_PATH,
    },

    openGraph: {

        title:
            "Tags Id | Tu tarjeta personal digital inteligente",

        description:
            "Compartí tu perfil, contacto, redes y vCard con QR o NFC. Basta de tarjetas personales olvidadas.",

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
                    "/assets/images/og/tags-id-og.webp",

                width:
                    1200,

                height:
                    630,

                alt:
                    "Tags Id tarjeta personal digital",
            }
        ]
    },

    twitter: {

        card:
            "summary_large_image",

        title:
            "Tags Id | Tarjeta digital con QR y NFC",

        description:
            "Tu presentación profesional en una tarjeta digital inteligente.",

        images: [
            "/assets/images/og/tags-id-og.webp",
        ],
    },
};

export default function TagsIdLanding() {

    const webPageSchema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${PAGE_URL}/#webpage`,
        url: PAGE_URL,
        name: "Tags Id | Tarjeta personal digital inteligente",
        description:
            "Tarjeta personal digital con QR, NFC, perfil profesional, vCard, redes sociales y enlaces.",
        inLanguage: "es-AR",
        isPartOf: {
            "@id":
                `${tagsSiteConfig.site.url}/#website`
        },
        about: {
            "@id":
                `${tagsSiteConfig.site.url}/#organization`
        },
    };

    const serviceSchema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${PAGE_URL}/#service`,
        name: "Tags Id",
        serviceType: [
            "Tarjeta personal digital",
            "Tarjeta NFC",
            "Perfil profesional digital",
            "vCard QR"
        ],
        description:
            "Servicio de tarjeta personal digital inteligente con QR, NFC, vCard y perfil profesional.",
        provider: {
            "@id":
                `${tagsSiteConfig.site.url}/#organization`
        },
        areaServed: {
            "@type": "Country",
            name: "Argentina"
        }
    };

    const breadcrumbs = [
        ...tagsSiteConfig.breadcrumbsBase,
        {
            name:
                "Tags Id",

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
                                        Tarjeta Digital • QR • NFC • vCard
                                    </div>

                                    <h1 className="tags_hero_title">
                                        Basta de tarjetas personales
                                        <span> que nadie vuelve a mirar</span>
                                    </h1>

                                    <p className="tags_hero_subtitle">
                                        Con Tags Id compartís tu perfil,
                                        contacto, redes y presentación profesional
                                        desde un QR o NFC. Cuando te pregunten
                                        qué hacés, simplemente pediles que escaneen
                                        o acerquen el celular.
                                    </p>

                                    <div className="tags_hero_features">

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Contacto guardable con vCard
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Perfil profesional digital
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            QR y tecnología NFC
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Redes, links y portfolio
                                        </div>

                                    </div>

                                    <div className="tags_hero_mobile_image d-block d-lg-none">

                                        <Image
                                            src="/assets/images/tags-id/tags-id-targeta-personal-digital.webp"
                                            alt="Tags Id tarjeta personal digital"
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
                                            Ver Tags Id
                                        </Link>

                                    </div>

                                    <div className="tags_hero_bottom_text">
                                        Ideal para profesionales, emprendedores,
                                        vendedores, representantes, artistas,
                                        técnicos, freelancers, eventos,
                                        networking y búsqueda laboral.
                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-lg-6">

                                <div className="tags_hero_image_wrapper d-none d-lg-block">

                                    <Image
                                        src="/assets/images/tags-id/tags-id-targeta-personal-digital.webp"
                                        alt="Tags Id tarjeta digital con QR y NFC"
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
                                Presentación profesional
                            </div>

                            <h2 className="tags_products_title">
                                Tu información siempre actualizada y lista para compartir
                            </h2>

                            <p className="tags_products_subtitle">
                                Una tarjeta tradicional se entrega una vez y se olvida.
                                Tags Id se comparte en segundos, se guarda en el celular
                                y puede actualizarse cuando lo necesites.
                            </p>

                        </div>

                        <div className="row g-4">

                            {[
                                {
                                    icon: "📇",
                                    title: "No más tarjetas olvidadas",
                                    text: "Compartí una presentación digital que la otra persona puede guardar, abrir y volver a consultar.",
                                },
                                {
                                    icon: "📲",
                                    title: "Agendan tu contacto al instante",
                                    text: "Con tecnología vCard, pueden guardar tu nombre, teléfono, email y datos profesionales con un botón.",
                                },
                                {
                                    icon: "🧑‍💼",
                                    title: "Mostrá quién sos y qué hacés",
                                    text: "Incluí presentación, cargo, empresa, servicios, redes, portfolio, curriculum o links importantes.",
                                },
                                {
                                    icon: "🔄",
                                    title: "Actualizable cuando quieras",
                                    text: "Si cambiás teléfono, redes, trabajo o servicios, actualizás tu perfil sin imprimir nada nuevo.",
                                },
                                {
                                    icon: "✨",
                                    title: "Imagen más profesional",
                                    text: "Cuando alguien escanea tu Tags Id, accede a una presentación moderna y cuidada.",
                                },
                                {
                                    icon: "🤝",
                                    title: "Ideal para networking",
                                    text: "Perfecto para reuniones, ferias, eventos, entrevistas, clientes y presentaciones comerciales.",
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
                                Cómo se usa
                            </div>

                            <h2 className="tags_services_title">
                                Presentarte nunca fue tan simple
                            </h2>

                            <p className="tags_services_subtitle">
                                En vez de buscar una tarjeta en la billetera,
                                compartís tu perfil digital en segundos.
                            </p>

                        </div>

                        {[
                            {
                                number: "01",
                                title: "Configurá tu Tags Id",
                                text: "Puede estar en una tarjeta NFC, sticker, credencial, QR digital o cualquier soporte personalizado.",
                                image: "/assets/images/tags-id/tags-id-configuracion-desde-telefono.webp",
                            },
                            {
                                number: "02",
                                title: "Escanean o acercan el celular",
                                text: "La otra persona accede a tu perfil profesional sin instalar ninguna aplicación.",
                                image: "/assets/images/tags-id/tags-id-reunion-profesionales.webp",
                            },
                            {
                                number: "03",
                                title: "Guardan tu contacto",
                                text: "Con un botón pueden agendarte en el celular y conservar tus datos siempre disponibles.",
                                image: "/assets/images/tags-id/tags-id-configuracion-de-perfil.webp",
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

                {/* PROFILE */}

                <section className="tags_features_section">

                    <div className="tags_features_glow"></div>

                    <div className="container">

                        <div className="tags_features_header">

                            <div className="tags_features_badge">
                                Tu perfil digital
                            </div>

                            <h2 className="tags_features_title">
                                Mucho más que nombre, teléfono y email
                            </h2>

                            <p className="tags_features_subtitle">
                                Tags Id puede convertirse en tu presentación,
                                portfolio, curriculum, tarjeta comercial
                                o perfil profesional online.
                            </p>

                        </div>

                        <div className="row align-items-center g-5">

                            <div className="col-12 col-lg-5">

                                <div className="tags_features_image_wrapper">

                                    <Image
                                        src="/assets/images/tags-id/tags-id-portfolio-personal.webp"
                                        alt="Perfil digital Tags Id"
                                        width={900}
                                        height={672}
                                        className="img-fluid tags_features_image"
                                    />

                                    <div className="tags_features_image_badge">
                                        Perfil, links y contacto
                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-lg-7">

                                <div className="tags_features_content">

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Todo lo que querés mostrar
                                        </h3>

                                        <p>
                                            Nombre, foto, cargo, empresa,
                                            descripción personal, servicios,
                                            redes sociales, WhatsApp, email,
                                            sitio web, portfolio o curriculum.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Se adapta a tu estilo
                                        </h3>

                                        <p>
                                            Podés personalizar el diseño,
                                            colores, imágenes y contenido
                                            para que tu presentación se vea
                                            coherente con tu marca personal.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Siempre vigente
                                        </h3>

                                        <p>
                                            Tu información puede actualizarse
                                            sin cambiar la tarjeta física,
                                            el QR o el soporte NFC.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box tags_features_highlight">

                                        <h4>
                                            Ideal para:
                                        </h4>

                                        <div className="tags_features_tags">

                                            <span>Profesionales</span>
                                            <span>Emprendedores</span>
                                            <span>Vendedores</span>
                                            <span>Freelancers</span>
                                            <span>Eventos</span>
                                            <span>Curriculum</span>
                                            <span>Networking</span>
                                            <span>Marcas personales</span>

                                        </div>

                                    </div>

                                    <div className="tags_features_cta">

                                        <p>
                                            Llevá tu presentación personal a otro nivel.
                                        </p>

                                        <Link
                                            href="/contact"
                                            className="tags_features_button"
                                        >
                                            Consultar Tags Id
                                        </Link>

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
                                El futuro de la tarjeta personal
                            </div>

                            <h2>
                                Que te recuerden por cómo te presentás
                            </h2>

                            <p>
                                Tags Id transforma una presentación común
                                en una experiencia moderna, simple y profesional.
                                La otra persona no solo recibe tus datos:
                                accede a tu mundo profesional.
                            </p>

                            <p>
                                Basta de tarjetas guardadas en un cajón.
                                Compartí una presentación viva,
                                actualizable y lista para convertir contactos
                                en oportunidades reales.
                            </p>

                            <div className="tags_hero_buttons justify-content-center mt-4">

                                <Link
                                    href="/store-products"
                                    className="tags_btn_primary"
                                >
                                    Ver Tags Id
                                </Link>

                                <Link
                                    href="/contact"
                                    className="tags_btn_secondary"
                                >
                                    Consultar
                                </Link>

                            </div>

                        </div>

                    </div>

                </section>

                <FAQs
                    title="Preguntas frecuentes sobre Tags Id"
                    subtitle="Todo lo que necesitás saber sobre tarjetas personales digitales inteligentes."
                    faqs={faqItems}
                />

                <TagsFooter />

                <WhatsAppFloat />

            </main>
        </>
    );
}