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
    page
}) {

    const footer =
        safeFooterConfig(
            page?.footer_config
        );

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
            footer.titleColor ||
            footer.textColor ||
            "var(--qr-text)"
    };

    const textStyle = {
        ...getTypographyStyle(
            { typography },
            "text"
        ),
        color:
            footer.textColor ||
            "var(--qr-text)"
    };

    const linkStyle = {
        ...getTypographyStyle(
            { typography },
            "links"
        ),
        color:
            footer.linkColor ||
            footer.textColor ||
            "var(--qr-text)"
    };

    const copyStyle = {
        ...getTypographyStyle(
            { typography },
            "copy"
        ),
        color:
            footer.copyColor ||
            footer.textColor ||
            "var(--qr-muted)"
    };

    const footerStyle = {
        backgroundColor:
            footer.backgroundColor ||
            "var(--qr-surface-alt)",
        color:
            footer.textColor ||
            "var(--qr-text)",
        borderTop:
            `1px solid ${footer.borderColor || "var(--qr-border)"}`,
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
                                        <span>{page.phone}</span>
                                    </div>
                                )
                            }

                            {
                                page.email && (
                                    <div className="qr_public_footer_item">
                                        <FaEnvelope />
                                        <span>{page.email}</span>
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
                                        href={page.instagram_url}
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
                                        href={page.facebook_url}
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
                                        href={page.tiktok_url}
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
                                        href={page.youtube_url}
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
                                        href={page.linkedin_url}
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