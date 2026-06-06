"use client";

import { useState }
    from "react";
import getTypographyStyle from "../../lib/getTypographyStyle";





function cleanPhone(phone = "") {

    return phone
        .toString()
        .replace(/\D/g, "");
}

export default function CatalogBlock({
    products = [],
    productCategory = "all",
    page,
    styles = {}
}) {

    const selectedCategory =
        productCategory || "all";

    const visibleProducts =
        products.filter((product) => {

            if (!product.is_visible) {
                return false;
            }

            if (selectedCategory === "all") {
                return true;
            }

            return (
                (product.category || "products") ===
                selectedCategory
            );
        });

    if (!visibleProducts.length) {
        return null;
    }

    return (
        <div className="qr_public_catalog">

            {
                visibleProducts.map(
                    (product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            page={page}
                            styles={styles}
                        />
                    )
                )
            }

        </div>
    );
}

function ProductCard({
    product,
    page,
    styles = {}

}) {

    const [touchStart, setTouchStart] =
        useState(null);

    const oldPriceStyle =
        getTypographyStyle(
            styles,
            "oldPrice"
        );

    const metaStyle =
        getTypographyStyle(
            styles,
            "meta"
        );

    const titleStyle =
        getTypographyStyle(
            styles,
            "title"
        );

    const textStyle =
        getTypographyStyle(
            styles,
            "text"
        );

    const priceStyle =
        getTypographyStyle(
            styles,
            "price"
        );

    const buttonStyle =
        getTypographyStyle(
            styles,
            "button"
        );

    const images =
        Array.isArray(product.images_json)
            ? product.images_json
            : [];

    const fallbackImages =
        product.image_url
            ? [
                {
                    url: product.image_url,
                    alt: product.title
                }
            ]
            : [];

    const finalImages =
        images.length
            ? images
            : fallbackImages;

    const [activeImage, setActiveImage] =
        useState(0);

    const phone =
        cleanPhone(
            page?.whatsapp ||
            page?.phone ||
            ""
        );

    const message =
        encodeURIComponent(
            product.whatsapp_text ||
            `Hola, quiero consultar por ${product.title}`
        );

    const consultUrl =
        product.button_url
            ? product.button_url
            : phone
                ? `https://wa.me/${phone}?text=${message}`
                : "#";

    function prevImage() {

        setActiveImage(
            (current) =>
                current === 0
                    ? finalImages.length - 1
                    : current - 1
        );
    }

    function nextImage() {

        setActiveImage(
            (current) =>
                current === finalImages.length - 1
                    ? 0
                    : current + 1
        );
    }

    return (
        <article
            className="qr_public_product"
        >

            {
                finalImages.length > 0 && (
                    <div className="qr_public_product_media">

                        <div className="qr_public_product_slider">
                            <img
                                src={finalImages[activeImage]?.url}
                                alt={
                                    finalImages[activeImage]?.alt ||
                                    product.title
                                }
                            />
                        </div>

                    </div>
                )
            }

            {
                finalImages.length > 1 ? (
                    <div className="qr_public_product_dots">
                        {finalImages.map((image, index) => (
                            <button
                                key={`${image.url}-${index}`}
                                type="button"
                                className={
                                    activeImage === index
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setActiveImage(index)
                                }
                            />
                        ))}
                    </div>
                ) : (
                    <div className="qr_public_product_dots_placeholder" />
                )
            }


            <div className="qr_public_product_body">

                <h3 style={titleStyle}>
                    {product.title}
                </h3>

                {
                    product.description && (
                        <p style={textStyle}>
                            {product.description}
                        </p>
                    )
                }

                {
                    (
                        product.old_price ||
                        product.discount_label
                    ) && (
                        <div className="qr_public_product_discount_row">

                            {
                                product.old_price && (
                                    <span
                                        className="qr_public_product_old_price"
                                        style={oldPriceStyle}
                                    >
                                        {
                                            product.currency ||
                                            "ARS"
                                        }{" "}
                                        {product.old_price}
                                    </span>
                                )
                            }

                            {
                                product.discount_label && (
                                    <span
                                        className="qr_public_product_discount"
                                        style={metaStyle}
                                    >
                                        {product.discount_label}
                                    </span>
                                )
                            }

                        </div>
                    )
                }

                {
                    product.price && (
                        <strong
                            className="qr_public_product_price"
                            style={priceStyle}
                        >
                            {
                                product.currency ||
                                "ARS"
                            }{" "}
                            {product.price}
                        </strong>
                    )
                }

                <a
                    href={consultUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="qr_public_product_button"
                    style={buttonStyle}
                >
                    {
                        product.button_label ||
                        "Consultar"
                    }
                </a>

            </div>

        </article>
    );
}