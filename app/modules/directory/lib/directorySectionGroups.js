const RESERVED_SECTION_SLOTS = new Set([
    "presentation",
    "gallery",
    "catalog",
    "contact",
    "benefits",
    "loyalty"
]);

function cleanText(value, maxLength) {
    return String(value || "").trim().slice(0, maxLength);
}

function cleanGroupId(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
}

export function directorySectionSlot(section) {
    let settings = section?.settings_json || {};
    if (typeof settings === "string") {
        try { settings = JSON.parse(settings); } catch { settings = {}; }
    }
    const blockType = section?.blocks?.[0]?.type;
    return settings.directoryBaseSlot
        || (blockType === "gallery" || section?.type === "gallery" ? "gallery"
            : blockType === "contact_info" ? "contact"
                : blockType === "catalog" || section?.type === "catalog" ? "catalog"
                    : blockType === "benefits" ? "benefits"
                        : blockType === "loyalty_program" ? "loyalty"
                            : "web");
}

export function isDirectorySectionGroupable(section) {
    return !RESERVED_SECTION_SLOTS.has(directorySectionSlot(section));
}

export function normalizeDirectorySectionGroups(value, allowedSectionIds = null) {
    if (!Array.isArray(value)) return [];
    const allowed = allowedSectionIds ? new Set([...allowedSectionIds].map(Number)) : null;
    const usedGroupIds = new Set();
    const assignedSectionIds = new Set();

    return value.slice(0, 30).reduce((groups, source, index) => {
        if (!source || typeof source !== "object") return groups;
        let id = cleanGroupId(source.id) || `grupo-${index + 1}`;
        if (usedGroupIds.has(id)) return groups;
        usedGroupIds.add(id);

        const sectionIds = (Array.isArray(source.sectionIds) ? source.sectionIds : [])
            .map(Number)
            .filter(sectionId => Number.isInteger(sectionId) && sectionId > 0)
            .filter(sectionId => !allowed || allowed.has(sectionId))
            .filter(sectionId => {
                if (assignedSectionIds.has(sectionId)) return false;
                assignedSectionIds.add(sectionId);
                return true;
            })
            .slice(0, 30);

        groups.push({
            id,
            title: cleanText(source.title, 140) || `Grupo ${index + 1}`,
            eyebrow: cleanText(source.eyebrow, 80),
            description: cleanText(source.description, 1000),
            imageUrl: cleanText(source.imageUrl, 2000),
            imageAlt: cleanText(source.imageAlt, 255),
            layout: source.layout === "accordion" ? "accordion" : "cards",
            enabled: source.enabled !== false,
            sectionIds
        });
        return groups;
    }, []);
}

export function getDirectorySectionGroups(globalStyles = {}) {
    return normalizeDirectorySectionGroups(globalStyles?.directorySectionGroups);
}
