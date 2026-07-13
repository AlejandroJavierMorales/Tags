// =====================================
// Archivo:
// /app/p/[slug]/reviews/[token]/page.jsx
//
// Descripción:
// Página pública inicial de Commerce Reviews.
// Valida el token de una operación entregada,
// obtiene la tienda y los ítems adquiridos,
// y prepara el flujo público de calificación.
//
// Contexto:
// commerce-reviews
// =====================================

import { notFound }
    from "next/navigation";

import "@/app/modules/commerce-reviews/styles/commerce-reviews.css";

export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";

import CommerceReviewsClient
    from "@/app/modules/commerce-reviews/components/public/CommerceReviewsClient";
import { getCommerceReviewByToken } from "@/app/modules/commerce-reviews/lib/getCommerceReviewByToken";




export async function generateMetadata({
    params
}) {

    const data =
        await getCommerceReviewByToken({
            slug:
                params.slug,

            token:
                params.token
        });

    if (!data) {
        return {
            title:
                "Invitación no disponible",

            robots: {
                index: false,
                follow: false
            }
        };
    }

    return {
        title:
            `Calificá tu compra | ${data.store.name}`,

        description:
            `Contanos cómo fue tu experiencia con los productos de ${data.store.name}.`,

        robots: {
            index: false,
            follow: false
        }
    };

}

export default async function Page({
    params
}) {

    const data =
        await getCommerceReviewByToken({
            slug:
                params.slug,

            token:
                params.token
        });

    if (!data) {
        notFound();
    }

    return (
        <main
            className="commerce_reviews_public_page"
            style={
                data.store.theme_css_vars || {}
            }
        >
            <CommerceReviewsClient
                store={data.store}
                order={data.order}
                items={data.items}
                token={params.token}
                tagsReviewsConfig={data.tagsReviewsConfig}
            />
        </main>
    );

}