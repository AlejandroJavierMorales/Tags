import {
    FaInstagram,
    FaFacebook,
    FaTiktok,
    FaYoutube,
    FaLinkedin,
    FaGlobe,
    FaEnvelope,
    FaPhone
}
    from "react-icons/fa6";

import getTypographyStyle
    from "../lib/getTypographyStyle";
import { buildSocialUrl } from "../lib/normalizeContactFields";

function safeFooterConfig(value) {

    if (!value) {
        return {};
    }

    if (typeof value === "object") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

export default function QRPageFooter({
    page={}
}) {

    const footer =
        safeFooterConfig(
            page?.footer_config
        );

    const themeControlsColors =
        Number(page?.global_styles?.theme_override) === 0;

    if (footer.showFooter === false) {
        return null;
    }

    const year =
        new Date().getFullYear();

    const typography =
        footer.typography || {};

    const titleStyle = {
        ...getTypographyStyle(
            { typography },
            "title"
        ),
        color:
            themeControlsColors
                ? "var(--qr-text)"
                : footer.titleColor || footer.textColor || "var(--qr-text)"
    };

    const textStyle = {
        ...getTypographyStyle(
            { typography },
            "text"
        ),
        color:
            themeControlsColors
                ? "var(--qr-text)"
                : footer.textColor || "var(--qr-text)"
    };

    const linkStyle = {
        ...getTypographyStyle(
            { typography },
            "links"
        ),
        color:
            themeControlsColors
                ? "var(--qr-primary)"
                : footer.linkColor || footer.textColor || "var(--qr-text)"
    };

    const copyStyle = {
        ...getTypographyStyle(
            { typography },
            "copy"
        ),
        color:
            themeControlsColors
                ? "var(--qr-muted)"
                : footer.copyColor || footer.textColor || "var(--qr-muted)"
    };

    const footerStyle = {
        backgroundColor:
            themeControlsColors
                ? "var(--qr-surface-alt)"
                : footer.backgroundColor || "var(--qr-surface-alt)",
        color:
            themeControlsColors
                ? "var(--qr-text)"
                : footer.textColor || "var(--qr-text)",
        borderTop:
            `1px solid ${themeControlsColors ? "var(--qr-border)" : footer.borderColor || "var(--qr-border)"}`,
        textAlign:
            footer.alignment ||
            "center"
    };

    return (
        <footer
            className="qr_public_footer"
            style={footerStyle}
        >
            <div className="qr_public_footer_inner">

                {
                    footer.showBusinessName !== false && (
                        <h3 style={titleStyle}>
                            {
                                page.title ||
                                page.business_name
                            }
                        </h3>
                    )
                }

                {
                    footer.showDescription !== false &&
                    footer.text && (
                        <p style={textStyle}>
                            {footer.text}
                        </p>
                    )
                }

                {
                    footer.showContact !== false && (
                        <div
                            className="qr_public_footer_contact"
                            style={textStyle}
                        >

                            {
                                page.phone && (
                                    <div className="qr_public_footer_item">
                                        <FaPhone />
                                        <a href={`tel:${page.phone}`}>
                                            {page.phone}
                                        </a>
                                    </div>
                                )
                            }

                            {
                                page.email && (
                                    <div className="qr_public_footer_item">
                                        <FaEnvelope />
                                        <a href={`mailto:${page.email}`}>
                                            {page.email}
                                        </a>
                                    </div>
                                )
                            }

                            {
                                page.address && (
                                    <div className="qr_public_footer_item">
                                        <span>{page.address}</span>
                                    </div>
                                )
                            }

                        </div>
                    )
                }

                {
                    footer.showSocialLinks !== false && (
                        <div className="qr_public_footer_social">

                            {
                                page.website_url && (
                                    <a
                                        href={page.website_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={linkStyle}
                                        aria-label="Sitio web"
                                    >
                                        <FaGlobe />
                                    </a>
                                )
                            }

                            {
                                page.instagram_url && (
                                    <a
                                        href={buildSocialUrl(
                                            "instagram",
                                            page?.instagram
                                        )}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={linkStyle}
                                        aria-label="Instagram"
                                    >
                                        <FaInstagram />
                                    </a>
                                )
                            }

                            {
                                page.facebook_url && (
                                    <a
                                        href={buildSocialUrl(
                                            "facebook",
                                            page?.facebook
                                        )}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={linkStyle}
                                        aria-label="Facebook"
                                    >
                                        <FaFacebook />
                                    </a>
                                )
                            }

                            {
                                page.tiktok_url && (
                                    <a
                                        href={buildSocialUrl(
                                            "tiktok",
                                            page?.tiktok
                                        )}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={linkStyle}
                                        aria-label="TikTok"
                                    >
                                        <FaTiktok />
                                    </a>
                                )
                            }

                            {
                                page.youtube_url && (
                                    <a
                                        href={buildSocialUrl(
                                            "youtube",
                                            page?.youtube
                                        )}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={linkStyle}
                                        aria-label="YouTube"
                                    >
                                        <FaYoutube />
                                    </a>
                                )
                            }

                            {
                                page.linkedin_url && (
                                    <a
                                        href={buildSocialUrl(
                                            "linkedin",
                                            page?.likedin
                                        )}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={linkStyle}
                                        aria-label="LinkedIn"
                                    >
                                        <FaLinkedin />
                                    </a>
                                )
                            }

                        </div>
                    )
                }

                {
                    footer.showCopyright !== false && (
                        <div
                            className="qr_public_footer_copy"
                            style={copyStyle}
                        >
                            © {year}{" "}
                            {
                                page.title ||
                                page.business_name
                            }
                        </div>
                    )
                }

            </div>
        </footer>
    );
}
