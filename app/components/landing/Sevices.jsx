"use client";

import Image from "next/image";
import Link from "next/link";

const steps = [
    {
        number: "01",
        title: "Creá tu experiencia digital",
        text:
            "Configurá un QR inteligente, una QR-Page, una tarjeta Tags Id, una interfaz de reseñas o un evento digital según el objetivo de tu negocio.",
        image:
            "/assets/images/tags/tags_qr_setup.webp",
        alt:
            "Configuración de experiencias digitales Tags",
    },
    {
        number: "02",
        title: "Conectala con QR, NFC o links",
        text:
            "Publicá tu experiencia en carteles físicos, tarjetas NFC, stickers, invitaciones, redes sociales, packaging o cualquier punto de contacto.",
        image:
            "/assets/images/tags/tags_qr_whatsapp.webp",
        alt:
            "QR y NFC conectados a experiencias digitales",
    },
    {
        number: "03",
        title: "Medí resultados reales",
        text:
            "Visualizá escaneos, horarios, ciudades, dispositivos, interacciones, conversiones y comportamiento desde tu panel de administración.",
        image:
            "/assets/images/tags/tags_qr_stats.webp",
        alt:
            "Analytics y estadísticas Tags",
    },
];

export default function Services() {

    return (
        <section className="tags_services_section">

            <div className="container">

                {/* HEADER */}
                <div className="tags_services_header">

                    <div className="tags_services_badge">
                        Cómo funciona Tags
                    </div>

                    <h2 className="tags_services_title">
                        Diseñá, publicá y medí experiencias digitales inteligentes
                    </h2>

                    <p className="tags_services_subtitle">
                        Tags conecta el mundo físico con experiencias digitales
                        optimizadas para conversión, medición, reputación online,
                        identidad digital y eventos.
                    </p>

                </div>

                {steps.map((step, index) => (

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
                                    alt={step.alt}
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

                {/* CTA */}
                <div className="tags_services_cta">

                    <p>
                        Probá la plataforma en vivo y mirá cómo un QR genera datos reales.
                    </p>

                    <Link
                        href="/demo"
                        className="tags_services_button"
                    >
                        Probar Demo
                    </Link>

                </div>

            </div>

        </section>
    );
}