import { tagsSiteConfig } from "@/app/config/configSite";

import {
    LOCAL_BUSINESS_ID,
    ORGANIZATION_ID
} from "./constants";

export function getLocalBusinessSchema() {

    return {

        "@context": "https://schema.org",

        "@type": "LocalBusiness",

        "@id": LOCAL_BUSINESS_ID,

        name:
            "Tags",

        description:
            tagsSiteConfig.site.description,

        image:
            tagsSiteConfig.organization.logo,

        logo:
            tagsSiteConfig.organization.logo,

        url:
            tagsSiteConfig.site.url,

        email:
            tagsSiteConfig.contact.email,

        telephone:
            tagsSiteConfig.contact.phone,

        priceRange: "$$",

        currenciesAccepted:
            "ARS",

        paymentAccepted: [
            "Cash",
            "Credit Card",
            "Debit Card",
            "Mercado Pago",
            "Bank Transfer"
        ],

        areaServed: {

            "@type": "Country",

            name: "Argentina"
        },

        address: {

            "@type": "PostalAddress",

            streetAddress:
                tagsSiteConfig.contact.streetAddress,

            addressLocality:
                tagsSiteConfig.contact.city,

            addressRegion:
                tagsSiteConfig.contact.region,

            postalCode:
                tagsSiteConfig.contact.postalCode,

            addressCountry:
                tagsSiteConfig.contact.country
        },

        geo: {

            "@type": "GeoCoordinates",

            latitude:
                tagsSiteConfig.contact.latitude,

            longitude:
                tagsSiteConfig.contact.longitude
        },

        hasMap:
            `https://www.google.com/maps?q=${tagsSiteConfig.contact.latitude},${tagsSiteConfig.contact.longitude}`,

        parentOrganization: {

            "@id":
                ORGANIZATION_ID
        },

        sameAs: Object.values(
            tagsSiteConfig.social
        ),

        knowsAbout: [

            "Códigos QR",
            "QR dinámicos",
            "Google Reviews",
            "QR para negocios",
            "QR para restaurantes",
            "QR para hoteles",
            "QR para turismo",
            "NFC",
            "Menú digital",
            "Cartelería QR",
            "Estadísticas QR",
            "Gestión QR",
            "QR WhatsApp",
            "QR Instagram"
        ]
    };
}