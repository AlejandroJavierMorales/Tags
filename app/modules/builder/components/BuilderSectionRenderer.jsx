// =====================================
// Archivo:
// /app/modules/builder/components/BuilderSectionRenderer.jsx
//
// Descripción:
// Renderiza una sección completa
// y todos sus bloques.
//
// Contexto:
// shared
// =====================================

import BuilderBlockRenderer
    from "./BuilderBlockRenderer";

export default function BuilderSectionRenderer({
    context,
    entity,
    section,
    blocks = []
}) {

    if (!section?.is_visible) {
        return null;
    }

    return (

        <section
            data-section-id={
                section.id
            }
            data-section-type={
                section.section_type
            }
        >

            {
                blocks.map(
                    (block) => (

                        <BuilderBlockRenderer
                            key={block.id}
                            context={context}
                            entity={entity}
                            section={section}
                            block={block}
                        />

                    )
                )
            }

        </section>

    );

}