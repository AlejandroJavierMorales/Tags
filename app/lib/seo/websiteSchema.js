import { tagsSiteConfig } from "@/app/config/configSite";

import {
    WEBSITE_ID,
    ORGANIZATION_ID
} from "./constants";

export function getWebsiteSchema() {

    return {

        "@context": "https://schema.org",

        "@type": "WebSite",

        "@id": WEBSITE_ID,

        url:
            tagsSiteConfig.site.url,

        name:
            tagsSiteConfig.site.name,

        description:
            tagsSiteConfig.site.description,

        inLanguage:
            tagsSiteConfig.site.language,

        publisher: {
            "@id":
                ORGANIZATION_ID
        },

        potentialAction: {
            "@type": "SearchAction",

            target:
                `${tagsSiteConfig.site.url}/store-products?q={search_term_string}`,

            "query-input":
                "required name=search_term_string"
        }
    };
}