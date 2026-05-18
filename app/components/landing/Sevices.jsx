"use client";

import Image from "next/image";

export default function Services() {
    return (
        <section className="tags_services_section">

            <div className="container">

                {/* HEADER */}
                <div className="tags_services_header">

                    <div className="tags_services_badge">
                        Cómo funciona
                    </div>

                    <h2 className="tags_services_title">
                        Activá tus QR en minutos
                        y empezá a medir resultados reales
                    </h2>

                    <p className="tags_services_subtitle">
                        Un proceso simple, rápido y pensado para negocios
                        que necesitan más clientes, reseñas y métricas.
                    </p>

                </div>

                {/* STEP 1 */}
                <div className="row align-items-center g-5 tags_service_row">

                    <div className="col-12 col-lg-6">

                        <div className="tags_service_image_wrapper">

                            <Image
                                src="/assets/images/tags/tags_qr_whatsapp.webp"
                                alt="QR Whatsapp"
                                width={900}
                                height={672}
                                className="img-fluid tags_service_image"
                            />

                        </div>

                    </div>

                    <div className="col-12 col-lg-6">

                        <div className="tags_service_content">

                            <div className="tags_service_number">
                                01
                            </div>

                            <h3>
                                Seleccioná tu QR
                            </h3>

                            <p>
                                Elegí el tipo de QR y configurá
                                el destino: WhatsApp, Google,
                                Instagram, Web o cualquier link personalizado.
                            </p>

                        </div>

                    </div>

                </div>

                {/* STEP 2 */}
                <div className="row align-items-center g-5 tags_service_row">

                    <div className="col-12 col-lg-6 order-lg-2">

                        <div className="tags_service_image_wrapper">

                            <Image
                                src="/assets/images/tags/tags_qr_setup.webp"
                                alt="Configuración QR"
                                width={900}
                                height={672}
                                className="img-fluid tags_service_image"
                            />

                        </div>

                    </div>

                    <div className="col-12 col-lg-6 order-lg-1">

                        <div className="tags_service_content">

                            <div className="tags_service_number">
                                02
                            </div>

                            <h3>
                                Activación instantánea
                            </h3>

                            <p>
                                Recibís tu QR y lo activás
                                en segundos desde tu email.
                                Todo es dinámico, editable
                                y reutilizable.
                            </p>

                        </div>

                    </div>

                </div>

                {/* STEP 3 */}
                <div className="row align-items-center g-5 tags_service_row">

                    <div className="col-12 col-lg-6">

                        <div className="tags_service_image_wrapper">

                            <Image
                                src="/assets/images/tags/tags_qr_stats.webp"
                                alt="Analytics QR"
                                width={900}
                                height={672}
                                className="img-fluid tags_service_image"
                            />

                        </div>

                    </div>

                    <div className="col-12 col-lg-6">

                        <div className="tags_service_content">

                            <div className="tags_service_number">
                                03
                            </div>

                            <h3>
                                Medí resultados reales
                            </h3>

                            <p>
                                Visualizá estadísticas,
                                horarios, ciudades,
                                dispositivos y comportamiento
                                de tus escaneos en tiempo real.
                            </p>

                        </div>

                    </div>

                </div>

                {/* CTA */}
                <div className="tags_services_cta">

                    <p>
                        Probalo en vivo y descubrí cómo funciona
                    </p>

                    <a
                        href="/demo"
                        className="tags_services_button"
                    >
                        Probar Demo
                    </a>

                </div>

            </div>

        </section>
    );
}