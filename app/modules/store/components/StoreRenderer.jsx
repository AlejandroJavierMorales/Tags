// =====================================
// Archivo:
// /app/modules/store/components/public/StoreRenderer.jsx
//
// Descripción:
// Renderer público definitivo de Tags Store.
// Renderiza topbar/header fuera del builder
// para permitir header sticky.
//
// Contexto:
// store
// =====================================

import BuilderRenderer
    from "@/app/modules/builder/components/BuilderRenderer";

import StoreTopbarBlock from "./blocks/StoreTopbarBlock";
import StoreHeaderBlock from "./blocks/StoreHeaderBlock";
import StoreReviewsCTA from "./public/StoreReviewsCTA";


export default function StoreRenderer({
    store,
    sections = [],
    blocks = []
}) {

    const bodySections =
        sections.filter(section =>
            ![
                "topbar",
                "header",
                "footer"
            ].includes(section.section_type)
        );

    const footerSections =
        sections.filter(section =>
            section.section_type === "footer"
        );

    const bodyBlocks =
        blocks.filter(block => {
            const section =
                sections.find(item =>
                    item.id === block.section_id
                );

            return ![
                "topbar",
                "header",
                "footer"
            ].includes(section?.section_type);
        });

    const footerBlocks =
        blocks.filter(block => {
            const section =
                sections.find(item =>
                    item.id === block.section_id
                );

            return section?.section_type === "footer";
        });

    return (
        <div className="store_public_page">

            <StoreTopbarBlock
                entity={store}
                content={{}}
                styles={{}}
            />

            <StoreHeaderBlock
                entity={store}
                content={{}}
                styles={{}}
            />

            <BuilderRenderer
                context="store"
                entity={store}
                sections={bodySections}
                blocks={bodyBlocks}
            />

            <StoreReviewsCTA
                store={store}
            />

            <BuilderRenderer
                context="store"
                entity={store}
                sections={footerSections}
                blocks={footerBlocks}
            />

        </div>
    );

}