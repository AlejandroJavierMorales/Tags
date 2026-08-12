"use client";

import { useState } from "react";
import getTypographyStyle from "../lib/getTypographyStyle";

function safeHeaderConfig(value) {
    if (!value) return {};
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

export default function QRPageHeader({
    page,
    sections = []
}) {
    const [open, setOpen] =
        useState(false);

    const headerConfig =
        safeHeaderConfig(page?.header_config);

    const themeControlsColors =
        Number(page?.global_styles?.theme_override) === 0;

    const showLogo =
        headerConfig.showLogo !== false;

    const showName =
        headerConfig.showName !== false;

    const showMenu =
        headerConfig.showMenu !== false;

    const isSticky =
        headerConfig.sticky === true ||
        headerConfig.sticky === "true" ||
        headerConfig.sticky === 1 ||
        headerConfig.sticky === "1";

    const menuType =
        headerConfig.menuType || "default";

    const menuPosition =
        headerConfig.menuPosition || "top";

    const drawerPosition =
        headerConfig.drawerPosition || "left";

    const typography =
        headerConfig.typography || {};

    const headerTextColor =
        themeControlsColors
            ? "var(--qr-text)"
            : headerConfig.textColor || "var(--qr-text)";

    const menuTextColor =
        themeControlsColors
            ? "var(--qr-text)"
            : headerConfig.menuTextColor || headerTextColor;

    const logoTextStyle = {
        ...getTypographyStyle(
            { typography },
            "logo"
        ),
        color:
            headerTextColor
    };

    const desktopMenuTextStyle = {
        ...getTypographyStyle(
            { typography },
            "menu"
        ),
        color:
            headerTextColor,
        fontWeight:
            typography.menu?.fontWeight || "500"
    };

    const overlayMenuTextStyle = {
        ...getTypographyStyle(
            { typography },
            "menu"
        ),
        color:
            menuTextColor,
        fontWeight:
            typography.menu?.fontWeight || "500"
    };

    const menuSections =
        sections.filter((section) =>
            section.is_visible &&
            !["header", "footer"].includes(section.type)
        );

    const logoSize = headerConfig.logoSize || 140;

    function closeMenu() {
        setOpen(false);
    }

    return (
        <>
            <header
                className={
                    isSticky
                        ? "qr_public_header is_sticky"
                        : "qr_public_header"
                }
                style={{
                    backgroundColor:
                        themeControlsColors
                            ? "var(--qr-surface)"
                            : headerConfig.backgroundColor || "var(--qr-surface)",
                    color:
                        headerTextColor,
                    borderBottomColor:
                        themeControlsColors
                            ? "var(--qr-border)"
                            : headerConfig.borderColor || "var(--qr-border)"
                }}
            >
                <div className="qr_public_header_inner">

                    <a
                        href="#inicio"
                        className="qr_public_brand"
                        style={logoTextStyle}
                    >
                        {
                            showLogo &&
                            page?.logo_url && (
                                <img
                                    src={page.logo_url}
                                    alt={
                                        page.title ||
                                        page.business_name ||
                                        "Logo"
                                    }
                                    loading="eager"
                                    decoding="async"
                                    style={{
                                        maxWidth: `${logoSize}px`,
                                        maxHeight: `${Math.round(logoSize * 0.55)}px`,
                                        width: "auto",
                                        height: "auto",
                                        borderRadius:
                                            headerConfig.logoRadius || 0,
                                        objectFit: "contain",
                                        display: "block"
                                    }}
                                />
                            )
                        }

                        {
                            showName && (
                                <span>
                                    {
                                        page.title ||
                                        page.business_name ||
                                        "QR-Page"
                                    }
                                </span>
                            )
                        }
                    </a>

                    {
                        showMenu &&
                        menuSections.length > 0 && (
                            <>
                                <button
                                    type="button"
                                    className="qr_public_menu_btn"
                                    onClick={() =>
                                        setOpen(true)
                                    }
                                    aria-label="Abrir menú"
                                    style={{
                                        color:
                                            headerTextColor
                                    }}
                                >
                                    ☰
                                </button>

                                <nav className="qr_public_nav">
                                    {
                                        menuSections.map((section) => (
                                            <a
                                                key={section.id}
                                                href={`#section-${section.id}`}
                                                style={desktopMenuTextStyle}
                                            >
                                                {
                                                    section.title ||
                                                    section.type
                                                }
                                            </a>
                                        ))
                                    }
                                </nav>
                            </>
                        )
                    }

                </div>
            </header>

            {
                showMenu &&
                menuSections.length > 0 &&
                open && (
                    <div
                        className={[
                            "qr_public_menu_overlay",
                            menuType,
                            menuType === "default"
                                ? menuPosition
                                : "",
                            menuType === "drawer"
                                ? drawerPosition
                                : ""
                        ].join(" ")}
                    >
                        <button
                            type="button"
                            className="qr_public_menu_close"
                            onClick={closeMenu}
                            aria-label="Cerrar menú"
                        >
                            ×
                        </button>

                        <nav
                            className="qr_public_menu_panel"
                            style={{
                                backgroundColor:
                                    headerConfig.menuBackgroundColor ||
                                    headerConfig.backgroundColor ||
                                    "var(--qr-surface)",
                                color:
                                    menuTextColor
                            }}
                        >
                            {
                                menuSections.map((section) => (
                                    <a
                                        key={section.id}
                                        href={`#section-${section.id}`}
                                        onClick={closeMenu}
                                        style={overlayMenuTextStyle}
                                    >
                                        {
                                            section.title ||
                                            section.type
                                        }
                                    </a>
                                ))
                            }
                        </nav>
                    </div>
                )
            }
        </>
    );
}
