// =====================================
// FILE: app/p/[slug]/order/[sessionToken]/page.jsx
// Descripción:
// Página pública del pedido activo de Tags Resto.
// =====================================

import { notFound }
    from "next/navigation";

import { getPublicResto }
    from "@/app/modules/resto/lib/getPublicResto";

import RestoCurrentOrder
    from "@/app/modules/resto/components/public/RestoCurrentOrder";
import { normalizeRestoReturnUrl } from "@/app/modules/resto/lib/restoPublicContext";
import { getDirectoryThemeStyleForBusiness } from "@/app/modules/directory/lib/getDirectoryThemeStyleForBusiness";

export default async function Page({

    params,
    searchParams

}) {

    const {

        slug,

        sessionToken

    } = await params;

    const query = await Promise.resolve(searchParams || {});
    const returnUrl = normalizeRestoReturnUrl(query.returnTo);

    const restoData =
        await getPublicResto(
            slug,
            { allowDirectoryEmbedding: Boolean(returnUrl) }
        );

    if (!restoData?.store) {

        notFound();

    }

    const directoryThemeStyle = returnUrl
        ? await getDirectoryThemeStyleForBusiness(restoData.store.business_id)
        : {};
    const renderedResto = returnUrl
        ? {
            ...restoData.store,
            embedded_mode: "directory",
            embedded_return_url: returnUrl,
            theme_css_vars: {
                ...directoryThemeStyle,
                ...(restoData.store.theme_css_vars || {})
            }
        }
        : restoData.store;

    return (

        <div
            className="resto_public_page"
            style={
                renderedResto.theme_css_vars ||
                {}
            }
        >

            <RestoCurrentOrder

                slug={slug}

                sessionToken={sessionToken}

                resto={renderedResto}

            />

        </div>

    );

}
