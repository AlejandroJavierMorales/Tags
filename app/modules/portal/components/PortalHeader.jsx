// =====================================
// FILE: app/modules/portal/components/PortalHeader.jsx
// Descripción: Header público del Portal con logo, identidad global, navegación y configuración visual.
// =====================================

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import "../styles/portal-public.css"

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

export default function PortalHeader({
    portal,
    routes = [],
    currentRoute = null
}) {
    const [menuOpen, setMenuOpen] =
        useState(false);

    const config =
        portal?.header_config || {};

    const identity =
        portal?.identity || {};

    const visibleRoutes =
        routes.filter(route =>
            Number(route.show_in_nav) === 1 &&
            Number(route.is_visible) === 1
        );

    const logoUrl =
        identity.logo_url ||
        portal?.logo_url ||
        null;

    const title =
        identity.name ||
        portal?.title ||
        "Portal";

    const subtitle =
        identity.description ||
        currentRoute?.page_title ||
        getRouteLabel(currentRoute || {}) ||
        "";

    const tokens =
        portal?.theme?.css_tokens || {};

    const headerStyle = {
        ...tokens,

        background:
            config.transparent === true
                ? "color-mix(in srgb, var(--qr-surface) 70%, transparent)"
                : config.backgroundColor || "var(--qr-surface)",

        color:
            config.textColor || "var(--qr-text)",

        position:
            config.sticky === true
                ? "sticky"
                : "relative",

        top:
            config.sticky === true
                ? 0
                : "auto",

        height:
            config.height || undefined
    };

    const innerStyle = {
        maxWidth:
            config.maxWidth || "1180px",
        justifyContent:
            config.align === "center"
                ? "center"
                : config.align === "right"
                    ? "flex-end"
                    : "space-between",
        paddingTop:
            config.paddingTop || "12px",

        paddingBottom:
            config.paddingBottom || "12px",
    };

    const drawerPosition =
        config.drawerPosition || "right";

    return (
        <header
            className="tags_portal_public_header"
            style={headerStyle}
        >
            <div
                className="tags_portal_public_header_inner"
                style={innerStyle}
            >

                <Link
                    href={`/p/${portal?.slug}`}
                    className="tags_portal_public_brand"
                >
                    {config.showLogo !== false && logoUrl && (
                        <span className="tags_portal_public_logo">
                            <Image
                                src={logoUrl}
                                alt={title}
                                width={52}
                                height={52}
                            />
                        </span>
                    )}

                    <span className="tags_portal_public_brand_text">
                        {config.showTitle !== false && (
                            <strong
                                style={getTypographyStyle(
                                    config.typography?.title
                                )}
                            >
                                {title}
                            </strong>
                        )}

                        {config.showSubtitle === true && subtitle && (
                            <small
                                style={getTypographyStyle(
                                    config.typography?.subtitle
                                )}
                            >
                                {subtitle}
                            </small>
                        )}
                    </span>
                </Link>

                {config.showMenu !== false && (
                    <>
                        <nav className="tags_portal_public_nav">
                            {visibleRoutes.map(route => (
                                <Link
                                    key={route.id}
                                    href={`/p/${route.page_slug}`}
                                    className={
                                        currentRoute?.id === route.id
                                            ? "active"
                                            : ""
                                    }
                                    style={getTypographyStyle(
                                        config.typography?.menu
                                    )}
                                >
                                    {getRouteLabel(route)}
                                </Link>
                            ))}
                        </nav>

                        <button
                            type="button"
                            className="tags_portal_public_menu_btn"
                            onClick={() => setMenuOpen(true)}
                        >
                            ☰
                        </button>
                    </>
                )}

                {config.showCta === true && config.ctaLabel && (
                    <Link
                        href={config.ctaUrl || "#"}
                        className="tags_portal_public_cta"
                    >
                        {config.ctaLabel}
                    </Link>
                )}

            </div>

            <div
                className={
                    menuOpen
                        ? "tags_portal_public_drawer_overlay is_open"
                        : "tags_portal_public_drawer_overlay"
                }
            >
                <div
                    className={`tags_portal_public_drawer ${drawerPosition} ${menuOpen ? "is_open" : ""}`}
                    style={{
                        background:
                            config.drawerBackgroundColor || "var(--qr-surface)",
                        color:
                            config.drawerTextColor || "var(--qr-text)"
                    }}
                >
                    <button
                        type="button"
                        className="tags_portal_public_drawer_close"
                        onClick={() => setMenuOpen(false)}
                    >
                        ×
                    </button>

                    <strong>{title}</strong>

                    {visibleRoutes.map(route => (
                        <Link
                            key={route.id}
                            href={`/p/${route.page_slug}`}
                            onClick={() => setMenuOpen(false)}
                        >
                            {getRouteLabel(route)}
                        </Link>
                    ))}
                </div>
            </div>

        </header>
    );
}