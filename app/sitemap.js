// app/sitemap.js

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { db } from "@/app/lib/tags-db";
import { tagsSiteConfig } from "./config/configSite";

const routes = [
    {
        path: "",
        priority: 1,
        changeFrequency: "weekly",
    },
    {
        path: "/qr-inteligente",
        priority: 0.95,
        changeFrequency: "weekly",
    },
    {
        path: "/qr-page",
        priority: 0.95,
        changeFrequency: "weekly",
    },
    {
        path: "/tags-id",
        priority: 0.95,
        changeFrequency: "weekly",
    },
    {
        path: "/tags-reviews",
        priority: 0.95,
        changeFrequency: "weekly",
    },
    {
        path: "/e-events",
        priority: 0.95,
        changeFrequency: "weekly",
    },
    {
        path: "/store-products",
        priority: 0.9,
        changeFrequency: "weekly",
    },
    {
        path: "/demo",
        priority: 0.85,
        changeFrequency: "weekly",
    },
    {
        path: "/contact",
        priority: 0.8,
        changeFrequency: "monthly",
    },
];

export default async function sitemap() {

    const BASE_URL =
        tagsSiteConfig.site.url;

    const currentDate =
        new Date();

    const staticRoutes =
        routes.map(route => ({
            url:
                `${BASE_URL}${route.path}`,
            lastModified:
                currentDate,
            changeFrequency:
                route.changeFrequency,
            priority:
                route.priority,
        }));

    const [qrPages] =
        await db.query(`
            SELECT
                slug,
                updated_at
            FROM
                tags_qr_pages
            WHERE
                status = 'published'
                AND robots_index = 1
                AND slug IS NOT NULL
                AND slug != ''
            ORDER BY
                updated_at DESC
        `);

    const publicPageRoutes =
        qrPages.map(page => ({
            url:
                `${BASE_URL}/p/${page.slug}`,
            lastModified:
                page.updated_at
                    ? new Date(page.updated_at)
                    : currentDate,
            changeFrequency:
                "weekly",
            priority:
                0.75,
        }));

    return [
        ...staticRoutes,
        ...publicPageRoutes,
    ];
}