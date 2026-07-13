// =====================================
// FILE: app/modules/portal/components/PortalFooter.jsx
// Descripción: Footer público del Portal con identidad, menú, contacto y redes.
// =====================================

import Link from "next/link";
import "../styles/portal-public.css"
import Image from "next/image";

import {
    FaWhatsapp,
    FaPhoneAlt,
    FaEnvelope,
    FaMapMarkerAlt,
    FaGlobe,
    FaInstagram,
    FaFacebookF,
    FaTiktok,
    FaYoutube,
    FaLinkedinIn,
    FaStar,
    FaMapMarkedAlt
} from "react-icons/fa";

function getRouteLabel(route) {
    return (
        route.nav_label ||
        route.label ||
        route.addon_name ||
        route.page_title ||
        route.page_type ||
        "Página"
    );
}

function getTypographyStyle(config = {}) {
    return {
        fontSize: config.fontSize || undefined,
        fontWeight: config.fontWeight || undefined,
        lineHeight: config.lineHeight || undefined,
        letterSpacing: config.letterSpacing || undefined,
        fontStyle: config.fontStyle || undefined,
        textDecoration: config.textDecoration || undefined,
        textAlign: config.textAlign || undefined
    };
}

export default function PortalFooter({
    portal,
    routes = []
}) {
    const config =
        portal?.footer_config || {};

    const identity =
        portal?.identity || {};

    const visibleRoutes =
        routes.filter(route =>
            Number(route.show_in_nav) === 1 &&
            Number(route.is_visible) === 1
        );

    const title =
        identity.name ||
        portal?.title ||
        "Portal";

    const tokens =
        portal?.theme?.css_tokens || {};

    const footerStyle = {
        ...tokens,
        background:
            config.backgroundColor || "var(--qr-surface)",
        color:
            config.textColor || "var(--qr-text)",
        textAlign:
            config.align || undefined,
        borderTop:
            config.showTopBorder === false
                ? "none"
                : "1px solid var(--qr-border)",
        paddingTop:
            config.paddingTop || "34px",

        paddingBottom:
            config.paddingBottom || "18px"
    };


    function getExternalUrl(url) {
        if (!url) {
            return "";
        }

        if (
            url.startsWith("http://") ||
            url.startsWith("https://")
        ) {
            return url;
        }

        return `https://${url}`;
    }

    /*  UI */
    return (
        <footer
            className="tags_portal_public_footer"
            style={footerStyle}
        >
            <div
                className={`tags_portal_public_footer_inner cols_${config.columns || "3"}`}
            >
                <div className="tags_portal_public_footer_col tags_portal_public_footer_identity">
                    {config.showLogo !== false && identity.logo_url && (
                        <Image
                            src={identity.logo_url}
                            alt={title}
                            width={120}
                            height={80}
                            className="tags_portal_public_footer_logo"
                        />
                    )}

                    {config.showTitle !== false && (
                        <strong>{title}</strong>
                    )}

                    {config.showDescription !== false && identity.description && (
                        <p>{identity.description}</p>
                    )}
                </div>

                {config.showMenu !== false && (
                    <div className="tags_portal_public_footer_col">
                        <strong>Menú</strong>

                        {visibleRoutes.map(route => (
                            <Link
                                style={{
                                    color:
                                        config.linkColor || "var(--qr-primary)"
                                }}
                                key={route.id}
                                href={`/p/${route.page_slug}`}
                            >
                                {getRouteLabel(route)}
                            </Link>
                        ))}
                    </div>
                )}

                {config.showContact !== false && (
                    <div className="tags_portal_public_footer_col">
                        <strong>Contacto</strong>

                        {identity.whatsapp && (
                            <a
                                href={`https://wa.me/${identity.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tags_portal_public_footer_item"
                            >
                                <FaWhatsapp />
                                {identity.whatsapp}
                            </a>
                        )}

                        {identity.phone && (
                            <a
                                href={`tel:${identity.phone.replace(/[^\d+]/g, "")}`}
                                className="tags_portal_public_footer_item"
                            >
                                <FaPhoneAlt />
                                {identity.phone}
                            </a>
                        )}

                        {identity.email && (
                            <span className="tags_portal_public_footer_item">
                                <FaEnvelope />
                                {identity.email}
                            </span>
                        )}

                        {identity.address && (
                            <span className="tags_portal_public_footer_item">
                                <FaMapMarkerAlt />
                                {identity.address}
                            </span>
                        )}

                        {identity.website_url && (
                            <a
                                href={getExternalUrl(identity.website_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tags_portal_public_footer_item"
                            >
                                <FaGlobe />

                                {identity.website_url
                                    .replace(/^https?:\/\//, "")
                                    .replace(/\/$/, "")}
                            </a>
                        )}
                    </div>
                )}

                {config.showSocials !== false && (
                    <div className="tags_portal_public_footer_col">
                        <strong>Redes</strong>

                        {identity.instagram_url && (
                            <a href={getExternalUrl(identity.instagram_url)} target="_blank" rel="noopener noreferrer" className="tags_portal_public_footer_item">
                                <FaInstagram /> Instagram
                            </a>
                        )}

                        {identity.facebook_url && (
                            <a href={getExternalUrl(identity.facebook_url)} target="_blank" rel="noopener noreferrer" className="tags_portal_public_footer_item">
                                <FaFacebookF /> Facebook
                            </a>
                        )}

                        {identity.tiktok_url && (
                            <a href={getExternalUrl(identity.tiktok_url)} target="_blank" rel="noopener noreferrer" className="tags_portal_public_footer_item">
                                <FaTiktok /> TikTok
                            </a>
                        )}

                        {identity.youtube_url && (
                            <a href={getExternalUrl(identity.youtube_url)} target="_blank" rel="noopener noreferrer" className="tags_portal_public_footer_item">
                                <FaYoutube /> YouTube
                            </a>
                        )}

                        {identity.linkedin_url && (
                            <a href={getExternalUrl(identity.linkedin_url)} target="_blank" rel="noopener noreferrer" className="tags_portal_public_footer_item">
                                <FaLinkedinIn /> LinkedIn
                            </a>
                        )}

                        {identity.google_reviews_url && (
                            <a href={getExternalUrl(identity.google_reviews_url)} target="_blank" rel="noopener noreferrer" className="tags_portal_public_footer_item">
                                <FaStar /> Google Reviews
                            </a>
                        )}

                        {identity.maps_url && (
                            <a href={getExternalUrl(identity.maps_url)} target="_blank" rel="noopener noreferrer" className="tags_portal_public_footer_item">
                                <FaMapMarkedAlt /> Google Maps
                            </a>
                        )}
                    </div>
                )}
            </div>

            {(config.showCopyright !== false || config.showPoweredBy !== false) && (
                <div
                    className="tags_portal_public_footer_bottom"
                    style={getTypographyStyle(
                        config.typography?.copyright
                    )}
                >
                    {config.showCopyright !== false && (
                        <span>
                            {config.copyrightText ||
                                `© ${new Date().getFullYear()} ${title}. Todos los derechos reservados.`}
                        </span>
                    )}

                    {config.showPoweredBy !== false && (
                        <Link
                            href="https://www.tags.com.ar"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tags_portal_public_powered"
                        >
                            <span>
                                Desarrollado con <strong>Tags.com.ar</strong>
                            </span>

                            <Image
                                src="/logo.webp"
                                alt="Tags"
                                width={72}
                                height={22}
                                className="tags_portal_public_powered_logo"
                            />
                        </Link>
                    )}
                </div>
            )}
        </footer>
    );
}