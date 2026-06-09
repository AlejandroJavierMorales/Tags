// =====================================
// API: /api/client-reviews/admin/social-card/create
// Descripción: Genera una imagen PNG para pieza social de una reseña.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import sharp from "sharp";
import { db } from "@/app/lib/tags-db";

function escapeXml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function getFormatSize(format) {
    if (format === "story") {
        return {
            width: 1080,
            height: 1920
        };
    }

    if (format === "portrait") {
        return {
            width: 1080,
            height: 1350
        };
    }

    return {
        width: 1080,
        height: 1080
    };
}

function stars(rating) {
    const count =
        Math.max(
            1,
            Math.min(
                5,
                Math.round(Number(rating || 0))
            )
        );

    return "★".repeat(count) + "☆".repeat(5 - count);
}

async function fetchImageBuffer(url) {
    if (!url) return null;

    const res =
        await fetch(url);

    if (!res.ok) return null;

    return Buffer.from(
        await res.arrayBuffer()
    );
}

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const responseId =
            searchParams.get("responseId");

        const businessId =
            searchParams.get("businessId");

        const format =
            searchParams.get("format") || "post";

        const mediaId =
            searchParams.get("mediaId") || "";

        if (!responseId || !businessId) {
            return Response.json(
                { error: "responseId y businessId requeridos" },
                { status: 400 }
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT
                    r.id,
                    r.customer_name,
                    r.general_comment,
                    r.average_rating,
                    r.created_at,

                    f.logo_url,
                    f.styles_json,
                    f.title AS form_title,

                    b.name AS business_name
                FROM tags_client_review_responses r

                LEFT JOIN tags_client_review_forms f
                    ON f.id = r.form_id

                LEFT JOIN tags_businesses b
                    ON b.id = r.business_id

                WHERE r.id = ?
                AND r.business_id = ?
                LIMIT 1
                `,
                [
                    responseId,
                    businessId
                ]
            );

        const review =
            rows[0];

        if (!review) {
            return Response.json(
                { error: "Reseña no encontrada" },
                { status: 404 }
            );
        }

        let media = null;

        if (mediaId) {
            const [mediaRows] =
                await db.query(
                    `
                    SELECT id, url
                    FROM tags_client_review_media
                    WHERE id = ?
                    AND business_id = ?
                    AND is_active = 1
                    LIMIT 1
                    `,
                    [
                        mediaId,
                        businessId
                    ]
                );

            media =
                mediaRows[0] || null;
        }

        const {
            width,
            height
        } = getFormatSize(format);

        const background =
            media?.url
                ? await fetchImageBuffer(media.url)
                : null;

        const bgLayer =
            background
                ? await sharp(background)
                    .resize(width, height, {
                        fit: "cover"
                    })
                    .blur(2)
                    .modulate({
                        brightness: 0.72
                    })
                    .png()
                    .toBuffer()
                : await sharp({
                    create: {
                        width,
                        height,
                        channels: 4,
                        background: "#0f172a"
                    }
                })
                    .png()
                    .toBuffer();

        const logoBuffer =
            review.logo_url
                ? await fetchImageBuffer(review.logo_url)
                : null;

        const logoComposite =
            logoBuffer
                ? [
                    {
                        input:
                            await sharp(logoBuffer)
                                .resize({
                                    width: 260,
                                    height: 140,
                                    fit: "inside",
                                    withoutEnlargement: true
                                })
                                .png()
                                .toBuffer(),
                        top: 90,
                        left: Math.round(width / 2 - 130)
                    }
                ]
                : [];

        const comment =
            review.general_comment ||
            "Excelente experiencia. Muy recomendable.";

        const customer =
            review.customer_name ||
            "Cliente";

        const businessName =
            review.business_name ||
            "Tags";

        const fontSize =
            format === "story" ? 58 : 48;

        const reviewDate =
            new Date(review.created_at)
                .toLocaleDateString("es-AR");

        const svg =
            `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">

        <rect x="70" y="${height * 0.25}" width="${width - 140}" height="${height * 0.48}" rx="38" fill="rgba(255,255,255,0.92)" />

        <text x="${width / 2}" y="${height * 0.34}" text-anchor="middle"
            font-size="58" font-weight="700" fill="#f59e0b">
            ${stars(review.average_rating)}
        </text>

        <foreignObject x="130" y="${height * 0.40}" width="${width - 260}" height="${height * 0.20}">
            <div xmlns="http://www.w3.org/1999/xhtml"
                style="font-family:Arial,sans-serif;font-size:${fontSize}px;line-height:1.22;text-align:center;color:#111827;font-weight:600;">
                “${escapeXml(comment)}”
            </div>
        </foreignObject>

        <text x="${width / 2}" y="${height * 0.62}" text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="24"
            fill="#6b7280">
            ${escapeXml(reviewDate)}
        </text>

        <text x="${width / 2}" y="${height * 0.68}" text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="34"
            fill="#374151">
            ${escapeXml(customer)}
        </text>

        <text x="${width / 2}" y="${height - 90}" text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="30"
            fill="#ffffff"
            font-weight="700">
            ${escapeXml(businessName)}
        </text>

    </svg>
    `;

        const output =
            await sharp(bgLayer)
                .composite([
                    ...logoComposite,
                    {
                        input:
                            Buffer.from(svg),
                        top: 0,
                        left: 0
                    }
                ])
                .png()
                .toBuffer();

        return new Response(output, {
            status: 200,
            headers: {
                "Content-Type": "image/png",
                "Content-Disposition": `attachment; filename="review-${responseId}-${format}.png"`
            }
        });

    } catch (err) {
        console.error(
            "CLIENT REVIEWS SOCIAL CARD CREATE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error generando pieza"
            },
            {
                status: 500
            }
        );
    }
}