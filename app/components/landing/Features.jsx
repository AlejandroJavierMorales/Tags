"use client";

import Image from "next/image";
import Link from "next/link";

const featureCards = [
    {
        icon: "📊",
        title: "Analytics reales",
        text:
            "Cada escaneo puede transformarse en datos útiles: horarios, ciudades, dispositivos, navegadores e interacciones.",
    },
    {
        icon: "🌐",
        title: "Páginas indexables",
        text:
            "QR-Page, Tags Id y Tags Reviews pueden publicarse como páginas públicas optimizadas para buscadores.",
    },
    {
        icon: "🔁",
        title: "QR reutilizables",
        text:
            "Editá destinos, pausá campañas, cambiá enlaces y reutilizá códigos sin volver a imprimir.",
    },
];

export default function Features() {

    return (
        <section className="tags_features_section">

            <div className="tags_features_glow"></div>

            <div className="container">

                {/* HEADER */}
                <div className="tags_features_header">

                    <div className="tags_features_badge">
                        Diferenciales
                    </div>

                    <h2 className="tags_features_title">
                        Mucho más que códigos QR
                    </h2>

                    <p className="tags_features_subtitle">
                        Tags combina QR dinámicos, NFC, páginas públicas,
                        SEO, analytics y herramientas de gestión para crear
                        experiencias digitales medibles.
                    </p>

                </div>

                {/* TOP CARDS */}
                <div className="row g-4 mb-5">

                    {featureCards.map((item) => (

                        <div
                            key={item.title}
                            className="col-12 col-md-4"
                        >

                            <div className="tags_feature_card">

                                <div className="tags_feature_icon">
                                    {item.icon}
                                </div>

                                <h3>
                                    {item.title}
                                </h3>

                                <p>
                                    {item.text}
                                </p>

                            </div>

                        </div>

                    ))}

                </div>

                {/* MAIN BLOCK */}
                <div className="row align-items-center g-5">

                    {/* IMAGE */}
                    <div className="col-12 col-lg-5">

                        <div className="tags_features_image_wrapper">

                            <Image
                                src="/assets/images/tags/tags_qr_data-analisis.webp"
                                alt="Plataforma Tags con analytics, SEO y QR dinámicos"
                                width={900}
                                height={672}
                                className="img-fluid tags_features_image"
                            />

                            <div className="tags_features_image_badge">
                                Plataforma medible e indexable
                            </div>

                        </div>

                    </div>

                    {/* CONTENT */}
                    <div className="col-12 col-lg-7">

                        <div className="tags_features_content">

                            <div className="tags_features_content_box">

                                <h3>
                                    Una plataforma preparada para crecer
                                </h3>

                                <p>
                                    Tags permite crear puntos de contacto
                                    digitales para negocios, profesionales,
                                    productos, reseñas, eventos y campañas
                                    físicas o digitales.
                                </p>

                                <p>
                                    Cada experiencia puede conectarse a QR,
                                    NFC, links públicos, cartelería,
                                    tarjetas, stickers o invitaciones.
                                </p>

                            </div>

                            <div className="tags_features_content_box">

                                <h3>
                                    SEO, datos y conversión en el mismo flujo
                                </h3>

                                <p>
                                    Las páginas públicas pueden optimizarse
                                    con metadata, OpenGraph, datos estructurados
                                    y contenido específico para cada negocio
                                    o producto.
                                </p>

                                <p>
                                    Esto permite que cada QR no sea solamente
                                    un acceso rápido, sino también una pieza
                                    medible, editable y potencialmente indexable.
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
                                    <span>Turismo</span>
                                    <span>Profesionales</span>
                                    <span>Eventos</span>
                                    <span>Google Reviews</span>
                                    <span>NFC</span>
                                    <span>Landing Pages</span>
                                    <span>Catálogos</span>

                                </div>

                            </div>

                            {/* CTA */}
                            <div className="tags_features_cta">

                                <p>
                                    Conocé las soluciones disponibles para tu negocio.
                                </p>

                                <Link
                                    href="/store-products"
                                    className="tags_features_button"
                                >
                                    Ver tienda Online
                                </Link>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </section>
    );
}