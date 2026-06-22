import { notFound }
    from "next/navigation";

import { db }
    from "@/app/lib/tags-db";

import { safeParseJSON }
    from "@/app/modules/qr-page/lib/safeParseJSON";

import QRPageRenderer
    from "@/app/modules/qr-page/renderers/QRPageRenderer";
import ClientReviewsPublicRenderer from "@/app/modules/client-reviews/renderers/ClientReviewsPublicRenderer";
import StorePublicRenderer from "@/app/modules/store/public/StorePublicRenderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBaseUrl() {

    return process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL_PROD;
}

function absoluteUrl(url) {

    if (!url) {
        return null;
    }

    if (
        url.startsWith("http://") ||
        url.startsWith("https://")
    ) {
        return url;
    }

    return `${getBaseUrl()}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function getPublicQRPage(slug) {

    const [pages] =
        await db.query(
            `
           SELECT
            p.*,
            b.name AS business_name,
            b.email AS business_email,
            b.phone AS business_phone,
            t.code AS theme_code,
            t.name AS theme_name,
            t.css_tokens AS theme_css_tokens
        FROM
            tags_qr_pages p
        INNER JOIN
            tags_businesses b
                ON b.id = p.business_id
        LEFT JOIN
            tags_qr_page_themes t
                ON t.id = p.theme_id
        WHERE
            p.slug = ?
            AND p.status = 'published'
        LIMIT 1
            `,
            [
                slug
            ]
        );

    const page =
        pages[0];

    if (!page) {
        return null;
    }

    const [sections] =
        await db.query(
            `
            SELECT
                *
            FROM
                tags_qr_page_sections
            WHERE
                page_id = ?
                AND is_visible = 1
            ORDER BY
                sort_order ASC,
                id ASC
            `,
            [
                page.id
            ]
        );

    const [blocks] =
        await db.query(
            `
            SELECT
                b.*
            FROM
                tags_qr_page_blocks b
            INNER JOIN
                tags_qr_page_sections s
                    ON s.id = b.section_id
            WHERE
                s.page_id = ?
                AND s.is_visible = 1
                AND b.is_visible = 1
            ORDER BY
                b.sort_order ASC,
                b.id ASC
            `,
            [
                page.id
            ]
        );

    const [products] =
        await db.query(
            `
            SELECT
                *
            FROM
                tags_qr_page_products
            WHERE
                page_id = ?
                AND is_visible = 1
            ORDER BY
                sort_order ASC,
                id ASC
            `,
            [
                page.id
            ]
        );

    const sectionsWithBlocks =
        sections.map((section) => ({
            ...section,
            settings_json:
                safeParseJSON(
                    section.settings_json
                ),
            styles_json:
                safeParseJSON(
                    section.styles_json
                ),
            blocks:
                blocks
                    .filter((block) =>
                        block.section_id === section.id
                    )
                    .map((block) => ({
                        ...block,
                        content_json:
                            safeParseJSON(
                                block.content_json
                            ),
                        styles_json:
                            safeParseJSON(
                                block.styles_json
                            )
                    }))
        }));

    return {
        page: {
            ...page,

            theme: page.theme_id
                ? {
                    id: page.theme_id,
                    code: page.theme_code,
                    name: page.theme_name,
                    css_tokens: safeParseJSON(
                        page.theme_css_tokens
                    )
                }
                : null,

            typography_tokens:
                safeParseJSON(
                    page.typography_tokens
                ),

            global_styles:
                safeParseJSON(
                    page.global_styles
                ),

            header_config:
                safeParseJSON(
                    page.header_config
                ),

            footer_config:
                safeParseJSON(
                    page.footer_config
                ),

            theme_config:
                safeParseJSON(
                    page.theme_config
                ),

            admin_structured_data_json:
                safeParseJSON(
                    page.admin_structured_data_json
                )
        },
        sections:
            sectionsWithBlocks,
        products
    };
}

function getSEOData(page) {

    const baseUrl =
        getBaseUrl();

    const title =
        page.admin_seo_title ||
        page.seo_title ||
        page.title ||
        page.business_name ||
        "QR-Page";

    const description =
        page.admin_seo_description ||
        page.seo_description ||
        page.description ||
        `Conocé más sobre ${page.business_name || "esta QR-Page"}`;

    const keywords =
        page.admin_seo_keywords ||
        page.seo_keywords ||
        undefined;

    const canonical =
        absoluteUrl(
            page.admin_canonical_url ||
            page.canonical_url ||
            `${baseUrl}/p/${page.slug}`
        );

    const image =
        absoluteUrl(
            page.seo_image_url ||
            page.cover_image_url ||
            page.logo_url
        );

    return {
        title,
        description,
        keywords,
        canonical,
        image
    };
}

export async function generateMetadata({
    params
}) {

    const data =
        await getPublicQRPage(
            params.slug
        );

    if (!data) {
        return {
            title: "QR-Page no encontrada | Tags",
            robots: {
                index: false,
                follow: false
            }
        };
    }

    const { page } =
        data;

    const seo =
        getSEOData(
            page
        );

    return {
        title:
            seo.title,
        description:
            seo.description,
        keywords:
            seo.keywords,
        alternates: {
            canonical:
                seo.canonical
        },
        robots: {
            index:
                page.robots_index === 1,
            follow:
                page.robots_follow === 1,
            googleBot: {
                index:
                    page.robots_index === 1,
                follow:
                    page.robots_follow === 1,
                "max-image-preview": "large",
                "max-snippet": -1,
                "max-video-preview": -1
            }
        },
        openGraph: {
            type:
                "website",
            title:
                seo.title,
            description:
                seo.description,
            url:
                seo.canonical,
            siteName:
                "Tags",
            images: [
                {
                    url:
                        `${getBaseUrl()}/p/${page.slug}/opengraph-image?v=${Date.now()}`,
                    width:
                        1200,
                    height:
                        630,
                    alt:
                        seo.title
                }
            ]
        },
        twitter: {
            card:
                "summary_large_image",
            title:
                seo.title,
            description:
                seo.description,
            images: [
                `${getBaseUrl()}/p/${page.slug}/opengraph-image?v=${Date.now()}`,
            ]
        }
    };
}

function cleanObject(obj) {

    return Object.fromEntries(
        Object.entries(obj)
            .filter(([, value]) =>
                value !== undefined &&
                value !== null &&
                value !== ""
            )
    );
}

function buildStructuredData({
    page,
    products
}) {

    if (page.admin_structured_data_json) {

        const adminData =
            page.admin_structured_data_json;

        if (
            Array.isArray(adminData)
            ||
            Object.keys(adminData).length
        ) {
            return adminData;
        }
    }

    const baseUrl =
        getBaseUrl();

    const pageUrl =
        `${baseUrl}/p/${page.slug}`;

    const seo =
        getSEOData(
            page
        );

    const schemaType =
        page.schema_type || "auto";

    let mainEntityType =
        "Organization";

    switch (schemaType) {

        case "person":
            mainEntityType = "Person";
            break;

        case "local_business":
            mainEntityType = "LocalBusiness";
            break;

        case "professional_service":
            mainEntityType = "ProfessionalService";
            break;

        case "store":
            mainEntityType = "Store";
            break;

        case "restaurant":
            mainEntityType = "Restaurant";
            break;

        case "hotel":
            mainEntityType = "Hotel";
            break;

        case "gym":
            mainEntityType = "SportsActivityLocation";
            break;

        case "real_estate_agent":
            mainEntityType = "RealEstateAgent";
            break;

        case "auto_dealer":
            mainEntityType = "AutoDealer";
            break;

        default:

            if (page.page_type === "tags_id") {
                mainEntityType = "Person";
            } else if (page.page_type === "client_reviews") {
                mainEntityType = "LocalBusiness";
            }
    }

    const mainEntity =
        cleanObject({
            "@context": "https://schema.org",
            "@type": mainEntityType,
            "@id": `${pageUrl}#main`,
            name:
                page.business_name ||
                page.title,
            url:
                pageUrl,
            description:
                seo.description,
            email:
                page.email ||
                page.business_email,
            telephone:
                page.phone ||
                page.whatsapp ||
                page.business_phone,
            address:
                page.address,
            logo:
                absoluteUrl(
                    page.logo_url
                ),
            image:
                absoluteUrl(
                    page.cover_image_url ||
                    page.logo_url
                ),
            sameAs:
                [
                    page.instagram_url,
                    page.facebook_url,
                    page.tiktok_url,
                    page.youtube_url,
                    page.linkedin_url,
                    page.website_url
                ].filter(Boolean)
        });

    const webPage =
        cleanObject({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": `${pageUrl}#webpage`,
            name:
                seo.title,
            description:
                seo.description,
            url:
                pageUrl,
            about: {
                "@id": `${pageUrl}#main`
            },
            primaryImageOfPage:
                seo.image
                    ? {
                        "@type": "ImageObject",
                        url: seo.image
                    }
                    : undefined
        });

    const faqBlocks =
        [];

    (products || []).forEach((product) => {

        if (
            product.question &&
            product.answer
        ) {

            faqBlocks.push({
                "@type": "Question",
                name:
                    product.question,
                acceptedAnswer: {
                    "@type": "Answer",
                    text:
                        product.answer
                }
            });
        }
    });

    const faqSchema =
        faqBlocks.length
            ? {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity:
                    faqBlocks
            }
            : null;

    const productSchemas =
        (products || [])
            .filter((product) =>
                product.title
            )
            .map((product) =>
                cleanObject({
                    "@context": "https://schema.org",
                    "@type":
                        page.schema_type === "service_catalog"
                            ? "Service"
                            : "Product",
                    name:
                        product.title,
                    description:
                        product.description,
                    image:
                        absoluteUrl(
                            product.image_url
                        ),
                    offers:
                        product.price
                            ? {
                                "@type": "Offer",
                                price:
                                    String(product.price),
                                priceCurrency:
                                    product.currency || "ARS",
                                availability:
                                    "https://schema.org/InStock",
                                url:
                                    pageUrl
                            }
                            : undefined
                })
            );

    return [
        mainEntity,
        webPage,
        ...productSchemas,
        ...(faqSchema ? [faqSchema] : [])
    ];
}

export default async function PublicQRPage({
    params
}) {

    let data =
        await getPublicQRPage(
            params.slug
        );

    if (!data) {

        const storeData =
            await getPublicStore(
                params.slug
            );

        if (!storeData) {
            notFound();
        }

        return (
            <StorePublicRenderer
                store={storeData.store}
                categories={storeData.categories}
                products={storeData.products}
            />
        );
    }

    const {
        page,
        sections,
        products
    } = data;


    if (page.page_type === "store") {
        const storeData =
            await getPublicStore(page.slug);

        if (!storeData) {
            notFound();
        }

        return (
            <StorePublicRenderer
                store={storeData.store}
                categories={storeData.categories}
                products={storeData.products}
            />
        );
    }

    if (page.page_type === "client_reviews") {
        return (
            <ClientReviewsPublicRenderer
                slug={page.slug}
            />
        );
    }

    const structuredData =
        buildStructuredData({
            page,
            products
        });

    /* Store Public */
    async function getPublicStore(slug) {

        const [stores] =
            await db.query(
                `
            SELECT
                s.*,
                p.id AS page_id,
                p.slug AS page_slug,
                p.status AS page_status,
                p.page_type
            FROM tags_stores s

            INNER JOIN tags_qr_pages p
                ON p.id = s.page_id

            WHERE p.slug = ?
            AND p.status = 'published'
            AND p.page_type = 'store'

            LIMIT 1
            `,
                [
                    slug
                ]
            );

        const store =
            stores[0];

        if (!store) {
            return null;
        }

        store.settings_json =
            safeParseJSON(
                store.settings_json
            );

        store.styles_json =
            safeParseJSON(
                store.styles_json
            );

        const [categories] =
            await db.query(
                `
            SELECT *
            FROM tags_store_categories
            WHERE store_id = ?
            AND is_visible = 1
            ORDER BY sort_order ASC, name ASC
            `,
                [
                    store.id
                ]
            );

        const [products] =
            await db.query(
                `
            SELECT
                p.*,
                c.name AS category_name,
                img.image_url AS primary_image_url,
                COUNT(DISTINCT v.id) AS variants_count
            FROM tags_store_products p

            LEFT JOIN tags_store_categories c
                ON c.id = p.category_id

            LEFT JOIN tags_store_product_images img
                ON img.product_id = p.id
                AND img.is_primary = 1

            LEFT JOIN tags_store_variants v
                ON v.product_id = p.id
                AND v.is_visible = 1

            WHERE p.store_id = ?
            AND p.status = 'published'
            AND p.is_visible = 1

            GROUP BY
                p.id,
                c.name,
                img.image_url

            ORDER BY
                p.is_featured DESC,
                p.created_at DESC
            `,
                [
                    store.id
                ]
            );

        return {
            store,
            categories,
            products
        };
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html:
                        JSON.stringify(
                            structuredData
                        )
                }}
            />

            <QRPageRenderer
                page={page}
                sections={sections}
                products={products}
            />
        </>
    );
}