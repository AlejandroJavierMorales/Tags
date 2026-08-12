// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreTrustBarBlock.jsx
//
// Descripción:
// Barra de beneficios comerciales de Tags Store.
// Sin Bootstrap y compatible con themes --qr-*.
//
// Contexto:
// store
// =====================================

import {
    FiCheckCircle,
    FiCreditCard,
    FiHeadphones,
    FiMessageCircle,
    FiPackage,
    FiShield,
    FiStar,
    FiTruck
} from "react-icons/fi";

export default function StoreTrustBarBlock({
    content = {},
    styles = {}
}) {

    const items =
        content.items?.length
            ? content.items
            : [
                {
                    icon: "shield",
                    title: "Compra segura",
                    text: "Tus pedidos quedan registrados."
                },
                {
                    icon: "message",
                    title: "Atención directa",
                    text: "Consultá antes de comprar."
                },
                {
                    icon: "truck",
                    title: "Envíos y retiro",
                    text: "Coordinamos la entrega."
                }
            ];

    const showTitle =
        content.showTitle === true;

    const showDescription =
        content.showDescription === true;

    const showItemIcon =
        content.showItemIcon !== false;

    const showItemTitle =
        content.showItemTitle !== false;

    const showItemText =
        content.showItemText !== false;

    function getTextStyle(part) {
        return styles?.typography?.[part] || {};
    }

    const sectionStyle = {
        backgroundColor:
            styles.backgroundColor || undefined,

        color:
            styles.textColor || undefined,

        textAlign:
            styles.alignment || undefined,

        padding:
            styles.padding || undefined,

        paddingTop:
            styles.marginTop || undefined,

        paddingBottom:
            styles.marginBottom || undefined
    };

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
            !content.cardRadius || content.cardRadius === "20px"
                ? "12px"
                : content.cardRadius,

        padding:
            !content.cardPadding || content.cardPadding === "24px"
                ? "16px"
                : content.cardPadding
    };

    const iconStyle = {
        color:
            content.iconColor || undefined,

        background:
            content.iconBackgroundColor || undefined
    };

    function getIcon(icon) {

        switch (icon) {

            case "truck":
                return FiTruck;

            case "package":
                return FiPackage;

            case "card":
                return FiCreditCard;

            case "message":
                return FiMessageCircle;

            case "star":
                return FiStar;

            case "check":
                return FiCheckCircle;

            case "support":
                return FiHeadphones;

            default:
                return FiShield;

        }

    }

    function getCardShadowClass() {

        switch (content.cardShadow) {

            case "none":
                return "store_trust_card_shadow_none";

            case "medium":
                return "store_trust_card_shadow_medium";

            case "strong":
                return "store_trust_card_shadow_strong";

            default:
                return "";

        }

    }

    function getIconSizeClass() {

        switch (content.iconSize) {

            case "small":
                return "store_trust_icon_small";

            case "large":
                return "store_trust_icon_large";

            default:
                return "";

        }

    }

    function getIconShapeClass() {

        switch (content.iconShape) {

            case "none":
                return "store_trust_icon_none";

            case "rounded":
                return "store_trust_icon_rounded";

            case "square":
                return "store_trust_icon_square";

            default:
                return "store_trust_icon_circle";

        }

    }

    return (

        <section
            className="store_trust_section"
            style={sectionStyle}
        >

            <div className="store_trust_inner">

                {
                    showTitle && (

                        <h2
                            className="store_trust_heading"
                            style={getTextStyle("title")}
                        >
                            {
                                content.title ||
                                "Beneficios de comprar acá"
                            }
                        </h2>

                    )
                }

                {
                    showDescription && (

                        <p
                            className="store_trust_description"
                            style={getTextStyle("text")}
                        >
                            {
                                content.description ||
                                "Comprá con confianza y atención personalizada."
                            }
                        </p>

                    )
                }

                <div className="store_trust_grid">

                    {
                        items.map((item, index) => {

                            const Icon =
                                getIcon(item.icon);

                            return (

                                <article
                                    key={index}
                                    className={[
                                        "store_trust_card",
                                        getCardShadowClass()
                                    ].filter(Boolean).join(" ")}
                                    style={cardStyle}
                                >

                                    {
                                        showItemIcon && (

                                            <div
                                                className={[
                                                    "store_trust_icon",
                                                    getIconSizeClass(),
                                                    getIconShapeClass()
                                                ].filter(Boolean).join(" ")}
                                                style={iconStyle}
                                            >
                                                <Icon />
                                            </div>

                                        )
                                    }

                                    {
                                        showItemTitle && (

                                            <div
                                                className="store_trust_title"
                                                style={getTextStyle("title")}
                                            >
                                                {item.title}
                                            </div>

                                        )
                                    }

                                    {
                                        showItemText && (

                                            <div
                                                className="store_trust_text"
                                                style={getTextStyle("text")}
                                            >
                                                {item.text}
                                            </div>

                                        )
                                    }

                                </article>

                            );

                        })
                    }

                </div>

            </div>

        </section>

    );

}
