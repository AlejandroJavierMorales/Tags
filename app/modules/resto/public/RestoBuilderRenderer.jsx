import { getRestoModule } from "@/app/modules/resto/lib/restoModuleRegistry";
import "@/app/modules/resto/styles/resto-builder-renderer.css";

const spacing = {
    none: "0",
    small: "12px",
    normal: "24px",
    large: "40px",
    xl: "64px"
};

const radius = {
    none: "0",
    small: "8px",
    normal: "16px",
    large: "28px",
    pill: "999px"
};

const effects = {
    fadeUp: "resto_builder_fade_up",
    fadeDown: "resto_builder_fade_down",
    zoomIn: "resto_builder_zoom_in",
    slideLeft: "resto_builder_slide_left",
    slideRight: "resto_builder_slide_right"
};

function removeManualColors(value = {}) {
    if (Array.isArray(value)) return value.map(removeManualColors);
    if (!value || typeof value !== "object") return value;

    return Object.fromEntries(
        Object.entries(value)
            .filter(([key]) =>
                !String(key).toLowerCase().includes("color") &&
                !["background", "border"].includes(String(key).toLowerCase())
            )
            .map(([key, nestedValue]) => [key, removeManualColors(nestedValue)])
    );
}

function RestoBlock({ entity, section, block }) {
    if (!block?.is_visible) return null;
    const module = getRestoModule(block.block_type);
    const Component = module?.component;
    if (!Component) return null;
    const animation = block.animation_json || {};
    const effect = effects[animation.type];
    const animationStyle = effect && animation.enabled !== false
        ? { animationName: effect, animationDuration: `${Number(animation.duration || 500)}ms`, animationDelay: `${Number(animation.delay || 0)}ms`, animationFillMode: "both" }
        : undefined;
    const themeControlsColors = Number(entity?.page_global_styles?.theme_override) === 0;
    const blockStyles = themeControlsColors
        ? removeManualColors(block.styles_json || {})
        : block.styles_json || {};
    return <div className="resto_builder_rendered_block" style={animationStyle}><Component entity={entity} section={section} block={block} content={block.content_json || {}} styles={blockStyles} animation={animation} /></div>;
}

function RestoSection({ entity, section, blocks }) {
    if (!section?.is_visible) return null;
    const settings = section.settings_json || {};
    const themeControlsColors = Number(entity?.page_global_styles?.theme_override) === 0;
    const style = {
        backgroundColor: themeControlsColors ? undefined : settings.backgroundColor || undefined,
        color: themeControlsColors ? undefined : settings.textColor || undefined,
        textAlign: settings.alignment || undefined,
        paddingTop: spacing[settings.paddingTop] || undefined,
        paddingBottom: spacing[settings.paddingBottom] || undefined,
        borderRadius: radius[settings.borderRadius] || undefined
    };
    return <section className={`resto_builder_rendered_section resto_builder_container_${settings.container || "normal"}`} data-section-id={section.id} data-section-type={section.section_type} data-theme-colors={themeControlsColors ? "theme" : "custom"} style={style}>{blocks.filter(block => block.section_id === section.id).map(block => <RestoBlock key={block.id} entity={entity} section={section} block={block} />)}</section>;
}

export default function RestoBuilderRenderer({ entity, sections = [], blocks = [] }) {
    return <>{sections.map(section => <RestoSection key={section.id} entity={entity} section={section} blocks={blocks} />)}</>;
}
