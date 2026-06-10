// app/robots.js

import { tagsSiteConfig } from "./config/configSite";

export default function robots() {

    const BASE_URL =
        tagsSiteConfig.site.url;

    return {

        rules: [

            {
                userAgent: "*",

                allow: [

                    "/",
                    "/contact",
                    "/store-products",
                    "/demo",

                    "/qr-inteligente",
                    "/qr-page",
                    "/tags-id",
                    "/tags-reviews",
                    "/e-events",

                    "/p/",
                ],

                disallow: [

                    "/login",
                    "/logout",
                    "/setup",
                    "/activate",
                    "/supports",
                    "/qr-stopped",
                    "/private",
                    "/dashboard",

                    "/t/",
                    "/e/",

                    "/dashboard/",
                    "/admin/",

                    "/api/",
                    "/_next/",
                ],
            },
        ],

        sitemap:
            `${BASE_URL}/sitemap.xml`,

        host:
            BASE_URL,
    };
}