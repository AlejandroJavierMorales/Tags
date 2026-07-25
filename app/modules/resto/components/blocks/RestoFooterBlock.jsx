"use client";

// =====================================
// Archivo:
// /app/modules/resto/components/blocks/RestoFooterBlock.jsx
//
// Descripción:
// Pie de página público de Tags Resto.
//
// Muestra identidad, contacto, ubicación,
// redes sociales y crédito de Tags.
//
// Permite mostrar opcionalmente un fondo
// configurable detrás del logo.
//
// Contexto:
// resto
// =====================================

import "../../styles/resto-public.css";

import {
    MdOutlinePhone,
    MdOutlineEmail,
    MdOutlineLocationOn
}
    from "react-icons/md";

import {
    FaWhatsapp,
    FaInstagram,
    FaFacebookF,
    FaTiktok,
    FaXTwitter
}
    from "react-icons/fa6";

export default function RestoFooterBlock({
    entity,
    content = {},
    styles = {}
}) {

    function getTextStyle(
        part
    ) {

        return (
            styles?.typography?.[part] ||
            {}
        );

    }

    const contact =
        entity?.contact ||
        {};

    const social =
        entity?.social ||
        {};

    const location =
        entity?.location ||
        {};

    const logo =
        entity?.logo_url ||
        entity?.logo ||
        content?.logo ||
        "/logo_tags_qr.webp";

    const name =
        entity?.name ||
        content?.name ||
        "Mi Restaurante";

    const description =
        entity?.description ||
        content?.description ||
        "";

    const address =
        String(
            location?.address ||
            ""
        ).trim();

    const phone =
        String(
            contact?.phone ||
            ""
        ).trim();

    const whatsapp =
        String(
            contact?.whatsapp ||
            ""
        ).replace(
            /\D/g,
            ""
        );

    const email =
        String(
            contact?.email ||
            ""
        ).trim();

    const showLogoBackground =
        content?.showLogoBackground ===
        true;

    const logoBackgroundColor =
        content?.logoBackgroundColor ||
        "#ffffff";

    const logoPadding =
        content?.logoPadding ||
        "1rem";

    const logoRadius =
        content?.logoRadius ||
        "var(--qr-radius)";

    const socialLinks = [
        {
            key:
                "instagram",

            enabled:
                content?.showInstagram !==
                    false &&
                Boolean(
                    social?.instagram
                ),

            href:
                social?.instagram,

            label:
                "Instagram",

            icon:
                <FaInstagram />
        },

        {
            key:
                "facebook",

            enabled:
                content?.showFacebook !==
                    false &&
                Boolean(
                    social?.facebook
                ),

            href:
                social?.facebook,

            label:
                "Facebook",

            icon:
                <FaFacebookF />
        },

        {
            key:
                "tiktok",

            enabled:
                content?.showTikTok !==
                    false &&
                Boolean(
                    social?.tiktok
                ),

            href:
                social?.tiktok,

            label:
                "TikTok",

            icon:
                <FaTiktok />
        },

        {
            key:
                "x",

            enabled:
                content?.showX !==
                    false &&
                Boolean(
                    social?.x
                ),

            href:
                social?.x,

            label:
                "X",

            icon:
                <FaXTwitter />
        }
    ].filter(
        item =>
            item.enabled
    );

    return (
        <footer
            className="resto_footer"
            style={{
                background:
                    styles?.backgroundColor,

                color:
                    styles?.textColor,

                padding:
                    styles?.padding,

                marginTop:
                    styles?.marginTop,

                marginBottom:
                    styles?.marginBottom
            }}
        >
            <div className="container">

                <div className="resto_footer_inner">

                    <div className="resto_footer_identity">

                        {
                            content?.showLogo !==
                                false && (
                                <div
                                    className={[
                                        "resto_footer_logo_wrapper",
                                        showLogoBackground
                                            ? "resto_footer_logo_wrapper_active"
                                            : ""
                                    ]
                                        .filter(Boolean)
                                        .join(" ")
                                    }
                                    style={{
                                        "--resto-footer-logo-background":
                                            logoBackgroundColor,

                                        "--resto-footer-logo-padding":
                                            logoPadding,

                                        "--resto-footer-logo-radius":
                                            logoRadius
                                    }}
                                >
                                    <img
                                        src={logo}
                                        alt={name}
                                        className="resto_footer_logo"
                                    />
                                </div>
                            )
                        }

                        {
                            content?.showName !==
                                false && (
                                <h3
                                    className="resto_footer_name"
                                    style={
                                        getTextStyle(
                                            "title"
                                        )
                                    }
                                >
                                    {name}
                                </h3>
                            )
                        }

                        {
                            content?.showDescription !==
                                false &&
                            Boolean(description) && (
                                <p
                                    className="resto_footer_description"
                                    style={
                                        getTextStyle(
                                            "text"
                                        )
                                    }
                                >
                                    {description}
                                </p>
                            )
                        }

                    </div>

                    <div className="resto_footer_contacts">

                        {
                            content?.showAddress !==
                                false &&
                            Boolean(address) && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                        address
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="resto_footer_contact"
                                >
                                    <MdOutlineLocationOn />

                                    <span>
                                        {address}
                                    </span>
                                </a>
                            )
                        }

                        {
                            content?.showPhone !==
                                false &&
                            Boolean(phone) && (
                                <a
                                    href={`tel:${phone}`}
                                    className="resto_footer_contact"
                                >
                                    <MdOutlinePhone />

                                    <span>
                                        {phone}
                                    </span>
                                </a>
                            )
                        }

                        {
                            content?.showWhatsapp !==
                                false &&
                            Boolean(whatsapp) && (
                                <a
                                    href={`https://wa.me/${whatsapp}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="resto_footer_contact"
                                >
                                    <FaWhatsapp />

                                    <span>
                                        WhatsApp
                                    </span>
                                </a>
                            )
                        }

                        {
                            content?.showEmail !==
                                false &&
                            Boolean(email) && (
                                <a
                                    href={`mailto:${email}`}
                                    className="resto_footer_contact"
                                >
                                    <MdOutlineEmail />

                                    <span>
                                        {email}
                                    </span>
                                </a>
                            )
                        }

                    </div>

                    {
                        socialLinks.length > 0 && (
                            <div className="resto_footer_social">

                                {
                                    socialLinks.map(
                                        socialItem => (
                                            <a
                                                key={
                                                    socialItem.key
                                                }
                                                href={
                                                    socialItem.href
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="resto_footer_social_button"
                                                aria-label={
                                                    socialItem.label
                                                }
                                                title={
                                                    socialItem.label
                                                }
                                            >
                                                {
                                                    socialItem.icon
                                                }
                                            </a>
                                        )
                                    )
                                }

                            </div>
                        )
                    }

                    <div className="resto_footer_bottom">

                        <span className="resto_footer_copyright">
                            © {new Date().getFullYear()} {name}
                        </span>

                        {
                            content?.showPoweredBy !==
                                false && (
                                <a
                                    href="https://tags.com.ar"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="resto_footer_powered"
                                >
                                    <span>
                                        Desarrollado con
                                    </span>

                                    <img
                                        src="/logo_tags_qr.webp"
                                        alt="Tags"
                                        className="resto_footer_tags_logo"
                                    />

                                    <strong>
                                        tags.com.ar
                                    </strong>
                                </a>
                            )
                        }

                    </div>

                </div>

            </div>
        </footer>
    );

}