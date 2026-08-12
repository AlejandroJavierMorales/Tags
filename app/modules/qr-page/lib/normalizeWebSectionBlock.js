const MAX_IMAGES = 10;

function text(value, limit) {
    return String(value || "").trim().slice(0, limit);
}

export function normalizeWebSectionBlock(content = {}) {
    return {
        title: text(content.title, 190),
        subtitle: text(content.subtitle, 300),
        highlightedText: text(content.highlightedText, 600),
        paragraphs: (Array.isArray(content.paragraphs) ? content.paragraphs : [])
            .map(item => text(item, 5000))
            .filter(Boolean),
        images: (Array.isArray(content.images) ? content.images : [])
            .slice(0, MAX_IMAGES)
            .map(item => ({
                url: text(item?.url, 2000),
                alt: text(item?.alt, 255),
                storagePath: text(item?.storagePath, 1000)
            }))
            .filter(item => item.url),
        imageLayout: content.imageLayout === "carousel" ? "carousel" : "grid"
    };
}

export const WEB_SECTION_MAX_IMAGES = MAX_IMAGES;
