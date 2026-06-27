// =====================================
// Archivo:
// /app/p/[slug]/products/[productId]/page.jsx
//
// Descripción:
// Página pública de detalle de producto
// para Tags Store.
//
// Contexto:
// store
// =====================================

import { notFound }
    from "next/navigation";

import StoreProductDetailClient
    from "@/app/modules/store/components/public/StoreProductDetailClient";

import {
    getStorePublicProductDetail
}
    from "@/app/modules/store/lib/getStorePublicProductDetail";



import "@/app/modules/store/styles/store-public.css";

export const dynamic =
    "force-dynamic";


export async function generateMetadata({
    params
}) {

    const data =
        await getStorePublicProductDetail({
            slug: params.slug,
            productId: params.productId
        });

    if (!data) {
        return {
            title:
                "Producto no encontrado"
        };
    }



    const {
        store,
        product,
        images
    } = data;

    const image =
        images?.[0]?.image_url ||
        product?.image_url ||
        store?.logo_url;

    const title =
        `${product.title} | ${store.name}`;

    const description =
        product.description ||
        store.description ||
        title;

    const canonical =
        `${process.env.NEXT_PUBLIC_BASE_URL}/p/${params.slug}/products/${params.productId}`;

    return {
        title,
        description,

        alternates: {
            canonical
        },

        openGraph: {
            type: "website",
            title,
            description,
            url: canonical,
            images:
                image
                    ? [{
                        url: image,
                        width: 1200,
                        height: 630,
                        alt: title
                    }]
                    : []
        },

        twitter: {
            card:
                "summary_large_image",
            title,
            description,
            images:
                image
                    ? [image]
                    : []
        }
    };
}





export default async function Page({
    params
}) {
    const data =
        await getStorePublicProductDetail({
            slug: params.slug,
            productId: params.productId
        });

    if (!data) {
        notFound();
    }

    const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL_PROD
        || process.env.NEXT_PUBLIC_BASE_URL
        || "http://localhost:3000";

    const storeUrl =
        `${baseUrl}/p/${params.slug}`;

    const productUrl =
        `${storeUrl}/products/${params.productId}`;

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify([
                        {
                            "@context":
                                "https://schema.org",

                            "@type":
                                "Product",

                            name:
                                data.product.title,

                            description:
                                data.product.description,

                            image:
                                data.images?.map(
                                    img =>
                                        img.image_url
                                ) || [],

                            sku:
                                data.product.sku,

                            brand: {
                                "@type":
                                    "Brand",
                                name:
                                    data.store.name
                            },

                            ...((
                                Number(data.product.price) > 0 ||
                                Number(data.product.sale_price) > 0
                            )
                                ? {
                                    offers: {
                                        "@type":
                                            "Offer",

                                        price:
                                            String(
                                                data.product.sale_price ||
                                                data.product.price
                                            ),

                                        priceCurrency:
                                            data.product.currency ||
                                            "ARS",

                                        availability:
                                            "https://schema.org/InStock",

                                        url: productUrl
                                    }
                                }
                                : {})
                        },

                        {
                            "@context":
                                "https://schema.org",

                            "@type":
                                "BreadcrumbList",

                            itemListElement: [
                                {
                                    "@type":
                                        "ListItem",

                                    position:
                                        1,

                                    name:
                                        "Inicio",

                                    item:
                                        process.env.NEXT_PUBLIC_BASE_URL
                                },

                                {
                                    "@type":
                                        "ListItem",

                                    position:
                                        2,

                                    name:
                                        data.store.name,

                                    item:
                                        `${process.env.NEXT_PUBLIC_BASE_URL_PROD}/p/${params.slug}`
                                },

                                {
                                    "@type":
                                        "ListItem",

                                    position:
                                        3,

                                    name:
                                        data.product.title,

                                    item: productUrl
                                }
                            ]
                        }
                    ])
                }}
            />

            <StoreProductDetailClient
                store={data.store}
                product={data.product}
                images={data.images}
                variants={data.variants}
                variantOptions={data.variantOptions}
            />
        </>
    );
}