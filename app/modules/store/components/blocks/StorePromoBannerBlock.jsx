// =====================================
// Archivo:
// /app/modules/store/components/blocks/StorePromoBannerBlock.jsx
//
// Descripción:
// Banner promocional público de Tags Store.
// Sin Bootstrap y compatible con themes --qr-*.
//
// Contexto:
// store
// =====================================

import {
    FiArrowRight,
    FiEye,
    FiShoppingBag,
    FiShoppingCart
} from "react-icons/fi";

export default function StorePromoBannerBlock({
    entity,
    content = {},
    styles = {}
}) {

    const whatsapp =
        entity?.whatsapp;

    const cleanWhatsapp =
        String(whatsapp || "").replace(/\D/g, "");

    const showBadge =
        content.showBadge !== false;

    const showTitle =
        content.showTitle !== false;

    const showDescription =
        content.showDescription !== false;

    const showButton =
        content.showButton !== false;

    const cardStyle = {

        background:
            content.cardBackgroundColor || undefined,

        border:
            content.cardBorder === false
                ? "none"
                : undefined,

        borderColor:
            content.cardBorderColor || undefined,

        borderRadius:
            content.cardRadius || undefined,

        padding:
            content.cardPadding || undefined

    };

    const badgeStyle = {

        background:
            content.badgeBackgroundColor || undefined,

        color:
            content.badgeTextColor || undefined,

        borderRadius:
            content.badgeRadius || undefined

    };

    const buttonStyle = {

        width:
            content.buttonWidth || undefined,

        maxWidth:
            "100%",

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

        padding:
            content.buttonPaddingY ||
                content.buttonPaddingX
                ? `${content.buttonPaddingY || ""} ${content.buttonPaddingX || ""}`
                : undefined,

        "--store-promo-btn-hover-bg":
            content.buttonHoverBackgroundColor || content.buttonBackgroundColor || undefined,

        "--store-promo-btn-hover-color":
            content.buttonHoverTextColor || content.buttonTextColor || undefined

    };

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

    const sectionStyle = {
        backgroundColor: styles.backgroundColor || undefined,
        color: styles.textColor || undefined,
        textAlign: styles.alignment || undefined,
        padding: styles.padding || undefined,
        paddingTop: styles.marginTop || undefined,
        paddingBottom: styles.marginBottom || undefined
    };


    /*  UI  */

    return (

        <section
            className="store_promo_section"
            style={sectionStyle}
        >

            <div className="store_promo_inner">

                <div
                    className="store_promo_card"
                    style={cardStyle}
                >

                    <div className="store_promo_content">

                        {
                            showBadge && (

                                <span
                                    className="store_badge"
                                    style={{
                                        ...(styles?.typography?.meta || {}),
                                        ...badgeStyle,
                                        padding:"8px"
                                    }}
                                >
                                    {
                                        content.badge ||
                                        "Oferta"
                                    }
                                </span>

                            )
                        }

                        {
                            showTitle && (

                                <h2
                                    className="store_promo_title"
                                    style={styles?.typography?.title}
                                >
                                    {
                                        content.title ||
                                        "Promociones especiales"
                                    }
                                </h2>

                            )
                        }

                        {
                            showDescription && (

                                <p
                                    className="store_promo_text"
                                    style={styles?.typography?.text}
                                >
                                    {
                                        content.subtitle ||
                                        "Consultá ofertas, combos y beneficios disponibles."
                                    }
                                </p>

                            )
                        }

                    </div>

                    {
                        cleanWhatsapp &&
                        showButton && (

                            <a
                                href={`https://wa.me/54${cleanWhatsapp}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={[
                                    "store_btn_primary",
                                    "store_promo_btn",
                                    content.buttonHoverScale === "soft"
                                        ? "store_product_btn_hover_soft"
                                        : "",
                                    content.buttonHoverScale === "normal"
                                        ? "store_product_btn_hover_normal"
                                        : "",
                                    content.buttonHoverScale === "none"
                                        ? "store_product_btn_hover_none"
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

                                {
                                    content.buttonText ||
                                    "Consultar"
                                }

                                {
                                    content.buttonIcon &&
                                    content.buttonIconPosition !== "left" && (

                                        <span className="store_product_card_btn_icon">
                                            {renderButtonIcon()}
                                        </span>

                                    )
                                }

                            </a>

                        )
                    }

                </div>

            </div>

        </section>

    );

}