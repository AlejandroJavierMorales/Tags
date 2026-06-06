import { ImageResponse } from "next/og";

import { db } from "@/app/lib/tags-db";

import { safeParseJSON } from "@/app/modules/qr-page/lib/safeParseJSON";

export const runtime = "nodejs";

function getBaseUrl() {

    return process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL;
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

function isOgSafeImage(url) {

    if (!url) {
        return false;
    }

    const cleanUrl =
        url.split("?")[0].toLowerCase();

    return (
        cleanUrl.endsWith(".jpg") ||
        cleanUrl.endsWith(".jpeg") ||
        cleanUrl.endsWith(".png")
    );
}

async function getPage(slug) {

    const [rows] =
        await db.query(
            `
            SELECT
                p.*,
                b.name AS business_name,
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

    return rows[0] || null;
}

export async function GET(req, { params }) {

    const page =
        await getPage(
            params.slug
        );

    const tokens =
        safeParseJSON(
            page?.theme_css_tokens
        ) || {};

    const bg =
        tokens["--qr-bg"] || "#f8fafc";

    const surface =
        tokens["--qr-surface"] || "#ffffff";

    const primary =
        tokens["--qr-primary"] || "#111827";

    const text =
        tokens["--qr-text"] || "#111827";

    const muted =
        tokens["--qr-muted"] || "#64748b";

    const border =
        tokens["--qr-border"] || "#e5e7eb";

    const title =
        page?.admin_seo_title ||
        page?.seo_title ||
        page?.title ||
        page?.business_name ||
        "Tags QR-Page";

    const description =
        page?.admin_seo_description ||
        page?.seo_description ||
        page?.description ||
        "Página digital creada con Tags";

    const rawCover =
        absoluteUrl(
            page?.seo_image_og_url ||
            page?.seo_image_url ||
            page?.cover_image_url
        );

    const cover =
        isOgSafeImage(rawCover)
            ? rawCover
            : null;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    background: bg,
                    padding: 64,
                    fontFamily: "Arial",
                    position: "relative",
                    overflow: "hidden"
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        right: -140,
                        top: -140,
                        width: 420,
                        height: 420,
                        borderRadius: 999,
                        background: primary,
                        opacity: 0.16
                    }}
                />

                <div
                    style={{
                        position: "absolute",
                        left: -120,
                        bottom: -120,
                        width: 360,
                        height: 360,
                        borderRadius: 999,
                        background: primary,
                        opacity: 0.10
                    }}
                />

                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        borderRadius: 36,
                        background: surface,
                        border: `2px solid ${border}`,
                        overflow: "hidden"
                    }}
                >
                    <div
                        style={{
                            width: cover ? "58%" : "100%",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            padding: 64
                        }}
                    >
                        <div
                            style={{
                                width: 92,
                                height: 92,
                                borderRadius: 24,
                                background: primary,
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 42,
                                fontWeight: 800,
                                marginBottom: 32
                            }}
                        >
                            {String(title).trim().slice(0, 1).toUpperCase()}
                        </div>

                        <div
                            style={{
                                fontSize: 62,
                                lineHeight: 1.05,
                                fontWeight: 800,
                                color: text,
                                marginBottom: 24
                            }}
                        >
                            {title}
                        </div>

                        <div
                            style={{
                                fontSize: 30,
                                lineHeight: 1.35,
                                color: muted
                            }}
                        >
                            {description}
                        </div>

                        <div
                            style={{
                                marginTop: 44,
                                color: primary,
                                fontSize: 28,
                                fontWeight: 700
                            }}
                        >
                            Tags QR-Page
                        </div>
                    </div>

                    {
                        cover && (
                            <div
                                style={{
                                    width: "42%",
                                    height: "100%",
                                    display: "flex"
                                }}
                            >
                                <img
                                    src={cover}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover"
                                    }}
                                />
                            </div>
                        )
                    }
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630
        }
    );
}