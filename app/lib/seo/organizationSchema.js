import { tagsSiteConfig } from "@/app/config/configSite";

import {
    ORGANIZATION_ID
} from "./constants";

export function getOrganizationSchema() {

    return {

        "@context": "https://schema.org",

        "@type": "Organization",

        "@id": ORGANIZATION_ID,

        name:
            tagsSiteConfig.organization.name,

        url:
            tagsSiteConfig.organization.url,

        logo: {
            "@type": "ImageObject",

            url:
                tagsSiteConfig.organization.logo
        },

        image:
            tagsSiteConfig.organization.logo,

        email:
            tagsSiteConfig.contact.email,

        telephone:
            tagsSiteConfig.contact.phone,

        sameAs:
            Object.values(tagsSiteConfig.social),

        description:
            tagsSiteConfig.site.description,

        keywords:
            tagsSiteConfig.seo.keywords.join(", "),

        parentOrganization: {
            "@type": "Organization",

            name:
                tagsSiteConfig.organization.parentOrganization.name,

            url:
                tagsSiteConfig.organization.parentOrganization.url
        }
    };
}