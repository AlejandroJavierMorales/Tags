// =====================================
// Archivo:
// /app/modules/store/components/public/StoreRenderer.jsx
//
// Descripción:
// Renderer público definitivo de Tags Store.
// Renderiza topbar/header fuera del builder
// para permitir header sticky.
// Usa los bloques reales del Builder para
// contenido, estilos y animaciones.
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

    const orderedSections =
        [...sections].sort(
            (a, b) =>
                Number(a.sort_order || 0) -
                Number(b.sort_order || 0)
        );

    function getSectionByType(type) {
        return orderedSections.find(section =>
            section.section_type === type &&
            section.is_visible
        );
    }

    function getFirstVisibleBlock(section) {
        if (!section) {
            return null;
        }

        return blocks
            .filter(block =>
                Number(block.section_id) === Number(section.id) &&
                block.is_visible
            )
            .sort(
                (a, b) =>
                    Number(a.sort_order || 0) -
                    Number(b.sort_order || 0)
            )[0] || null;
    }

    const topbarSection =
        getSectionByType("topbar");

    const headerSection =
        getSectionByType("header");

    const topbarBlock =
        getFirstVisibleBlock(topbarSection);

    const headerBlock =
        getFirstVisibleBlock(headerSection);

    const bodySections =
        orderedSections.filter(section =>
            ![
                "topbar",
                "header",
                "footer"
            ].includes(section.section_type)
        );

    const footerSections =
        orderedSections.filter(section =>
            section.section_type === "footer"
        );

    const bodyBlocks =
        blocks.filter(block => {
            const section =
                orderedSections.find(item =>
                    Number(item.id) === Number(block.section_id)
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
                orderedSections.find(item =>
                    Number(item.id) === Number(block.section_id)
                );

            return section?.section_type === "footer";
        });

    return (
        <div
            className="store_public_page"
            style={store?.theme_css_vars || {}}
        >

            {topbarSection && topbarBlock && (
                <StoreTopbarBlock
                    entity={store}
                    section={topbarSection}
                    block={topbarBlock}
                    content={topbarBlock.content_json || {}}
                    styles={topbarBlock.styles_json || {}}
                    animation={topbarBlock.animation_json || {}}
                />
            )}

            {headerSection && headerBlock && (
                <StoreHeaderBlock
                    entity={store}
                    section={headerSection}
                    block={headerBlock}
                    content={headerBlock.content_json || {}}
                    styles={headerBlock.styles_json || {}}
                    animation={headerBlock.animation_json || {}}
                />
            )}

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