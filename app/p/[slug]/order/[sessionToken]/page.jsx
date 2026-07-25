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

export default async function Page({

    params

}) {

    const {

        slug,

        sessionToken

    } = await params;

    const restoData =
        await getPublicResto(
            slug,
            {}
        );

    if (!restoData?.store) {

        notFound();

    }

    return (

        <div
            className="resto_public_page"
            style={
                restoData.store.theme_css_vars ||
                {}
            }
        >

            <RestoCurrentOrder

                slug={slug}

                sessionToken={sessionToken}

                resto={restoData.store}

            />

        </div>

    );

}