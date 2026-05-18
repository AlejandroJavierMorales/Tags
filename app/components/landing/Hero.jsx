"use client";

import Image from "next/image";
import Link from "next/link";

export default function Hero() {
    return (
        <section className="tags_hero_section">

            <div className="container">

                <div className="row align-items-center g-5">

                    {/* LEFT */}
                    <div className="col-12 col-lg-6">

                        <div className="tags_hero_content">

                            <div className="tags_hero_badge">
                                Plataforma de Gestión y Reporting de Códigos QR
                            </div>

                            <h1 className="tags_hero_title">
                                Transformá cada escaneo QR en
                                <span> clientes y métricas reales</span>
                            </h1>

                            <p className="tags_hero_subtitle">
                                Carteles QR inteligentes con estadísticas,
                                reseñas, seguimiento y herramientas diseñadas
                                para potenciar tu negocio.
                            </p>

                            <div className="tags_hero_features">

                                <div className="tags_hero_feature">
                                    <span>✓</span>
                                    Más reseñas
                                </div>

                                <div className="tags_hero_feature">
                                    <span>✓</span>
                                    Más llamados y contactos
                                </div>

                                <div className="tags_hero_feature">
                                    <span>✓</span>
                                    Más visitas a tu web
                                </div>

                                <div className="tags_hero_feature">
                                    <span>✓</span>
                                    Más seguidores y conversiones
                                </div>

                            </div>

                            {/* MOBILE IMAGE */}
                            <div className="tags_hero_mobile_image d-block d-lg-none">

                                <Image
                                    src="/assets/images/tags/qr-estadisticas.webp"
                                    alt="Carteles QR inteligentes con estadísticas"
                                    width={700}
                                    height={550}
                                    className="img-fluid tags_hero_image"
                                    priority
                                />

                            </div>

                            <div className="tags_hero_buttons">

                                <Link
                                    href="/store-products"
                                    className="tags_btn_primary"
                                >
                                    Ver Productos
                                </Link>

                                <a
                                    href="/demo"
                                    className="tags_btn_secondary"
                                >
                                    Demo en Vivo
                                </a>

                            </div>

                            <div className="tags_hero_bottom_text">
                                Conocé de forma simple cómo se comporta tu público
                                y convertí cada escaneo en oportunidades reales de venta.
                            </div>

                        </div>

                    </div>

                    {/* RIGHT */}
                    <div className="col-12 col-lg-6">

                        <div className="tags_hero_image_wrapper d-none d-lg-block">

                            <Image
                                src="/assets/images/tags/qr-estadisticas.webp"
                                alt="Carteles QR inteligentes con estadísticas"
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
    );
}