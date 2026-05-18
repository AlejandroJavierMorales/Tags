import { tagsSiteConfig } from "@/app/config/configSite";

export function buildMetadata({

    title,

    description,

    path = "",

    image =
        "/assets/images/tags/qr-estadisticas.webp"
}) {

    const url =
        `${tagsSiteConfig.site.url}${path}`;

    return {

        metadataBase:
            new URL(tagsSiteConfig.site.url),

        title,

        description,

        keywords:
            tagsSiteConfig.seo.keywords,

        alternates: {
            canonical: path || "/"
        },

        openGraph: {

            title,

            description,

            url,

            siteName:
                tagsSiteConfig.site.shortName,

            locale:
                tagsSiteConfig.site.locale,

            type:
                "website",

            images: [
                {
                    url: image,

                    width: 1200,

                    height: 630
                }
            ]
        },

        twitter: {

            card:
                "summary_large_image",

            title,

            description,

            images: [image]
        }
    };
}