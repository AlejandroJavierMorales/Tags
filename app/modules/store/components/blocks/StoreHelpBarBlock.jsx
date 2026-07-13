// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreHelpBarBlock.jsx
//
// Descripción:
// Bloque de ayuda y contacto de Tags Store.
// Sin Bootstrap y compatible con themes --qr-*.
//
// Contexto:
// store
// =====================================

export default function StoreHelpBarBlock({
    entity,
    content = {},
    styles = {}
}) {

    const whatsapp =
        entity?.whatsapp;

    const cleanWhatsapp =
        whatsapp
            ? String(whatsapp).replace(/\D/g, "")
            : "";

    const showTitle =
        content.showTitle !== false;

    const showText =
        content.showText !== false;

    const showButton =
        content.showButton !== false;

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
            content.cardRadius || undefined,

        padding:
            content.cardPadding || undefined
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

        "--store-help-btn-hover-bg":
            content.buttonHoverBackgroundColor || undefined,

        "--store-help-btn-hover-color":
            content.buttonHoverTextColor || undefined
    };

    function getTextStyle(part) {
        return styles?.typography?.[part] || {};
    }

    function getButtonHoverClass() {

        switch (content.buttonHoverScale) {

            case "soft":
                return "store_product_btn_hover_soft";

            case "normal":
                return "store_product_btn_hover_normal";

            case "none":
                return "store_product_btn_hover_none";

            default:
                return "";

        }

    }

    return (
        <section
            className="store_help_section"
            style={sectionStyle}
        >
            <div className="store_help_inner">

                <div
                    className="store_help_card"
                    style={cardStyle}
                >

                    {
                        showTitle && (

                            <h2
                                className="store_help_title"
                                style={getTextStyle("title")}
                            >
                                {
                                    content.title ||
                                    "¿Necesitás ayuda para comprar?"
                                }
                            </h2>

                        )
                    }

                    {
                        showText && (

                            <p
                                className="store_help_text"
                                style={getTextStyle("text")}
                            >
                                {
                                    content.text ||
                                    "Escribinos y te asesoramos antes de hacer tu pedido."
                                }
                            </p>

                        )
                    }

                    {
                        cleanWhatsapp &&
                        showButton && (

                            <a
                                href={`https://wa.me/54${cleanWhatsapp}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={[
                                    "store_btn_primary",
                                    "store_help_button",
                                    getButtonHoverClass()
                                ].filter(Boolean).join(" ")}
                                style={buttonStyle}
                            >
                                {
                                    content.buttonText ||
                                    "Consultar"
                                }
                            </a>

                        )
                    }

                </div>

            </div>
        </section>
    );

}