// =====================================
// Archivo:
// /app/modules/builder/components/BuilderRenderer.jsx
//
// Descripción:
// Renderer principal del Builder.
//
// Contexto:
// shared
// =====================================

import BuilderSectionRenderer
    from "./BuilderSectionRenderer";

export default function BuilderRenderer({
    context,
    entity,
    sections = [],
    blocks = []
}) {

    return (
        <>
            {
                sections.map(
                    (section) => (

                        <BuilderSectionRenderer
                            key={section.id}
                            context={context}
                            entity={entity}
                            section={section}
                            blocks={
                                blocks.filter(
                                    b =>
                                        b.section_id ===
                                        section.id
                                )
                            }
                        />

                    )
                )
            }
        </>
    );

}