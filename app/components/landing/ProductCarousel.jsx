// app/components/ProductCarousel.jsx

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

const products = [
    {
        title: "Credenciales QR",
        image: "/assets/images/tags/productos/qr-acrilico-tarjeta-55x85-colgante-menu-whatsapp-instagram.webp",
    },
    {
        title: "Sticker Google Reviews",
        image: "/assets/images/tags/productos/qr-autoadhesivo-14x14-google.webp",
    },
    {
        title: "Sticker WhatsApp / Instagram",
        image: "/assets/images/tags/productos/qr-autoadhesivo-bajovidrio-14x14-whatsapp-instagram.webp",
    },
    {
        title: "Acrílico Google",
        image: "/assets/images/tags/productos/qr-acrilico-12x12-google-blanco-colgar.webp",
    },
    {
        title: "Acrílico Menú",
        image: "/assets/images/tags/productos/qr-acrilico-12x12-menu-blanco-base.webp",
    },
    {
        title: "Acrílico WhatsApp",
        image: "/assets/images/tags/productos/qr-acrilico-12x12-whatsapp-blanco-colgar.webp",
    },
    {
        title: "Tarjeta Personal TagsId",
        image: "/assets/images/tags/productos/tags-id-tarjeta-personal-digital.webp",
    },
];

export default function ProductCarousel() {

    const trackRef =
        useRef(null);

    const [activeIndex, setActiveIndex] =
        useState(0);

    const handleScroll = () => {

        if (!trackRef.current) {
            return;
        }

        const cardWidth =
            trackRef.current.firstChild?.offsetWidth || 1;

        const gap =
            18;

        const index =
            Math.round(
                trackRef.current.scrollLeft / (cardWidth + gap)
            );

        setActiveIndex(index);
    };

    const goToSlide = (index) => {

        if (!trackRef.current) {
            return;
        }

        const cardWidth =
            trackRef.current.firstChild?.offsetWidth || 1;

        const gap =
            18;

        trackRef.current.scrollTo({
            left:
                index * (cardWidth + gap),
            behavior:
                "smooth",
        });

        setActiveIndex(index);
    };

    return (
    <section className="tags_mini_products_section">

        <div className="container">

            <div className="tags_mini_products_header">

                <span>
                    Productos físicos QR + NFC
                </span>

                <h2>
                    Cartelería inteligente lista para usar
                </h2>

            </div>

            <div
                ref={trackRef}
                className="tags_mini_products_track"
                onScroll={handleScroll}
            >

                {products.map((product) => (

                    <article
                        key={product.title}
                        className="tags_mini_product"
                    >

                        <div className="tags_mini_product_image_wrap">

                            <Image
                                src={product.image}
                                alt={product.title}
                                width={420}
                                height={420}
                                className="tags_mini_product_image"
                            />

                        </div>

                        <div className="tags_mini_product_info">

                            <h3>
                                {product.title}
                            </h3>

                        </div>

                    </article>

                ))}

            </div>

            <div className="tags_mini_products_dots">

                {products.map((product, index) => (

                    <button
                        key={product.title}
                        type="button"
                        className={
                            activeIndex === index
                                ? "active"
                                : ""
                        }
                        onClick={() => goToSlide(index)}
                        aria-label={`Ver ${product.title}`}
                    />

                ))}

            </div>

            <div className="tags_mini_products_cta">

                <Link
                    href="/store-products"
                    className="tags_btn_secondary"
                >
                    Ver Productos QR
                </Link>

            </div>

        </div>

    </section>
);
}