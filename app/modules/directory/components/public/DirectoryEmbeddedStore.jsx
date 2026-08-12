import BuilderBlockRenderer from "@/app/modules/builder/components/BuilderBlockRenderer";
import StoreTopbarBlock from "@/app/modules/store/components/blocks/StoreTopbarBlock";
import StoreHeaderBlock from "@/app/modules/store/components/blocks/StoreHeaderBlock";
import "@/app/modules/store/styles/store-public.css";
import "./DirectoryEmbeddedStore.css";

const EMBEDDED_BLOCKS = new Set([
    "store_hero",
    "store_product_grid",
    "store_trust_bar",
    "store_featured_products"
]);

function firstVisibleBlock(sections, blocks, sectionType) {
    const section = sections.find(item => item.section_type === sectionType && Number(item.is_visible) === 1);
    if (!section) return { section: null, block: null };
    const block = blocks
        .filter(item => Number(item.section_id) === Number(section.id) && Number(item.is_visible) === 1)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))[0] || null;
    return { section, block };
}

export default function DirectoryEmbeddedStore({ data, returnUrl }) {
    if (!data?.store || !data.sections?.length || !data.blocks?.length) return null;

    const store = {
        ...data.store,
        embedded_mode: "directory",
        embedded_return_url: returnUrl
    };
    const topbar = firstVisibleBlock(data.sections, data.blocks, "topbar");
    const header = firstVisibleBlock(data.sections, data.blocks, "header");
    const sectionOrder = new Map(data.sections.map((section, index) => [Number(section.id), Number(section.sort_order ?? index)]));
    const allowedBlocks = data.blocks
        .filter(block => Number(block.is_visible) === 1 && EMBEDDED_BLOCKS.has(block.block_type))
        .sort((a, b) => {
            const sectionDifference = Number(sectionOrder.get(Number(a.section_id)) || 0) - Number(sectionOrder.get(Number(b.section_id)) || 0);
            return sectionDifference || Number(a.sort_order || 0) - Number(b.sort_order || 0);
        });
    return <section className="tags_directory_embedded_store" id="directory-section-store" aria-label={data.store.name || "Tienda"}>
        <div className="store_public_page tags_directory_embedded_store_page" style={store.theme_css_vars || {}}>
            {topbar.section && topbar.block && <StoreTopbarBlock
                entity={store}
                section={topbar.section}
                block={topbar.block}
                content={topbar.block.content_json || {}}
                styles={topbar.block.styles_json || {}}
                animation={topbar.block.animation_json || {}}
            />}
            {header.section && header.block && <StoreHeaderBlock
                entity={store}
                section={header.section}
                block={header.block}
                content={{
                    ...(header.block.content_json || {}),
                    showLogo: false,
                    showName: false,
                    showDescription: false
                }}
                styles={header.block.styles_json || {}}
                animation={header.block.animation_json || {}}
            />}
            {allowedBlocks.map(block => {
                const section = data.sections.find(item => Number(item.id) === Number(block.section_id));
                if (!section) return null;
                return <section key={block.id} data-section-id={section.id} data-section-type={section.section_type}>
                    <BuilderBlockRenderer context="store" entity={store} section={section} block={block} />
                </section>;
            })}
        </div>
    </section>;
}
