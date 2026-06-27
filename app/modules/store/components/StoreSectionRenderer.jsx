// =====================================
// Archivo:
// /app/modules/store/components/public/StoreSectionRenderer.jsx
//
// Descripción:
// Renderiza una sección y sus bloques.
//
// Utilizado por:
// - StoreRenderer
//
// Contexto:
// store
// =====================================

import StoreBlockRenderer
    from "./StoreBlockRenderer";

export default function StoreSectionRenderer({
    store,
    section,
    blocks = []
}) {

    if (!section?.is_visible) {
        return null;
    }

    return (
        <section
            data-section-type={
                section.section_type
            }
        >

            {
                blocks.map((block) => (

                    <StoreBlockRenderer
                        key={block.id}
                        store={store}
                        section={section}
                        block={block}
                    />

                ))
            }

        </section>
    );
}