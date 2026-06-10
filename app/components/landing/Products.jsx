"use client";

import Image from "next/image";
import Link from "next/link";

const ecosystem = [
    {
        icon: "⌗",
        title: "QR Inteligente",
        description:
            "QR dinámicos editables con estadísticas, analytics, tracking y administración en tiempo real.",
        image:
            "/assets/images/tags/qr-estadisticas.webp",
        href:
            "/qr-inteligente",
        cta:
            "Ver QR Inteligente",
    },
    {
        icon: "🌐",
        title: "QR-Page",
        description:
            "Landing pages públicas para negocios, productos, servicios, catálogos, menús y campañas QR.",
        image:
            "/assets/images/qr-page/tags-qr-page-catalogo-productos.webp",
        href:
            "/qr-page",
        cta:
            "Ver QR-Page",
    },
    {
        icon: "🪪",
        title: "Tags Id",
        description:
            "Tarjetas personales digitales e inteligentes con QR, NFC, perfil público, vCard y enlaces profesionales.",
        image:
            "/assets/images/tags-id/tags-id-doctora-bioquimica.webp",
        href:
            "/tags-id",
        cta:
            "Ver Tags Id",
    },
    {
        icon: "⭐",
        title: "Tags Reviews",
        description:
            "Interfaz personalizable e indexable para captar reseñas, filtrar experiencias e inducir reviews en Google.",
        image:
            "/assets/images/tags-reviews/tags-reviews-vidriera.webp",
        href:
            "/tags-reviews",
        cta:
            "Ver Tags Reviews",
    },
    {
        icon: "🎟️",
        title: "Tags eEvents",
        description:
            "Sistema de eventos inteligentes con invitaciones, confirmaciones, acompañantes, checkin QR y experiencia digital.",
        image:
            "/assets/images/e-events/tags-e-events-dashboard.webp",
        href:
            "/e-events",
        cta:
            "Ver eEvents",
    },
];

export default function Products() {

    return (
        <section
            id="ecosistema"
            className="tags_products_section"
        >

            <div className="container">

                {/* HEADER */}
                <div className="tags_products_header">

                    <div className="tags_products_badge">
                        Ecosistema Tags
                    </div>

                    <h2 className="tags_products_title">
                        Una plataforma para conectar
                        negocios, personas, reseñas y eventos
                    </h2>

                    <p className="tags_products_subtitle">
                        Tags integra QR inteligentes, páginas públicas,
                        identidad digital, reputación online y eventos
                        en una arquitectura flexible, medible e indexable.
                    </p>

                </div>

                {/* GRID */}
                <div className="row g-4">

                    {ecosystem.map((item) => (

                        <div
                            key={item.href}
                            className="col-12 col-md-6 col-xl-4"
                        >

                            <article className="tags_product_card">

                                <div className="tags_product_icon">
                                    {item.icon}
                                </div>

                                <div className="w-100">

                                    <div className="tags_product_image_wrapper mb-4">

                                        <Image
                                            src={item.image}
                                            alt={item.title}
                                            width={700}
                                            height={460}
                                            className="img-fluid tags_product_image"
                                        />

                                    </div>

                                    <h3>
                                        {item.title}
                                    </h3>

                                    <p>
                                        {item.description}
                                    </p>

                                    <div className="mt-4">

                                        <Link
                                            href={item.href}
                                            className="tags_products_button"
                                        >
                                            {item.cta}
                                        </Link>

                                    </div>

                                </div>

                            </article>

                        </div>

                    ))}

                </div>

                {/* CTA */}
                <div className="tags_products_cta">

                    <Link
                        href="/store-products"
                        className="tags_products_button"
                    >
                        Ver tienda Online
                    </Link>

                </div>

            </div>

        </section>
    );
}