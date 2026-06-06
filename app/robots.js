// app/robots.js

export default function robots() {

    return {

        rules: [

            {
                userAgent: "*",

                allow: [

                    "/",
                    "/contact",
                    "/store-products",
                    "/demo",
                    "/p/",
                ],

                disallow: [

                    // privadas
                    "/login",
                    "/setup",
                    "/activate",
                    "/supports",
                    "/qr-stopped",
                    "/setup",
                    "/activate",

                    // qr internos
                    "/t/",

                    // admin
                    "/dashboard/",
                    "/admin/",

                    // api
                    "/api/",

                    // next internals
                    "/_next/",
                ],
            },
        ],

        sitemap:
            "https://www.tags.com.ar/sitemap.xml",

        host:
            "https://www.tags.com.ar",
    };
}