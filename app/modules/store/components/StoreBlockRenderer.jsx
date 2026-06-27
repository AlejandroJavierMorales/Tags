// =====================================
// Archivo:
// /app/modules/store/components/public/StoreBlockRenderer.jsx
//
// Descripción:
// Busca el componente asociado
// al block_type dentro del registry
// y lo renderiza.
//
// Utilizado por:
// - StoreSectionRenderer
//
// Contexto:
// store
// =====================================

import {
    getStoreModule
}
from "../../lib/storeModuleRegistry";

export default function StoreBlockRenderer({
    store,
    section,
    block
}) {

    if (!block?.is_visible) {
        return null;
    }

    const module =
        getStoreModule(
            block.block_type
        );

    if (!module) {

        console.warn(
            "Store module not found:",
            block.block_type
        );

        return null;
    }

    const Component =
        module.component;

    if (!Component) {
        return null;
    }

    return (
        <Component
            store={store}
            section={section}
            block={block}
            content={
                block.content_json || {}
            }
            styles={
                block.styles_json || {}
            }
            animation={
                block.animation_json || {}
            }
        />
    );
}