import { tagsSiteConfig } from "@/app/config/configSite";

import {
    SOFTWARE_ID,
    ORGANIZATION_ID
} from "./constants";

export function getSoftwareSchema() {

    return {

        "@context": "https://schema.org",

        "@type": "SoftwareApplication",

        "@id": SOFTWARE_ID,

        name:
            tagsSiteConfig.platform.name,

        applicationCategory:
            tagsSiteConfig.platform.applicationCategory,

        operatingSystem:
            tagsSiteConfig.platform.operatingSystem,

        description:
            tagsSiteConfig.platform.description,

        featureList:
            tagsSiteConfig.platform.features,

        creator: {
            "@id":
                ORGANIZATION_ID
        },

        offers: {

            "@type": "Offer",

            price:
                tagsSiteConfig.platform.offers.price,

            priceCurrency:
                tagsSiteConfig.platform.offers.priceCurrency
        }
    };
}