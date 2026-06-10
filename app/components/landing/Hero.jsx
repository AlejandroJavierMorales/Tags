"use client";

import Image from "next/image";
import Link from "next/link";

const features = [

    "QR dinámicos editables",
    "Landing pages inteligentes",
    "Tarjetas digitales NFC",
    "Google Reviews",
    "Eventos inteligentes",
    "Analytics en tiempo real",
];

export default function Hero() {

    return (
        <section className="tags_hero_section">

            <div className="container">

                <div className="row align-items-center g-5">

                    {/* LEFT */}
                    <div className="col-12 col-lg-6">

                        <div className="tags_hero_content">

                            {/* BADGE */}
                            <div className="tags_hero_badge">

                                Plataforma de Experiencias Digitales Inteligentes

                            </div>

                            {/* TITLE */}
                            <h1 className="tags_hero_title">

                                Transformá cada QR en
                                <span>
                                    {" "}clientes, interacción y métricas reales
                                </span>

                            </h1>

                            {/* SUBTITLE */}
                            <p className="tags_hero_subtitle">

                                QR inteligentes, landing pages,
                                tarjetas digitales, reseñas Google,
                                NFC y eventos inteligentes
                                conectados en una única plataforma.

                            </p>

                            {/* FEATURES */}
                            <div className="tags_hero_features">

                                {
                                    features.map(
                                        (
                                            item,
                                            index
                                        ) => (

                                            <div
                                                key={index}
                                                className="tags_hero_feature"
                                            >

                                                <span>
                                                    ✓
                                                </span>

                                                {item}

                                            </div>
                                        )
                                    )
                                }

                            </div>

                            {/* MOBILE IMAGE */}
                            <div className="tags_hero_mobile_image d-block d-lg-none">

                                <Image
                                    src="/assets/images/tags-experiencias-digitales-con-codigos-qr.webp"
                                    alt="Plataforma Tags"
                                    width={750}
                                    height={570}
                                    className="img-fluid tags_hero_image"
                                    priority
                                    style={{
                                        height: "auto"
                                    }}
                                />

                            </div>

                            {/* BUTTONS */}
                            <div className="tags_hero_buttons">

                                <Link
                                    href="/demo"
                                    className="tags_btn_primary"
                                >
                                    Ver Demo
                                </Link>

                                <Link
                                    href="/store-products"
                                    className="tags_btn_secondary"
                                >
                                    Explorar Productos
                                </Link>

                            </div>

                            {/* BOTTOM TEXT */}
                            <div className="tags_hero_bottom_text">

                                Descubrí cómo interactúan las personas
                                con tus productos, campañas,
                                carteles, eventos y puntos de contacto
                                desde estadísticas y analytics en tiempo real.

                            </div>

                        </div>

                    </div>

                    {/* RIGHT */}
                    <div className="col-12 col-lg-6">

                        <div className="tags_hero_image_wrapper d-none d-lg-block">

                            <Image
                                src="/assets/images/tags-experiencias-digitales-con-codigos-qr.webp"
                                alt="Plataforma de experiencias digitales inteligentes"
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