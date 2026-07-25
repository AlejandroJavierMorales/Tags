// =====================================
// Archivo:
// /app/modules/builder/components/BuilderBlockRenderer.jsx
//
// Descripción:
// Renderizador genérico de bloques.
//
// Busca el módulo correspondiente
// dentro del registry según el contexto
// y renderiza el componente asociado.
//
// Utilizado por:
// - BuilderRenderer
// - Store
// - Resto
// - Reservas
// - QR Page
//
// Contexto:
// shared
// =====================================

import {
    getStoreModule
}
    from "@/app/modules/store/lib/storeModuleRegistry";

import {
    getRestoModule
}
    from "@/app/modules/resto/lib/restoModuleRegistry";

export default function BuilderBlockRenderer({
    context,
    entity,
    section,
    block
}) {

    if (!block?.is_visible) {
        return null;
    }

    let module = null;

    switch (context) {

        case "store":

            module =
                getStoreModule(
                    block.block_type
                );

            break;

        case "resto":

            module =
                getRestoModule(
                    block.block_type
                );

            break;

        default:

            return null;

    }

    if (!module) {

        console.warn(
            `[Builder] Module not found (${context}):`,
            block.block_type
        );

        return null;

    }

    const Component =
        module.component;

    if (!Component) {

        console.warn(
            `[Builder] Component not found (${context}):`,
            block.block_type
        );

        return null;

    }

    return (

        <Component
            entity={entity}
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