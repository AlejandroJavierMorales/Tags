// app/e-events/page.jsx

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
    "/e-events";

const PAGE_URL =
    `${tagsSiteConfig.site.url}${PAGE_PATH}`;

const faqItems = [
    {
        question:
            "¿Qué es Tags eEvents?",

        answer:
            "Tags eEvents es una plataforma para organizar eventos inteligentes: invitaciones digitales, confirmaciones, invitados, acompañantes, check-in QR, cronograma, playlist, contenido social y mensajes post evento.",
    },
    {
        question:
            "¿Sirve para casamientos, cumpleaños y eventos empresariales?",

        answer:
            "Sí. Puede adaptarse a casamientos, cumpleaños, fiestas privadas, eventos corporativos, congresos, workshops, cenas, lanzamientos y celebraciones especiales.",
    },
    {
        question:
            "¿Cada invitado puede tener su propio QR?",

        answer:
            "Sí. Cada invitado puede recibir un QR único para confirmar asistencia y validar su ingreso durante el check-in.",
    },
    {
        question:
            "¿Puedo gestionar acompañantes y restricciones alimentarias?",

        answer:
            "Sí. Podés gestionar invitados, acompañantes, confirmaciones, cancelaciones y restricciones alimentarias desde la plataforma.",
    },
    {
        question:
            "¿Los invitados pueden interactuar durante el evento?",

        answer:
            "Sí. Pueden acceder al cronograma, playlist, menú, redes sociales, compartir fotos, videos, mensajes y participar de la experiencia digital del evento.",
    },
    {
        question:
            "¿Se pueden enviar mensajes después del evento?",

        answer:
            "Sí. Podés enviar mensajes de agradecimiento post evento y mantener centralizados recuerdos, fotos e información relevante.",
    },
];

export const metadata = {

    metadataBase:
        new URL(tagsSiteConfig.site.url),

    title:
        "Tags eEvents | Invitaciones Digitales, Check-In QR y Gestión de Eventos",

    description:
        "Organizá eventos inteligentes con invitaciones digitales, confirmaciones, invitados, acompañantes, check-in QR, cronograma, playlist, contenido social y mensajes post evento.",

    keywords: [
        ...tagsSiteConfig.seo.keywords,
        "eventos inteligentes",
        "invitaciones digitales",
        "invitaciones QR",
        "QR para eventos",
        "check in QR",
        "gestión de invitados",
        "confirmación asistencia",
        "RSVP digital",
        "control de acceso eventos",
        "invitaciones por WhatsApp",
        "QR casamientos",
        "QR cumpleaños",
        "sistema para eventos",
        "plataforma de eventos",
        "organización de eventos",
    ],

    alternates: {
        canonical:
            PAGE_PATH,
    },

    openGraph: {

        title:
            "Tags eEvents | Todo tu evento en una sola plataforma",

        description:
            "Invitaciones digitales, QR únicos, confirmaciones, check-in, cronograma, playlist y experiencia social para eventos modernos.",

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
                    "/assets/images/og/tags-e-events-og.webp",

                width:
                    1200,

                height:
                    630,

                alt:
                    "Tags eEvents plataforma de eventos inteligentes",
            }
        ]
    },

    twitter: {

        card:
            "summary_large_image",

        title:
            "Tags eEvents | Eventos inteligentes con QR",

        description:
            "Organizá tu evento desde la invitación hasta el agradecimiento final.",

        images: [
            "/assets/images/og/tags-e-events-og.webp",
        ],
    },
};

export default function EEventsLanding() {

    const webPageSchema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${PAGE_URL}/#webpage`,
        url: PAGE_URL,
        name: "Tags eEvents",
        description:
            "Plataforma de eventos inteligentes con invitaciones digitales, QR, check-in y gestión completa.",
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
        name: "Tags eEvents",
        serviceType: [
            "Invitaciones digitales",
            "Gestión de eventos",
            "Check-In QR",
            "RSVP digital",
            "Gestión de invitados"
        ],
        description:
            "Servicio para gestionar eventos inteligentes desde la invitación hasta el post evento.",
        provider: {
            "@id":
                `${tagsSiteConfig.site.url}/#organization`
        },
        areaServed: {
            "@type": "Country",
            name: "Argentina"
        }
    };

    const softwareSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "@id": `${PAGE_URL}/#software`,
        name: "Tags eEvents",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: PAGE_URL,
        description:
            "Aplicación web para invitaciones digitales, gestión de invitados, confirmaciones, check-in QR y experiencia digital del evento.",
        publisher: {
            "@id":
                `${tagsSiteConfig.site.url}/#organization`
        },
        featureList: [
            "Invitaciones digitales",
            "Confirmaciones de asistencia",
            "QR único por invitado",
            "Check-in QR",
            "Gestión de acompañantes",
            "Restricciones alimentarias",
            "Cronograma del evento",
            "Carta o menú digital",
            "Playlist",
            "Social media durante el evento",
            "Fotos y videos compartidos",
            "Mensajes de agradecimiento post evento",
            "Dashboard de seguimiento"
        ],
        offers: {
            "@type": "Offer",
            url: `${tagsSiteConfig.site.url}/store-products`,
            price: "0",
            priceCurrency: "ARS",
            availability: "https://schema.org/InStock"
        }
    };

    const eventServiceList = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "@id": `${PAGE_URL}/#features`,
        name: "Funcionalidades de Tags eEvents",
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                name: "Invitaciones digitales"
            },
            {
                "@type": "ListItem",
                position: 2,
                name: "Confirmación de asistencia"
            },
            {
                "@type": "ListItem",
                position: 3,
                name: "Check-in QR"
            },
            {
                "@type": "ListItem",
                position: 4,
                name: "Gestión de invitados y acompañantes"
            },
            {
                "@type": "ListItem",
                position: 5,
                name: "Cronograma, playlist y experiencia social"
            },
            {
                "@type": "ListItem",
                position: 6,
                name: "Mensajes post evento"
            }
        ]
    };

    const breadcrumbs = [
        ...tagsSiteConfig.breadcrumbsBase,
        {
            name:
                "Tags eEvents",

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
        softwareSchema,
        eventServiceList,
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
                                        Invitaciones • QR • Check-In • Experiencia Digital
                                    </div>

                                    <h1 className="tags_hero_title">
                                        Todo tu evento
                                        <span> en una sola plataforma</span>
                                    </h1>

                                    <p className="tags_hero_subtitle">
                                        Organizá invitaciones digitales,
                                        confirmaciones, invitados, acompañantes,
                                        check-in QR, cronograma, playlist,
                                        redes sociales y mensajes post evento
                                        desde un solo lugar.
                                    </p>

                                    <div className="tags_hero_features">

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Invitaciones digitales modernas
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            QR único por invitado
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Check-In desde celular
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Experiencia durante y después del evento
                                        </div>

                                    </div>

                                    <div className="tags_hero_mobile_image d-block d-lg-none">

                                        <Image
                                            src="/assets/images/e-events/tags-e-events-checkin.webp"
                                            alt="Tags eEvents eventos inteligentes"
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

                                        <Link
                                            href="/contact"
                                            className="tags_btn_secondary"
                                        >
                                            Consultanos!
                                        </Link>

                                    </div>

                                    <div className="tags_hero_bottom_text">
                                        Menos listas, menos caos, menos mensajes perdidos.
                                        Más organización, más interacción y una experiencia
                                        más moderna para tus invitados.
                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-lg-6">

                                <div className="tags_hero_image_wrapper d-none d-lg-block">

                                    <Image
                                        src="/assets/images/e-events/tags-e-events-checkin.webp"
                                        alt="Plataforma Tags eEvents"
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

                {/* FULL JOURNEY */}

                <section className="tags_products_section">

                    <div className="container">

                        <div className="tags_products_header">

                            <div className="tags_products_badge">
                                Circuito completo
                            </div>

                            <h2 className="tags_products_title">
                                Desde crear el evento hasta despedir a tus invitados
                            </h2>

                            <p className="tags_products_subtitle">
                                Tags eEvents acompaña todo el proceso:
                                antes, durante y después del evento.
                                No es solo una invitación digital,
                                es una experiencia completa.
                            </p>

                        </div>

                        <div className="row g-4">

                            {[
                                {
                                    icon: "📝",
                                    title: "Creá tu evento",
                                    text: "Configurá fecha, lugar, datos importantes, imagen, estilo y toda la información inicial.",
                                },
                                {
                                    icon: "💌",
                                    title: "Enviá invitaciones",
                                    text: "Compartí invitaciones digitales modernas por WhatsApp, email o redes.",
                                },
                                {
                                    icon: "✅",
                                    title: "Confirmá asistencia",
                                    text: "Tus invitados pueden confirmar, cancelar o informar acompañantes desde el celular.",
                                },
                                {
                                    icon: "🍽️",
                                    title: "Gestioná detalles",
                                    text: "Organizá mesas, restricciones alimentarias, menú, cronograma y necesidades especiales.",
                                },
                                {
                                    icon: "🎟️",
                                    title: "Controlá el ingreso",
                                    text: "Cada invitado puede tener un QR único para validar acceso en segundos.",
                                },
                                {
                                    icon: "💬",
                                    title: "Cerrá con agradecimiento",
                                    text: "Después del evento podés enviar mensajes, recuerdos y mantener viva la experiencia.",
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

                {/* BEFORE DURING AFTER */}

                <section className="tags_services_section">

                    <div className="container">

                        <div className="tags_services_header">

                            <div className="tags_services_badge">
                                Antes • Durante • Después
                            </div>

                            <h2 className="tags_services_title">
                                El evento empieza mucho antes de la fiesta
                            </h2>

                            <p className="tags_services_subtitle">
                                Desde la primera invitación hasta el último
                                mensaje de agradecimiento, todo puede estar
                                conectado en una misma experiencia.
                            </p>

                        </div>

                        {[
                            {
                                number: "01",
                                title: "Antes del evento",
                                text: "Creá invitaciones digitales, compartilas por WhatsApp, recibí confirmaciones, organizá invitados, acompañantes, mesas y restricciones alimentarias.",
                                image: "/assets/images/e-events/tags-e-events-preevento.webp",
                            },
                            {
                                number: "02",
                                title: "Durante el evento",
                                text: "Validá ingresos con QR, compartí cronograma, menú, playlist, redes sociales, fotos, videos y mensajes en vivo.",
                                image: "/assets/images/e-events/tags-e-events-social-media.webp",
                            },
                            {
                                number: "03",
                                title: "Después del evento",
                                text: "Enviá mensajes de agradecimiento, reuní recuerdos, compartí fotos y mantené viva la experiencia después de la celebración.",
                                image: "/assets/images/e-events/tags-e-events-post.webp",
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

                {/* EXPERIENCE */}

                <section className="tags_features_section">

                    <div className="tags_features_glow"></div>

                    <div className="container">

                        <div className="tags_features_header">

                            <div className="tags_features_badge">
                                Experiencia para invitados
                            </div>

                            <h2 className="tags_features_title">
                                Que tus invitados vivan algo más que una invitación
                            </h2>

                            <p className="tags_features_subtitle">
                                Cada invitado puede interactuar con el evento
                                desde su celular: confirmar, consultar información,
                                compartir recuerdos y participar.
                            </p>

                        </div>

                        <div className="row align-items-center g-5">

                            <div className="col-12 col-lg-5">

                                <div className="tags_features_image_wrapper">

                                    <Image
                                        src="/assets/images/e-events/tags-e-events-dashboard.webp"
                                        alt="Experiencia digital para eventos"
                                        width={900}
                                        height={672}
                                        className="img-fluid tags_features_image"
                                    />

                                    <div className="tags_features_image_badge">
                                        Invitados conectados al evento
                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-lg-7">

                                <div className="tags_features_content">

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Invitaciones digitales modernas
                                        </h3>

                                        <p>
                                            Compartí una invitación elegante,
                                            clara y fácil de usar, con toda la
                                            información importante del evento.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Cronograma, menú y playlist
                                        </h3>

                                        <p>
                                            Mostrá horarios, momentos clave,
                                            carta o menú, playlist y detalles
                                            importantes para que todos estén informados.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Social media durante el evento
                                        </h3>

                                        <p>
                                            Los invitados pueden compartir fotos,
                                            videos, mensajes y contenido social,
                                            generando una experiencia más viva
                                            y participativa.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Check-In QR simple y rápido
                                        </h3>

                                        <p>
                                            El staff puede validar ingresos
                                            desde cualquier celular, sin listas
                                            impresas ni equipamiento complejo.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box tags_features_highlight">

                                        <h4>
                                            Ideal para:
                                        </h4>

                                        <div className="tags_features_tags">

                                            <span>Casamientos</span>
                                            <span>Cumpleaños</span>
                                            <span>Fiestas privadas</span>
                                            <span>Eventos corporativos</span>
                                            <span>Congresos</span>
                                            <span>Workshops</span>
                                            <span>Cenas</span>
                                            <span>Lanzamientos</span>

                                        </div>

                                    </div>

                                    <div className="tags_features_cta">

                                        <p>
                                            Tecnología simple para que puedas disfrutar más tu evento.
                                        </p>

                                        <Link
                                            href="/contact"
                                            className="tags_features_button"
                                        >
                                            Consultar eEvents
                                        </Link>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                {/* DASHBOARD */}

                <section className="tags_products_section">

                    <div className="container">

                        <div className="tags_products_header">

                            <div className="tags_products_badge">
                                Organización real
                            </div>

                            <h2 className="tags_products_title">
                                Menos planillas. Más control.
                            </h2>

                            <p className="tags_products_subtitle">
                                Visualizá invitados, confirmaciones,
                                pendientes, accesos, restricciones y detalles
                                importantes desde un panel simple.
                            </p>

                        </div>

                        <div className="row g-4">

                            {[
                                {
                                    icon: "👥",
                                    title: "Invitados y grupos",
                                    text: "Gestioná personas, familias, grupos, acompañantes y estados de asistencia.",
                                },
                                {
                                    icon: "📍",
                                    title: "Mesas y ubicación",
                                    text: "Organizá distribución, capacidad y asignaciones sin perder el control.",
                                },
                                {
                                    icon: "🥗",
                                    title: "Restricciones alimentarias",
                                    text: "Registrá necesidades especiales para anticiparte y evitar problemas.",
                                },
                                {
                                    icon: "📊",
                                    title: "Seguimiento en tiempo real",
                                    text: "Conocé confirmaciones, check-ins, pendientes y actividad del evento.",
                                },
                                {
                                    icon: "🔐",
                                    title: "Accesos para staff",
                                    text: "Permití que organizadores o recepción gestionen ingresos y validaciones.",
                                },
                                {
                                    icon: "📤",
                                    title: "Comunicación post evento",
                                    text: "Enviá agradecimientos y compartí recuerdos cuando el evento terminó.",
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

                {/* CTA */}

                <section className="tags_store_info">

                    <div className="container">

                        <div className="tags_store_info_card">

                            <div className="tags_products_badge mb-4">
                                Disfrutá más. Organizá mejor.
                            </div>

                            <h2>
                                Menos caos. Más experiencia.
                            </h2>

                            <p>
                                Tags eEvents ayuda a que tu evento sea
                                más organizado, moderno y memorable,
                                desde la primera invitación hasta el mensaje
                                final de agradecimiento.
                            </p>

                            <p>
                                No se trata solo de gestionar invitados.
                                Se trata de crear una experiencia completa
                                para vos y para quienes participan.
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
                                    Consultar
                                </Link>

                            </div>

                        </div>

                    </div>

                </section>

                <FAQs
                    title="Preguntas frecuentes sobre Tags eEvents"
                    subtitle="Todo lo que necesitás saber sobre eventos inteligentes, invitaciones digitales y check-in QR."
                    faqs={faqItems}
                />

                <TagsFooter />

                <WhatsAppFloat />

            </main>
        </>
    );
}