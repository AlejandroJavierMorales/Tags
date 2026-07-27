// =====================================
// Archivo:
// /app/modules/resto/public/RestoRenderer.jsx
//
// Descripción:
// Renderer público definitivo de Tags Resto.
//
// Renderiza el Builder en servidor y monta
// el controlador cliente independiente para
// el carrito público.
//
// Contexto:
// resto
// =====================================

import BuilderRenderer
    from "@/app/modules/builder/components/BuilderRenderer";

import RestoCartController
    from "@/app/modules/resto/components/public/RestoCartController";

export default function RestoPublicRenderer({
    page,
    resto,
    sections = [],
    blocks = [],
    categories = [],
    products = [],
    session = null,
    location = null,
    portal = null,
    showOwnHeader = true,
    showOwnFooter = true
}) {

    const orderedSections =
        [...sections].sort(
            (a, b) =>
                Number(a.sort_order || 0) -
                Number(b.sort_order || 0)
        );

    const entity = {
        ...resto,

        categories,

        products,

        resto_session:
            session,

        resto_location:
            location
    };

    const visibleBlocks =
        blocks
            .filter(block =>
                showOwnHeader ||
                !["resto_topbar", "resto_header"].includes(block.block_type)
            )
            .filter(block =>
                showOwnFooter ||
                block.block_type !== "resto_footer"
            );

    return (
        <div
            className="resto_public_page"
            style={
                {
                    ...(resto?.theme_css_vars || {}),
                    "--resto-page-width":
                        resto?.theme_css_vars?.["--qr-container-width"] ||
                        resto?.theme_css_vars?.["--page-width"] ||
                        "1320px"
                }
            }
        >

            <BuilderRenderer
                context="resto"
                entity={entity}
                sections={orderedSections}
                blocks={visibleBlocks}
            />

            <RestoCartController
                resto={resto}
                session={session}
                location={location}
                themeCssVars={resto?.theme_css_vars || {}}
            />

        </div>
    );

}
