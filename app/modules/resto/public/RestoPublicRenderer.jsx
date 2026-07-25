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
    location = null
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

    return (
        <div
            className="resto_public_page"
            style={
                resto?.theme_css_vars ||
                {}
            }
        >

            <BuilderRenderer
                context="resto"
                entity={entity}
                sections={orderedSections}
                blocks={blocks}
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