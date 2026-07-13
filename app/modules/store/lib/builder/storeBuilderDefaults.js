// =====================================
// Archivo:
// /app/modules/store/lib/builder/storeBuilderDefaults.js
//
// Descripción:
// Valores iniciales para nuevas secciones
// y bloques del Builder de Tags Store.
// =====================================

import {
    getStoreModule
}
from "@/app/modules/store/lib/storeModuleRegistry";

export function getDefaultStoreBlockContent(type) {
    const module =
        getStoreModule(type);

    return {
        ...(module?.defaultContent || {})
    };
}

export function getDefaultStoreBlockStyles(type) {
    const module =
        getStoreModule(type);

    return {
        ...(module?.defaultStyles || {})
    };
}

export function getDefaultStoreBlockAnimation(type) {
    const module =
        getStoreModule(type);

    return {
        ...(module?.defaultAnimation || {
            type: "none"
        })
    };
}

export function getDefaultStoreSectionSettings() {
    return {
        container: "normal"
    };
}