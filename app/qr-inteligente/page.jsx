// app/qr-inteligente/page.jsx

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
import ProductCarousel from "../components/landing/ProductCarousel";

const PAGE_PATH =
    "/qr-inteligente";

const PAGE_URL =
    `${tagsSiteConfig.site.url}${PAGE_PATH}`;

const faqItems = [
    {
        question:
            "¿Qué es un QR Inteligente?",

        answer:
            "Es un código QR que podés activar, editar, pausar, reutilizar y medir desde una plataforma online, sin volver a imprimirlo.",
    },
    {
        question:
            "¿Puedo cambiar el link después de imprimir el QR?",

        answer:
            "Sí. El QR sigue siendo el mismo, pero desde tu panel podés cambiar el destino cuando quieras.",
    },
    {
        question:
            "¿Cuánto tarda en activarse?",

        answer:
            "Podés activarlo en segundos desde el primer escaneo, asociándolo a tu email y configurando su destino.",
    },
    {
        question:
            "¿Puedo pausar un QR?",

        answer:
            "Sí. Podés pausarlo y mostrar un mensaje personalizado mientras no esté activo.",
    },
    {
        question:
            "¿Puedo ver estadísticas?",

        answer:
            "Sí. Podés ver escaneos, horarios, ciudades, dispositivos, comportamiento y generar reportes.",
    },
];

export const metadata = {

    metadataBase:
        new URL(tagsSiteConfig.site.url),

    title:
        "QR Inteligente | QR Editable con Estadísticas y Control Total | Tags",

    description:
        "Activá, editá, pausá y administrá tus QR desde una plataforma inteligente con estadísticas, reportes y control total sin volver a imprimir.",

    keywords: [
        ...tagsSiteConfig.seo.keywords,
        "QR inteligente",
        "QR dinámico",
        "QR editable",
        "QR con estadísticas",
        "QR con analytics",
        "QR reutilizable",
        "QR para negocios",
        "QR con reportes",
        "código QR editable",
    ],

    alternates: {
        canonical:
            PAGE_PATH,
    },

    openGraph: {

        title:
            "QR Inteligente | Editable, medible y reutilizable",

        description:
            "Cambiá links, pausá campañas, activá QR en segundos y medí resultados reales desde tu panel.",

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
                    "/assets/images/og/tags-qr-dinamicos-og.webp",

                width:
                    1200,

                height:
                    630,

                alt:
                    "QR Inteligente Tags",
            }
        ]
    },

    twitter: {

        card:
            "summary_large_image",

        title:
            "QR Inteligente | QR editable con estadísticas",

        description:
            "Administrá tus QR sin volver a imprimirlos.",

        images: [
            "/assets/images/og/tags-qr-dinamicos-og.webp",
        ],
    },
};

export default function QRInteligentePage() {

    const webPageSchema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${PAGE_URL}/#webpage`,
        url: PAGE_URL,
        name: "QR Inteligente",
        description:
            "QR editable, pausable, reutilizable y medible para negocios, campañas y productos.",
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
        name: "QR Inteligente",
        serviceType: [
            "QR dinámico",
            "QR editable",
            "QR con estadísticas",
            "QR reutilizable"
        ],
        description:
            "Servicio de códigos QR inteligentes que pueden editarse, pausarse, reutilizarse y medirse desde una plataforma online.",
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
                "QR Inteligente",

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

                <section className="tags_hero_section">

                    <div className="container">

                        <div className="row align-items-center g-5">

                            <div className="col-12 col-lg-6">

                                <div className="tags_hero_content">

                                    <div className="tags_hero_badge">
                                        QR Inteligente • Editable • Con Estadísticas
                                    </div>

                                    <h1 className="tags_hero_title">
                                        Tu QR ya no tiene que ser estático
                                        <span> ni quedar viejo después de imprimirlo</span>
                                    </h1>

                                    <p className="tags_hero_subtitle">
                                        Activá tu QR en segundos, cambiá el link
                                        cuando quieras, pausalo si lo necesitás
                                        y descubrí cuántas personas interactúan
                                        con tu negocio.
                                    </p>

                                    <div className="tags_hero_features">

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Activación en 10 segundos
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Link editable
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Pausa con mensaje personalizado
                                        </div>

                                        <div className="tags_hero_feature">
                                            <span>✓</span>
                                            Estadísticas y reportes
                                        </div>

                                    </div>

                                    <div className="tags_hero_mobile_image d-block d-lg-none">

                                        <Image
                                            src="/assets/images/tags/qr-estadisticas.webp"
                                            alt="QR Inteligente editable con estadísticas"
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
                                            href="/demo"
                                            className="tags_btn_primary"
                                        >
                                            Probar Demo
                                        </Link>

                                        

                                    </div>

                                    <div className="tags_hero_bottom_text">
                                        Ideal para carteles, stickers, vidrieras,
                                        restaurantes, hoteles, eventos, campañas,
                                        packaging, redes sociales y cualquier punto
                                        de contacto con tus clientes.
                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-lg-6">

                                <div className="tags_hero_image_wrapper d-none d-lg-block">

                                    <Image
                                        src="/assets/images/tags/qr-estadisticas.webp"
                                        alt="Dashboard de QR Inteligente Tags"
                                        width={700}
                                        height={550}
                                        className="img-fluid tags_hero_image"
                                        priority
                                    />

                                </div>

                            </div>

                        </div>

                    </div>

                                                {/* Carousellde Products */}
                            <div className="col-12">

                                <ProductCarousel />
                            </div>

                </section>

                <section className="tags_products_section">

                    <div className="container">

                        <div className="tags_products_header">

                            <div className="tags_products_badge">
                                Control total
                            </div>

                            <h2 className="tags_products_title">
                                Un mismo QR, muchas posibilidades
                            </h2>

                            <p className="tags_products_subtitle">
                                Un QR común queda fijo para siempre.
                                Un QR Inteligente Tags puede cambiar,
                                pausarse, medirse y reutilizarse según
                                lo que necesite tu negocio.
                            </p>

                        </div>

                        <div className="row g-4">

                            {[
                                {
                                    icon: "⚡",
                                    title: "Activación inmediata",
                                    text: "Lo activás en segundos desde el primer escaneo, sin procesos complicados.",
                                },
                                {
                                    icon: "🔗",
                                    title: "Cambiá el destino",
                                    text: "Modificá el link, WhatsApp, redes, menú, web o campaña sin reimprimir.",
                                },
                                {
                                    icon: "⏸️",
                                    title: "Pausá cuando quieras",
                                    text: "Desactivá temporalmente el QR y mostrale al visitante un mensaje personalizado.",
                                },
                                {
                                    icon: "📊",
                                    title: "Medí resultados",
                                    text: "Visualizá escaneos, horarios, ciudades, dispositivos y comportamiento.",
                                },
                                {
                                    icon: "📄",
                                    title: "Generá reportes",
                                    text: "Obtené información útil para tomar mejores decisiones y evaluar campañas.",
                                },
                                {
                                    icon: "♻️",
                                    title: "Reutilizable",
                                    text: "Usá el mismo QR para nuevas campañas, promociones o enlaces futuros.",
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

                <section className="tags_services_section">

                    <div className="container">

                        <div className="tags_services_header">

                            <div className="tags_services_badge">
                                QR tradicional vs QR Inteligente
                            </div>

                            <h2 className="tags_services_title">
                                No vuelvas a imprimir un QR cada vez que cambia un link
                            </h2>

                            <p className="tags_services_subtitle">
                                Con Tags, el código físico puede seguir siendo el mismo,
                                aunque tu campaña, promoción o destino cambie.
                            </p>

                        </div>

                        {[
                            {
                                number: "01",
                                title: "El QR tradicional queda fijo",
                                text: "Si cambia el link, el menú, la promoción o la web, normalmente tenés que generar e imprimir otro QR. No sabés cuántas pesonas lo escanearon, en qué momento y de dónde son?",
                                image: "/assets/images/tags-qr-fijo-en-desuso.webp",
                            },
                            {
                                number: "02",
                                title: "El QR Inteligente lo administras Vos",
                                text: "Desde tu panel podés cambiar nombre, destino, estado, mensaje de pausa y ver estadísticas. Desde una computadora o en tú teléfono",
                                image: "/assets/images/tags/tags_qr_setup.webp",
                            },
                            {
                                number: "03",
                                title: "Cada escaneo te deja información relevante!",
                                text: "No solo llevás personas a un link: entendés cómo, cuándo y desde dónde interactúan.",
                                image: "/assets/images/tags/tags_qr_stats.webp",
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

                <section className="tags_features_section">

                    <div className="tags_features_glow"></div>

                    <div className="container">

                        <div className="tags_features_header">

                            <div className="tags_features_badge">
                                Plataforma online
                            </div>

                            <h2 className="tags_features_title">
                                Administrá tus QR desde un panel simple
                            </h2>

                            <p className="tags_features_subtitle">
                                No necesitás conocimientos técnicos.
                                Tenés el control de tus QR desde una plataforma
                                pensada para negocios reales.
                            </p>

                        </div>

                        <div className="row align-items-center g-5">

                            <div className="col-12 col-lg-5">

                                <div className="tags_features_image_wrapper">

                                    <Image
                                        src="/assets/images/tags-dashboard-cliente-computadora.webp"
                                        alt="Panel de administración de QR Inteligente"
                                        width={900}
                                        height={672}
                                        className="img-fluid tags_features_image"
                                    />

                                    <div className="tags_features_image_badge">
                                        Datos reales de tus escaneos
                                    </div>

                                </div>

                            </div>

                            <div className="col-12 col-lg-7">

                                <div className="tags_features_content">

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Cambiá el link cuando lo necesites
                                        </h3>

                                        <p>
                                            Podés actualizar el destino del QR
                                            sin tocar el cartel, sticker,
                                            tarjeta o material impreso.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Pausá y mostrale un mensaje al visitante
                                        </h3>

                                        <p>
                                            Si una campaña terminó, un evento finalizó
                                            o estás actualizando contenido, podés
                                            pausar el QR y mostrar un mensaje claro
                                            a quien lo escanee.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box">

                                        <h3>
                                            Entendé qué pasa después del escaneo
                                        </h3>

                                        <p>
                                            Vemos el QR como una herramienta viva:
                                            te ayuda a conocer el movimiento real
                                            de tus campañas, productos o puntos
                                            de contacto.
                                        </p>

                                    </div>

                                    <div className="tags_features_content_box tags_features_highlight">

                                        <h4>
                                            Ideal para:
                                        </h4>

                                        <div className="tags_features_tags">

                                            <span>Restaurantes</span>
                                            <span>Hoteles</span>
                                            <span>Turismo</span>
                                            <span>Eventos</span>
                                            <span>Comercios</span>
                                            <span>Vidrieras</span>
                                            <span>Packaging</span>
                                            <span>Campañas</span>
                                            <span>NFC</span>

                                        </div>

                                    </div>

                                    <div className="tags_features_cta">

                                        <p>
                                            Convertí tus QR en una herramienta real de marketing y medición.
                                        </p>

                                        <Link
                                            href="/store-products"
                                            className="tags_features_button"
                                        >
                                            Ver Productos QR
                                        </Link>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                <section className="tags_store_info">

                    <div className="container">

                        <div className="tags_store_info_card">

                            <div className="tags_products_badge mb-4">
                                QR vivo, no QR estático
                            </div>

                            <h2>
                                Tu QR evoluciona con tu negocio
                            </h2>

                            <p>
                                Cambian tus promociones, tus redes,
                                tu WhatsApp, tu menú, tus campañas
                                o tus objetivos. Tu QR puede acompañar
                                esos cambios sin volver a imprimirse.
                            </p>

                            <p>
                                Tags te permite activar, editar, pausar,
                                medir y reutilizar tus QR desde una plataforma
                                simple y preparada para crecer.
                            </p>

                            <div className="tags_hero_buttons justify-content-center mt-4">

                                <Link
                                    href="/demo"
                                    className="tags_btn_primary"
                                >
                                    Probar Demo
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
                    title="Preguntas frecuentes sobre QR Inteligente"
                    subtitle="Todo lo que necesitás saber sobre QR editables, pausables y medibles."
                    faqs={faqItems}
                />

                <TagsFooter />

                <WhatsAppFloat />

            </main>
        </>
    );
}