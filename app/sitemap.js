// app/sitemap.js

export const dynamic = "force-static";

import { tagsSiteConfig } from "./config/configSite";

const routes = [

    {
        path: "",
        priority: 1,
        changeFrequency: "weekly",
    },

    {
        path: "/store-products",
        priority: 0.9,
        changeFrequency: "weekly",
    },

    {
        path: "/demo",
        priority: 0.9,
        changeFrequency: "weekly",
    },

    {
        path: "/contact",
        priority: 0.8,
        changeFrequency: "monthly",
    },
];

export default function sitemap() {

    const BASE_URL =
        tagsSiteConfig.site.url;

    const currentDate =
        new Date();

    return routes.map(route => ({

        url:
            `${BASE_URL}${route.path}`,

        lastModified:
            currentDate,

        changeFrequency:
            route.changeFrequency,

        priority:
            route.priority,
    }));
}