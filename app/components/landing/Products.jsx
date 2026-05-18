"use client";

import Image from "next/image";
import Link from "next/link";

export default function Products() {
    return (
        <section id="products" className="tags_products_section">

            <div className="container">

                {/* HEADER */}
                <div className="tags_products_header">

                    <div className="tags_products_badge">
                        Productos Inteligentes
                    </div>

                    <h2 className="tags_products_title">
                        Todo lo que necesitás para potenciar
                        tus códigos QR
                    </h2>

                    <p className="tags_products_subtitle">
                        Soluciones físicas y digitales diseñadas para
                        aumentar reseñas, contactos, conversiones
                        y métricas reales de tu negocio.
                    </p>

                </div>

                {/* CONTENT */}
                <div className="row align-items-center g-5">

                    {/* IMAGE */}
                    <div className="col-12 col-lg-6">

                        <div className="tags_products_image_wrapper">

                            <Image
                                src="/assets/images/tags/escaneo-qr-google.webp"
                                alt="Escaneando QR"
                                width={900}
                                height={672}
                                className="img-fluid tags_products_image"
                            />

                        </div>

                    </div>

                    {/* FEATURES */}
                    <div className="col-12 col-lg-6">

                        <div className="tags_products_cards">

                            <div className="tags_product_card">
                                <div className="tags_product_icon">
                                    📊
                                </div>

                                <div>
                                    <h5>Analytics</h5>

                                    <p>
                                        Datos por horario, ciudad,
                                        dispositivo e históricos
                                        de escaneo.
                                    </p>
                                </div>
                            </div>

                            <div className="tags_product_card">
                                <div className="tags_product_icon">
                                    🔗
                                </div>

                                <div>
                                    <h5>QR Dinámico</h5>

                                    <p>
                                        Editá destinos, pausá,
                                        reactivá y administrá
                                        tus QR en tiempo real.
                                    </p>
                                </div>
                            </div>

                            <div className="tags_product_card">
                                <div className="tags_product_icon">
                                    🪵
                                </div>

                                <div>
                                    <h5>Carteles Físicos</h5>

                                    <p>
                                        Diseños premium y materiales
                                        de alta calidad para negocios.
                                    </p>
                                </div>
                            </div>

                            <div className="tags_product_card">
                                <div className="tags_product_icon">
                                    📱
                                </div>

                                <div>
                                    <h5>QRs Digitales + NFC</h5>

                                    <p>
                                        Links y códigos digitales
                                        listos para compartir,
                                        imprimir o reutilizar.
                                    </p>
                                </div>
                            </div>

                        </div>

                    </div>

                </div>

                {/* CTA */}
                <div className="tags_products_cta">

                    <Link
                        href="/store-products"
                        className="tags_products_button"
                    >
                        Ver Todos los Productos
                    </Link>

                </div>

            </div>

        </section>
    );
}