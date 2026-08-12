import QRBlockRenderer from "./QRBlockRenderer";

const neutralSectionColors = [
    "#ffffff",
    "#fff",
    "#f8fafc",
    "#f9fafb",
    "white",
    "transparent"
];

function getThemeSectionBackground(value, sectionIndex = 0) {

    if (
        !value ||
        neutralSectionColors.includes(
            String(value).toLowerCase()
        )
    ) {
        return sectionIndex % 2 === 0
            ? "var(--qr-bg)"
            : "var(--qr-surface-alt)";
    }

    return value;
}

export default function QRSectionRenderer({
    section,
    page,
    products
}) {

    if (!section?.is_visible) {
        return null;
    }

    const styles =
        section.styles_json || {};

    const settings =
        section.settings_json || {};

    const containerClass =
        settings.container === "full"
            ? "qr_public_container_full"
            : settings.container === "wide"
                ? "qr_public_container_wide"
                : "qr_public_container";

    const sectionIndex =
        Number(section.sort_order || 0);

    const themeControlsColors =
        Number(page?.global_styles?.theme_override) === 0;

    const backgroundColor =
        themeControlsColors
            ? sectionIndex % 2 === 0
                ? "var(--qr-bg)"
                : "var(--qr-surface-alt)"
            : getThemeSectionBackground(
                styles.backgroundColor,
                sectionIndex
            );

    return (
        <section
            id={`section-${section.id}`}
            className={`qr_public_section qr_public_section_${section.type}`}
            style={{
                backgroundColor,
                color:
                    themeControlsColors
                        ? "var(--qr-text)"
                        : styles.textColor || "var(--qr-text)",
                textAlign:
                    styles.alignment || "center",
                paddingTop:
                    styles.paddingTop || "36px",
                paddingBottom:
                    styles.paddingBottom || "36px",
                borderRadius:
                    styles.borderRadius || "0"
            }}
        >
            <div className={containerClass}>

                {
                    section.type === "hero" &&
                    page.cover_image_url && (
                        <img
                            className="qr_public_hero_cover"
                            src={page.cover_image_url}
                            alt={page.title || ""}
                        />
                    )
                }

                {
                    (section.blocks || []).map((block) => (
                        <QRBlockRenderer
                            key={block.id}
                            block={block}
                            page={page}
                            products={products}
                        />
                    ))
                }

            </div>
        </section>
    );
}
