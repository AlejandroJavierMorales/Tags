export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

import {
    normalizeArgentinaWhatsapp,
    normalizeWebsite,
    normalizeSocialUser
} from "@/app/modules/qr-page/lib/normalizeContactFields";



export async function POST(req) {



    try {

        const body =
            await req.json();

        const {
            businessId,
            pageId,

            slug,
            title,
            description,
            status,

            logo_url,
            cover_image_url,

            whatsapp,
            email,
            phone,
            address,

            instagram_url,
            facebook_url,
            tiktok_url,
            youtube_url,
            linkedin_url,
            website_url,

            global_styles,
            typography_tokens,
            header_config,
            footer_config,
            seo_title,
            seo_description,
            seo_keywords,
            seo_image_url,
            seo_image_og_url,
            canonical_url,
            schema_type,
            robots_index,
            robots_follow
        } = body;

        if (!businessId) {

            return Response.json(
                {
                    error:
                        "businessId requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!pageId) {

            return Response.json(
                {
                    error:
                        "pageId requerido"
                },
                {
                    status: 400
                }
            );
        }

        const access =
            await requireQRPageAccess(
                businessId
            );

        if (!access.ok) {

            return Response.json(
                {
                    error:
                        access.error
                },
                {
                    status:
                        access.status
                }
            );
        }

        const [pages] =
            await db.query(
                `
                SELECT
                    id,
                    slug,
                    slug_locked
                FROM
                    tags_qr_pages
                WHERE
                    id = ?
                    AND business_id = ?
                LIMIT 1
                `,
                [
                    pageId,
                    businessId
                ]
            );

        if (!pages.length) {

            const page =
                pages[0];

            return Response.json(
                {
                    error:
                        "QR-Page no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const page =
            pages[0];

        if (
            page.slug_locked &&
            slug &&
            slug !== page.slug
        ) {

            return Response.json(
                {
                    error:
                        "El slug ya fue bloqueado y no puede modificarse"
                },
                {
                    status: 409
                }
            );
        }


        /* NORMALIZACION DE LINKS */
        const normalizedWhatsapp =
            normalizeArgentinaWhatsapp(whatsapp);

        const normalizedWebsite =
            normalizeWebsite(website_url);

        const normalizedInstagram =
            normalizeSocialUser("instagram", instagram_url);

        const normalizedFacebook =
            normalizeSocialUser("facebook", facebook_url);

        const normalizedTiktok =
            normalizeSocialUser("tiktok", tiktok_url);

        const normalizedYoutube =
            normalizeSocialUser("youtube", youtube_url);

        const normalizedLinkedin =
            normalizeSocialUser("linkedin", linkedin_url);

        if (slug) {

            const [existing] =
                await db.query(
                    `
                    SELECT
                        id
                    FROM
                        tags_qr_pages
                    WHERE
                        slug = ?
                        AND id <> ?
                    LIMIT 1
                    `,
                    [
                        slug,
                        pageId
                    ]
                );

            if (existing.length) {

                return Response.json(
                    {
                        error:
                            "Ese slug ya está en uso"
                    },
                    {
                        status: 409
                    }
                );
            }
        }

        await db.query(
            `
            UPDATE
                tags_qr_pages
            SET
                slug = ?,
                title = ?,
                description = ?,
                status = ?,

                logo_url = ?,
                cover_image_url = ?,

                whatsapp = ?,
                email = ?,
                phone = ?,
                address = ?,

                instagram_url = ?,
                facebook_url = ?,
                tiktok_url = ?,
                youtube_url = ?,
                linkedin_url = ?,
                website_url = ?,

                global_styles = ?,
                typography_tokens = ?,
                header_config = ?,
                footer_config = ?,

                seo_title = ?,
                seo_description = ?,
                seo_keywords = ?,
                seo_image_url = ?,
                seo_image_og_url = ?,
                canonical_url = ?,
                schema_type = ?,
                robots_index = ?,
                robots_follow = ?,

                updated_at = NOW()
            WHERE
                id = ?
                AND business_id = ?
            `,
            [
                slug || null,
                title || null,
                description || null,
                status || "draft",

                logo_url || null,
                cover_image_url || null,

                normalizedWhatsapp,
                email || null,
                phone || null,
                address || null,
                normalizedInstagram,
                normalizedFacebook,
                normalizedTiktok,
                normalizedYoutube,
                normalizedLinkedin,
                normalizedWebsite,

                JSON.stringify(
                    global_styles || {}
                ),
                JSON.stringify(
                    typography_tokens || {}
                ),
                JSON.stringify(
                    header_config || {}
                ),
                JSON.stringify(
                    footer_config || {}
                ),

                seo_title || null,
                seo_description || null,
                seo_keywords || null,
                seo_image_url || null,
                seo_image_og_url || null,
                canonical_url || null,
                schema_type || "auto",
                robots_index ? 1 : 0,
                robots_follow ? 1 : 0,

                pageId,
                businessId
            ]
        );

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    err.message
            },
            {
                status: 500
            }
        );
    }
}