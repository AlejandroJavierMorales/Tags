"use client";

import Image from "next/image";

export default function Features() {
    return (
        <section className="tags_features_section">

            {/* glow */}
            <div className="tags_features_glow"></div>

            <div className="container">

                {/* HEADER */}
                <div className="tags_features_header">

                    <div className="tags_features_badge">
                        Inteligencia para negocios
                    </div>

                    <h2 className="tags_features_title">
                        Convertí escaneos en decisiones inteligentes
                    </h2>

                    <p className="tags_features_subtitle">
                        No se trata solamente de QR.
                        Se trata de entender cómo interactúan
                        las personas con tu negocio.
                    </p>

                </div>

                {/* TOP CARDS */}
                <div className="row g-4 mb-5">

                    <div className="col-12 col-md-4">

                        <div className="tags_feature_card">

                            <div className="tags_feature_icon">
                                📊
                            </div>

                            <h3>
                                Datos accionables
                            </h3>

                            <p>
                                Entendé qué está pasando
                                en tu negocio en tiempo real.
                            </p>

                        </div>

                    </div>

                    <div className="col-12 col-md-4">

                        <div className="tags_feature_card">

                            <div className="tags_feature_icon">
                                ⚡
                            </div>

                            <h3>
                                Optimización
                            </h3>

                            <p>
                                Detectá oportunidades
                                y mejorá procesos automáticamente.
                            </p>

                        </div>

                    </div>

                    <div className="col-12 col-md-4">

                        <div className="tags_feature_card">

                            <div className="tags_feature_icon">
                                🎯
                            </div>

                            <h3>
                                Más conversiones
                            </h3>

                            <p>
                                Transformá visitas
                                en ventas con métricas reales.
                            </p>

                        </div>

                    </div>

                </div>

                {/* MAIN BLOCK */}
                <div className="row align-items-center g-5">

                    {/* IMAGE */}
                    <div className="col-12 col-lg-5">

                        <div className="tags_features_image_wrapper">

                            <Image
                                src="/assets/images/tags/tags_qr_data-analisis.webp"
                                alt="Analytics QR"
                                width={900}
                                height={672}
                                className="img-fluid tags_features_image"
                            />

                            <div className="tags_features_image_badge">
                                Analytics en tiempo real
                            </div>

                        </div>

                    </div>

                    {/* CONTENT */}
                    <div className="col-12 col-lg-7">

                        <div className="tags_features_content">

                            <div className="tags_features_content_box">

                                <h3>
                                    Mucho más que carteles QR
                                </h3>

                                <p>
                                    Ponemos a disposición una plataforma
                                    completa de gestión y análisis
                                    para que cada escaneo genere información útil.
                                </p>

                                <p>
                                    Descubrí cómo interactúan las personas
                                    con tus campañas, productos
                                    y puntos de contacto.
                                </p>

                            </div>

                            <div className="tags_features_content_box">

                                <h3>
                                    Tomá mejores decisiones
                                </h3>

                                <p>
                                    Analizá horarios, ubicaciones,
                                    dispositivos y comportamiento
                                    de usuarios para optimizar
                                    campañas y recursos.
                                </p>

                                <p>
                                    Desde un local físico hasta publicidad
                                    en vía pública o eventos,
                                    todo puede medirse.
                                </p>

                            </div>

                            <div className="tags_features_content_box tags_features_highlight">

                                <h4>
                                    Ideal para:
                                </h4>

                                <div className="tags_features_tags">

                                    <span>Google Reviews</span>
                                    <span>WhatsApp</span>
                                    <span>Instagram</span>
                                    <span>Eventos</span>
                                    <span>Publicidad</span>
                                    <span>Merchandising</span>
                                    <span>NFC</span>

                                </div>

                            </div>

                            {/* CTA */}
                            <div className="tags_features_cta">

                                <p>
                                    ¿Querés ver cómo funciona en vivo?
                                </p>

                                <a
                                    href="https://wa.me/543546562855"
                                    target="_blank"
                                    className="tags_features_button"
                                >
                                    Hablar por WhatsApp
                                </a>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </section>
    );
}