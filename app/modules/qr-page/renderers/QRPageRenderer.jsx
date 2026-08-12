import QRSectionRenderer from "./QRSectionRenderer";

import QRPageHeader from "./QRPageHeader";

import QRPageFooter from "./QRPageFooter";

import QRPageFloatingActions from "./QRPageFloatingActions";

import "./qr-page-renderer.css";

export default function QRPageRenderer({
    page,
    sections = [],
    products = [],
    preview = false,
    showOwnHeader = true,
    showOwnFooter = true
}) {

    const styles =
        page?.global_styles || {};

    const themeControlsColors =
        Number(styles.theme_override) === 0;

    const themeTokens =
        page?.theme?.css_tokens || {};

    const typography =
        page?.typography_tokens || {};

    const visibleSections =
        (sections || []).filter((section) =>
            section.is_visible !== 0 &&
            section.is_visible !== false
        );

    function getFontCssValue(font) {

        const fonts = {
            "Inter": "var(--font-inter)",
            "Poppins": "var(--font-poppins)",
            "Montserrat": "var(--font-montserrat)",
            "Raleway": "var(--font-raleway)",
            "Playfair Display": "var(--font-playfair)",
            "Lora": "var(--font-lora)",
            "Oswald": "var(--font-oswald)",
            "Bebas Neue": "var(--font-bebas)"
        };

        return fonts[font] || "var(--font-inter)";
    }

    return (
        <main
            className={
                visibleSections.length
                    ? "qr_public_page"
                    : "qr_public_page qr_public_page_empty"
            }
            style={{
                ...themeTokens,

                "--qr-font-family":
                    getFontCssValue(
                        typography.fontFamily || "Inter"
                    ),

                "--qr-h1-size":
                    typography.h1?.fontSize || "56px",

                "--qr-h1-weight":
                    typography.h1?.fontWeight || "800",

                "--qr-h1-line":
                    typography.h1?.lineHeight || "1.1",

                "--qr-h2-size":
                    typography.h2?.fontSize || "42px",

                "--qr-h2-weight":
                    typography.h2?.fontWeight || "700",

                "--qr-h3-size":
                    typography.h3?.fontSize || "30px",

                "--qr-h3-weight":
                    typography.h3?.fontWeight || "700",

                "--qr-subtitle-size":
                    typography.subtitle?.fontSize || "22px",

                "--qr-subtitle-weight":
                    typography.subtitle?.fontWeight || "500",

                "--qr-body-size":
                    typography.body?.fontSize || "17px",

                "--qr-body-weight":
                    typography.body?.fontWeight || "400",

                "--qr-body-line":
                    typography.body?.lineHeight || "1.8",

                "--qr-small-size":
                    typography.small?.fontSize || "13px",

                "--qr-button-size":
                    typography.button?.fontSize || "15px",

                "--qr-button-weight":
                    typography.button?.fontWeight || "600",

                backgroundColor:
                    themeControlsColors
                        ? "var(--qr-bg)"
                        : styles.backgroundColor || "var(--qr-bg)",

                color:
                    themeControlsColors
                        ? "var(--qr-text)"
                        : styles.textColor || "var(--qr-text)"
            }}
        >
            {
                preview && (
                    <div className="qr_public_preview_badge">
                        Vista previa
                    </div>
                )
            }

            {showOwnHeader && (
                <QRPageHeader
                    page={page}
                    sections={visibleSections}
                />
            )}

            {
                visibleSections.map((section) => (
                    <QRSectionRenderer
                        key={section.id}
                        section={section}
                        page={page}
                        products={products}
                    />
                ))
            }

            {showOwnFooter && (
                <QRPageFooter
                    page={page}
                />
            )}

            <QRPageFloatingActions
                page={page}
            />
        </main>
    );
}
