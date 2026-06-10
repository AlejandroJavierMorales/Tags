import "@/app/styles/tags_landing.css";
import React from "react";

import TagsFooter from "../components/landing/Footer";
import Header from "../components/landing/Header";
import Products from "../components/catalogue/Products";
import WhatsAppFloat from "../components/WhatsAppFloat";
import FAQs from "../components/landing/FAQs";

import { catalogue } from "../config/catalogue";
import { tagsSiteConfig } from "../config/configSite";

import {
    getOrganizationSchema,
    getWebsiteSchema,
    getLocalBusinessSchema,
    getFAQSchema,
    getBreadcrumbSchema
} from "@/app/lib/seo";

export const metadata = {

    metadataBase:
        new URL(tagsSiteConfig.site.url),

    title:
        "Productos QR | Carteles QR físicos, NFC y digitales | Tags",

    description:
        "Catálogo de carteles QR personalizados, stickers QR, tarjetas PVC, productos NFC y soluciones digitales para negocios, restaurantes, hoteles y comercios.",

    keywords: [
        ...tagsSiteConfig.seo.keywords,
        "Carteles QR",
        "Stickers QR",
        "QR NFC",
        "Tarjetas QR",
        "QR Google Reviews"
    ],

    alternates: {
        canonical:  "https://www.tags.com.ar/store-products"
    },

    openGraph: {

        title:
            "Productos QR | Tags",

        description:
            "Carteles QR personalizados, stickers, NFC y soluciones digitales para negocios.",

        url:
            `${tagsSiteConfig.site.url}/store-products`,

        siteName:
            "Tags",

        locale:
            "es_AR",

        type:
            "website",

        images: [
            {
                url:
                    "/assets/images/og/tags-tienda-online-og.webp",

                width: 1200,

                height: 630,

                alt:
                    "Productos QR Tags"
            }
        ]
    },

    twitter: {

        card:
            "summary_large_image",

        title:
            "Productos QR | Tags",

        description:
            "Carteles QR personalizados y soluciones NFC.",

        images: [
            "/assets/images/og/tags-tienda-online-og.webp",
        ]
    }
};

export default function TagsProducts() {

    const BASE_URL =
        `${tagsSiteConfig.site.url}/store-products`;

    // =====================================================
    // COLLECTION PAGE
    // =====================================================

    const collectionPageSchema = {

        "@context": "https://schema.org",

        "@type": "CollectionPage",

        "@id":
            `${BASE_URL}/#collectionpage`,

        url:
            BASE_URL,

        name:
            "Catálogo de productos QR",

        description:
            "Catálogo de carteles QR físicos, stickers, productos NFC y soluciones digitales personalizadas para negocios, hoteles, restaurantes y comercios.",

        isPartOf: {
            "@id":
                `${tagsSiteConfig.site.url}/#website`
        },

        about: {
            "@id":
                `${tagsSiteConfig.site.url}/#organization`
        },

        mainEntity: {
            "@id":
                `${BASE_URL}/#catalog`
        },

        primaryImageOfPage: {

            "@type":
                "ImageObject",

            url:
                `${tagsSiteConfig.site.url}/assets/images/tags/productos/qr-acrilico-12x12-google-transparente-base.webp`
        },

        inLanguage:
            "es-AR",

        speakable: {

            "@type":
                "SpeakableSpecification",

            cssSelector: [
                ".tags_store_title",
                ".tags_store_subtitle"
            ]
        }
    };

    // =====================================================
    // OFFER CATALOG
    // =====================================================

    const offerCatalogSchema = {

        "@context":
            "https://schema.org",

        "@type":
            "OfferCatalog",

        "@id":
            `${BASE_URL}/#catalog`,

        name:
            "Catálogo Tags QR",

        itemListElement:
            catalogue.flatMap(category =>
                category.items.map(item => ({

                    "@type":
                        "Offer",

                    itemOffered: {
                        "@id":
                            `${BASE_URL}/#${item.id}`
                    }
                }))
            )
    };

    // =====================================================
    // ITEM LIST
    // =====================================================

    let positionCounter = 1;

    const itemListSchema = {

        "@context":
            "https://schema.org",

        "@type":
            "ItemList",

        "@id":
            `${BASE_URL}/#itemlist`,

        name:
            "Lista de productos QR",

        url:
            BASE_URL,

        numberOfItems:
            catalogue.reduce(
                (acc, category) =>
                    acc + category.items.length,
                0
            ),

        itemListElement:
            catalogue.flatMap(category =>
                category.items.map(item => ({

                    "@type":
                        "ListItem",

                    position:
                        positionCounter++,

                    url:
                        BASE_URL,

                    item: {
                        "@id":
                            `${BASE_URL}/#${item.id}`
                    }
                }))
            )
    };

    // =====================================================
    // PRODUCTS
    // =====================================================

    const productSchemas =
        catalogue.flatMap(category =>
            category.items.map(item => ({

                "@context":
                    "https://schema.org",

                "@type":
                    "Product",

                "@id":
                    `${BASE_URL}/#${item.id}`,

                name:
                    item.name,

                description:
                    item.description,

                sku:
                    item.id,

                category:
                    category.category,

                url:
                    BASE_URL,

                image:
                    item.images.map(img => ({
                        "@type":
                            "ImageObject",

                        url:
                            `${tagsSiteConfig.site.url}${img}`
                    })),

                brand: {

                    "@type":
                        "Brand",

                    name:
                        "Tags"
                },

                manufacturer: {
                    "@id":
                        `${tagsSiteConfig.site.url}/#organization`
                },

                keywords: [

                    "QR",

                    "Código QR",

                    "Cartel QR",

                    "QR dinámico",

                    "Google Reviews",

                    "WhatsApp",

                    "Instagram",

                    "NFC",

                    category.category

                ].join(", "),

                audience: {

                    "@type":
                        "BusinessAudience",

                    audienceType:
                        "Negocios, restaurantes, hoteles y comercios"
                },

                material:
                    category.category === "Acrílico"
                        ? "Acrílico"
                        : category.category === "Autoadhesivos"
                            ? "Vinilo autoadhesivo"
                            : "Digital",

                additionalProperty: [

                    {
                        "@type":
                            "PropertyValue",

                        name:
                            "Compatible con",

                        value:
                            item.types
                                ?.map(type => type.label)
                                .join(", ")
                    },

                    ...(item.variants?.material
                        ? [{
                            "@type":
                                "PropertyValue",

                            name:
                                "Materiales disponibles",

                            value:
                                item.variants.material
                                    .map(material => material.label)
                                    .join(", ")
                        }]
                        : []),

                    ...(item.variants?.support
                        ? [{
                            "@type":
                                "PropertyValue",

                            name:
                                "Soportes disponibles",

                            value:
                                item.variants.support
                                    .map(support => support.label)
                                    .join(", ")
                        }]
                        : [])
                ],

                offers: {

                    "@type":
                        "Offer",

                    url:
                        BASE_URL,

                    price:
                        item.basePrice,

                    priceCurrency:
                        "ARS",

                    availability:
                        "https://schema.org/InStock",

                    itemCondition:
                        "https://schema.org/NewCondition",

                    seller: {
                        "@id":
                            `${tagsSiteConfig.site.url}/#organization`
                    },

                    shippingDetails: {

                        "@type":
                            "OfferShippingDetails",

                        shippingDestination: {

                            "@type":
                                "DefinedRegion",

                            addressCountry:
                                "AR"
                        }
                    },

                    hasMerchantReturnPolicy: {

                        "@type":
                            "MerchantReturnPolicy",

                        applicableCountry:
                            "AR",

                        returnPolicyCategory:
                            "https://schema.org/MerchantReturnFiniteReturnWindow",

                        merchantReturnDays:
                            30
                    }
                },

                isPartOf: {
                    "@id":
                        `${BASE_URL}/#catalog`
                },

                mainEntityOfPage: {
                    "@id":
                        `${BASE_URL}/#collectionpage`
                }
            }))
        );

    // =====================================================
    // BREADCRUMBS
    // =====================================================

    const breadcrumbs = [

        ...tagsSiteConfig.breadcrumbsBase,

        {
            name:
                "Productos QR",

            url:
                BASE_URL
        }
    ];

    // =====================================================
    // SCHEMAS
    // =====================================================

    const schemas = [

        // ORGANIZATION
        getOrganizationSchema(),

        // WEBSITE
        getWebsiteSchema(),

        // LOCAL BUSINESS
        getLocalBusinessSchema(),

        // COLLECTION PAGE
        collectionPageSchema,

        // OFFER CATALOG
        offerCatalogSchema,

        // ITEM LIST
        itemListSchema,

        // PRODUCTS
        ...productSchemas,

        // FAQ
        getFAQSchema(
            tagsSiteConfig.faqs.products,
            `${BASE_URL}/#faq`
        ),

        // BREADCRUMB
        getBreadcrumbSchema(
            breadcrumbs,
            `${BASE_URL}/#breadcrumb`
        )
    ];

    return (
        <>
            {/* ===================================================== */}
            {/* JSON-LD */}
            {/* ===================================================== */}

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html:
                        JSON.stringify(schemas)
                }}
            />

            <main>

                <Header />

                {/* PRODUCTS */}
                <section className="tags_store_products_section mt-5">

                    <div className="container">

                        <Products />

                    </div>

                </section>

                {/* SEO SECTION */}
                <section className="tags_store_info">

                    <div className="container">

                        <div className="tags_store_info_card">

                            <h2>
                                Carteles QR personalizados para negocios
                            </h2>

                            <p>
                                Diseñamos productos QR físicos y digitales
                                para restaurantes, hoteles, comercios,
                                eventos, turismo y marcas.
                            </p>

                            <p>
                                Todos los productos son personalizables
                                y compatibles con Google Reviews,
                                WhatsApp, Instagram, Facebook,
                                Menús Digitales y soluciones NFC.
                            </p>

                        </div>

                    </div>

                </section>

                {/* FAQ */}
                <FAQs
                    title="Preguntas frecuentes"
                    subtitle="Información sobre materiales, envíos y personalización."
                    faqs={tagsSiteConfig.faqs.products}
                />

                <TagsFooter />

                <WhatsAppFloat />

            </main>
        </>
    );
}