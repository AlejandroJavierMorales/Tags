// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreFeaturedProductsBlock.jsx
//
// Descripción:
// Renderiza colecciones públicas de productos
// destacados, ofertas o novedades.
// Comparte opciones visuales con el catálogo,
// pero conserva su formato horizontal.
//
// Contexto:
// store
// =====================================

import Image
    from "next/image";

import Link
    from "next/link";

import {
    FiArrowRight,
    FiEye,
    FiShoppingBag,
    FiShoppingCart
}
    from "react-icons/fi";

import {
    getStoreFeaturedProducts
}
    from "../../lib/getStoreFeaturedProducts";

import {
    formatStorePrice
}
    from "../../lib/formatStorePrice";

import StoreFavoriteButton
    from "../public/StoreFavoriteButton";

import StoreShareButton
    from "../public/StoreShareButton";

export default async function StoreFeaturedProductsBlock({
    entity,
    content = {},
    styles = {},
    typography = {}
}) {

    const products =
        await getStoreFeaturedProducts(
            entity?.id,
            {
                limit:
                    content.limit || 8,

                mode:
                    content.mode || "featured",

                categoryId:
                    content.categoryId,

                productId:
                    content.productId
            }
        );

    if (!products.length) {
        return null;
    }

    const defaultTexts = {
        featured: {
            badge:
                "Destacados",

            title:
                "Productos destacados"
        },

        sale: {
            badge:
                "Ofertas",

            title:
                "Productos en oferta"
        },

        recent: {
            badge:
                "Novedades",

            title:
                "Últimos productos"
        }
    };

    const currentText =
        defaultTexts[content.mode] ||
        defaultTexts.featured;

    const sectionStyle = {
        background:
            styles.backgroundColor || undefined,

        color:
            styles.textColor || undefined,

        padding:
            styles.padding || undefined,

        textAlign:
            styles.alignment || undefined
    };

    const cardStyle = {
        border:
            content.cardBorder === false
                ? "none"
                : undefined,

        borderRadius:
            content.cardRadius || undefined,

        background:
            content.cardBackgroundColor || undefined
    };

    const imageStyle = {
        objectFit:
            content.imageFit || undefined,

        borderRadius:
            content.imageRadius || undefined,

        padding:
            content.imagePadding || undefined
    };

    const imageWrapStyle = {};

    if (content.imageRatio === "4-3") {
        imageWrapStyle.aspectRatio =
            "4 / 3";
    } else if (content.imageRatio === "16-9") {
        imageWrapStyle.aspectRatio =
            "16 / 9";
    } else if (content.imageRatio === "4-5") {
        imageWrapStyle.aspectRatio =
            "4 / 5";
    } else if (content.imageRatio === "square") {
        imageWrapStyle.aspectRatio =
            "1 / 1";
    }

    const infoStyle = {
        background:
            content.infoBackgroundColor || undefined,

        textAlign:
            content.infoAlignment || undefined,

        padding:
            content.infoPadding || undefined
    };

    const priceStyle = {
        color:
            content.priceColor || undefined,

        fontSize:
            content.priceSize || undefined,

        textAlign:
            content.priceAlignment || undefined,

        ...(typography.price || {})
    };

    const oldPriceStyle = {
        color:
            content.oldPriceColor || undefined,

        fontSize:
            content.oldPriceSize || undefined,

        textAlign:
            content.priceAlignment || undefined,

        ...(typography.oldPrice || {})
    };

    const discountStyle = {
        color:
            content.discountColor || undefined,

        fontSize:
            content.discountSize || undefined,

        textAlign:
            content.priceAlignment || undefined
    };

    const offerBadgeStyle = {
        color:
            content.offerBadgeColor || undefined,

        backgroundColor:
            content.offerBadgeBackground || undefined
    };

    const buttonStyle = {
        background:
            content.buttonBackgroundColor || undefined,

        color:
            content.buttonTextColor || undefined,

        borderColor:
            content.buttonBorderColor || undefined,

        borderWidth:
            content.buttonBorderWidth || undefined,

        borderStyle:
            content.buttonBorderWidth
                ? "solid"
                : undefined,

        borderRadius:
            content.buttonRadius || undefined,

        paddingTop:
            content.buttonPaddingY || undefined,

        paddingBottom:
            content.buttonPaddingY || undefined,

        paddingLeft:
            content.buttonPaddingX || undefined,

        paddingRight:
            content.buttonPaddingX || undefined,

        ...(typography.button || {})
    };

    function getCardStyleClass() {

        switch (content.cardStyle) {

            case "flat":
                return "store_card_style_flat";

            case "minimal":
                return "store_card_style_minimal";

            default:
                return "";

        }

    }

    function getCardShadowClass() {

        switch (content.cardShadow) {

            case "none":
                return "store_card_shadow_none";

            case "medium":
                return "store_card_shadow_medium";

            case "strong":
                return "store_card_shadow_strong";

            default:
                return "";

        }

    }

    function getImageHoverClass() {

        if (content.imageHover === "zoom") {
            return "store_product_image_hover_zoom";
        }

        return "";

    }

    function renderButtonIcon() {

        switch (content.buttonIconType) {

            case "cart":
                return <FiShoppingCart />;

            case "bag":
                return <FiShoppingBag />;

            case "eye":
                return <FiEye />;

            default:
                return <FiArrowRight />;

        }

    }

    const showInfoArea =
        content.showInfoArea !== false;

    const showCategory =
        content.showCategory === true;

    const showSku =
        content.showSku === true;

    const showProductTitle =
        content.showTitle !== false;

    const showFavorite =
        content.showFavorite !== false;

    const showShare =
        content.showShare !== false;

    const showPrice =
        content.showPrice !== false;

    const showOldPrice =
        content.showOldPrice !== false;

    const showDiscount =
        content.showDiscount !== false;

    const showOfferBadge =
        content.showOfferBadge !== false;

    const showButton =
        content.showButton !== false;

    const buttonText =
        content.buttonText ||
        "Ver producto";

    function getPriceAlignmentStyle() {

        const alignment =
            content.priceAlignment || "left";

        return {
            width: "100%",

            textAlign:
                alignment,

            alignItems:
                alignment === "center"
                    ? "center"
                    : alignment === "right"
                        ? "flex-end"
                        : "flex-start"
        };

    }

    /*  UI */

    return (
        <section
            className="store_featured_section"
            style={sectionStyle}
        >

            <div className="store_featured_inner">

                <div className="store_featured_header">

                    {
                        content.showBadge !== false && (
                            <span
                                className="store_badge"
                                style={typography.meta || {}}
                            >
                                {
                                    content.badgeText ||
                                    currentText.badge
                                }
                            </span>
                        )
                    }

                    {
                        content.showTitle !== false && (
                            <h2
                                className="store_featured_title"
                                style={typography.title || {}}
                            >
                                {
                                    content.title ||
                                    currentText.title
                                }
                            </h2>
                        )
                    }

                    {
                        content.showDescription === true &&
                        content.description && (
                            <p
                                className="store_featured_description"
                                style={typography.text || {}}
                            >
                                {content.description}
                            </p>
                        )
                    }

                </div>

                <div className="store_featured_slider">

                    {
                        products.map(product => {

                            const hasSalePrice =
                                product.sale_price !== null &&
                                product.sale_price !== undefined &&
                                product.sale_price !== "" &&
                                Number(product.sale_price) > 0;

                            const hasDiscount =
                                hasSalePrice &&
                                Number(product.price) > 0 &&
                                Number(product.sale_price) <
                                Number(product.price);

                            const discountPercent =
                                hasDiscount
                                    ? Math.round(
                                        (
                                            (
                                                Number(product.price) -
                                                Number(product.sale_price)
                                            ) /
                                            Number(product.price)
                                        ) * 100
                                    )
                                    : 0;

                            return (
                                <div
                                    key={product.id}
                                    className="store_featured_slide"
                                >
                                    <Link
                                        href={
                                            `/p/${entity.slug}/products/${product.id}`
                                        }
                                        className="store_product_card_link"
                                    >
                                        <article
                                            className={[
                                                "store_product_card",
                                                getCardStyleClass(),
                                                getCardShadowClass()
                                            ].filter(Boolean).join(" ")}
                                            style={cardStyle}
                                        >

                                            {
                                                showFavorite && (
                                                    <StoreFavoriteButton
                                                        storeId={entity.id}
                                                        productId={product.id}
                                                    />
                                                )
                                            }

                                            {
                                                showShare && (
                                                    <StoreShareButton
                                                        store={entity}
                                                        product={product}
                                                    />
                                                )
                                            }

                                            {
                                                product.image_url ? (
                                                    <div
                                                        className="store_product_image_wrap"
                                                        style={imageWrapStyle}
                                                    >
                                                        <Image
                                                            src={product.image_url}
                                                            alt={product.title}
                                                            fill
                                                            sizes="
                                                                (max-width: 575px) 100vw,
                                                                (max-width: 767px) 50vw,
                                                                (max-width: 991px) 33vw,
                                                                25vw
                                                            "
                                                            className={[
                                                                "store_product_image",
                                                                getImageHoverClass()
                                                            ].filter(Boolean).join(" ")}
                                                            style={imageStyle}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="store_product_image_placeholder"
                                                        style={imageWrapStyle}
                                                    >
                                                        Sin imagen
                                                    </div>
                                                )
                                            }

                                            {
                                                showInfoArea && (
                                                    <div
                                                        className="store_product_card_body"
                                                        style={infoStyle}
                                                    >

                                                        {
                                                            showCategory &&
                                                            product.category_name && (
                                                                <div
                                                                    className="store_product_category"
                                                                    style={typography.meta || {}}
                                                                >
                                                                    {
                                                                        product.category_name
                                                                    }
                                                                </div>
                                                            )
                                                        }

                                                        {
                                                            showSku &&
                                                            product.sku && (
                                                                <div
                                                                    className="store_product_sku"
                                                                    style={typography.meta || {}}
                                                                >
                                                                    {product.sku}
                                                                </div>
                                                            )
                                                        }

                                                        {
                                                            showProductTitle && (
                                                                <h3
                                                                    className="store_product_card_title"
                                                                    style={typography.title || {}}
                                                                >
                                                                    {product.title}
                                                                </h3>
                                                            )
                                                        }

                                                        <div className="store_product_card_footer">

                                                            <div
                                                                className="store_product_price_group"
                                                                style={getPriceAlignmentStyle()}
                                                            >

                                                                {
                                                                    showOfferBadge &&
                                                                    hasSalePrice && (
                                                                        <span
                                                                            className="store_product_offer_badge"
                                                                            style={offerBadgeStyle}
                                                                        >
                                                                            Oferta
                                                                        </span>
                                                                    )
                                                                }

                                                                {
                                                                    showPrice && (
                                                                        <div
                                                                            className="store_product_price"
                                                                            style={priceStyle}
                                                                        >
                                                                            {
                                                                                formatStorePrice(
                                                                                    hasSalePrice
                                                                                        ? product.sale_price
                                                                                        : product.price,
                                                                                    product.currency
                                                                                )
                                                                            }
                                                                        </div>
                                                                    )
                                                                }

                                                                {
                                                                    showOldPrice &&
                                                                    hasSalePrice && (
                                                                        <div
                                                                            className="store_product_old_price"
                                                                            style={oldPriceStyle}
                                                                        >
                                                                            {
                                                                                formatStorePrice(
                                                                                    product.price,
                                                                                    product.currency
                                                                                )
                                                                            }
                                                                        </div>
                                                                    )
                                                                }

                                                                {
                                                                    showDiscount &&
                                                                    hasDiscount && (
                                                                        <div
                                                                            className="store_product_discount"
                                                                            style={discountStyle}
                                                                        >
                                                                            -{discountPercent}% OFF
                                                                        </div>
                                                                    )
                                                                }

                                                            </div>

                                                            {
                                                                showButton && (
                                                                    <span
                                                                        className={[
                                                                            "store_product_card_btn",
                                                                            content.buttonFullWidth
                                                                                ? "store_product_btn_full"
                                                                                : ""
                                                                        ].filter(Boolean).join(" ")}
                                                                        style={buttonStyle}
                                                                    >

                                                                        {
                                                                            content.buttonIcon &&
                                                                            content.buttonIconPosition === "left" && (
                                                                                <span className="store_product_card_btn_icon">
                                                                                    {renderButtonIcon()}
                                                                                </span>
                                                                            )
                                                                        }

                                                                        {buttonText}

                                                                        {
                                                                            content.buttonIcon &&
                                                                            content.buttonIconPosition !== "left" && (
                                                                                <span className="store_product_card_btn_icon">
                                                                                    {renderButtonIcon()}
                                                                                </span>
                                                                            )
                                                                        }

                                                                    </span>
                                                                )
                                                            }

                                                        </div>

                                                    </div>
                                                )
                                            }

                                        </article>
                                    </Link>
                                </div>
                            );

                        })
                    }

                </div>

            </div>

        </section>
    );

}