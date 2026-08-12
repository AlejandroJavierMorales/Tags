import RestoTopbarBlock from "@/app/modules/resto/components/blocks/RestoTopbarBlock";
import RestoHeaderBlock from "@/app/modules/resto/components/blocks/RestoHeaderBlock";
import RestoPublicRenderer from "@/app/modules/resto/public/RestoPublicRenderer";
import "@/app/modules/resto/styles/resto-public.css";
import "./DirectoryEmbeddedResto.css";

const ALLOWED_BLOCKS = new Set([
    "resto_hero",
    "resto_service_info",
    "resto_categories",
    "resto_featured_products",
    "resto_product_grid",
    "resto_order_status",
    "resto_service_actions",
    "resto_trust_bar"
]);

function firstBlock(blocks, type) {
    return blocks
        .filter(block => block.block_type === type && Number(block.is_visible) === 1)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))[0] || null;
}

export default function DirectoryEmbeddedResto({ data, returnUrl }) {
    if (!data?.store || !data.sections?.length || !data.blocks?.length) return null;

    const resto = {
        ...data.store,
        slug: data.store.page_slug || data.store.slug,
        embedded_mode: "directory",
        embedded_return_url: returnUrl
    };
    const topbar = firstBlock(data.blocks, "resto_topbar");
    const header = firstBlock(data.blocks, "resto_header");
    const blocks = data.blocks.filter(block => ALLOWED_BLOCKS.has(block.block_type));
    const sectionIds = new Set(blocks.map(block => Number(block.section_id)));
    const sections = data.sections.filter(section => sectionIds.has(Number(section.id)));

    return <section className="tags_directory_embedded_resto" id="directory-section-resto" aria-label={resto.name || "Gastronomía"}>
        <div className="tags_directory_embedded_resto_page" style={resto.theme_css_vars || {}}>
            {topbar && <RestoTopbarBlock entity={resto} content={topbar.content_json || {}} styles={topbar.styles_json || {}} />}
            {header && <RestoHeaderBlock
                entity={resto}
                content={{
                    ...(header.content_json || {}),
                    showLogo: false,
                    showName: false,
                    showDescription: false,
                    showSearch: true
                }}
                styles={header.styles_json || {}}
            />}
            <RestoPublicRenderer
                page={null}
                resto={resto}
                sections={sections}
                blocks={blocks}
                categories={data.categories || []}
                products={data.products || []}
                location={null}
                showOwnHeader={false}
                showOwnFooter={false}
            />
        </div>
    </section>;
}
