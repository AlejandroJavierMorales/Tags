// =====================================
// API: /api/qr-page/publish
// Descripción: Publica una QR-Page, bloquea el slug y actualiza el QR asociado con la URL pública.
// =====================================


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

function getBaseUrl() {
    return process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL_PROD;
}

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const {
            businessId,
            pageId
        } = await req.json();

        if (!businessId || !pageId) {
            return Response.json(
                {
                    error:
                        "businessId y pageId requeridos"
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
            await conn.query(
                `
                SELECT
                    id,
                    business_id,
                    qr_code_id,
                    slug,
                    page_type
                FROM tags_qr_pages
                WHERE id = ?
                AND business_id = ?
                LIMIT 1
                `,
                [
                    pageId,
                    businessId
                ]
            );

        const page =
            pages[0];

        if (!page) {
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

        if (!page.slug) {
            return Response.json(
                {
                    error:
                        "La QR-Page necesita un slug antes de publicarse"
                },
                {
                    status: 400
                }
            );
        }

        const baseUrl =
            getBaseUrl();

        if (!baseUrl) {
            return Response.json(
                {
                    error:
                        "NEXT_PUBLIC_BASE_URL_PROD no configurado"
                },
                {
                    status: 500
                }
            );
        }

        let publicUrl = `${baseUrl}/p/${page.slug}`;
        if (page.page_type === "directory") {
            const [routes] = await conn.query(
                "SELECT sl.slug,s.primary_host FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id INNER JOIN tags_directory_sites s ON s.id=sl.site_id WHERE l.qr_page_id=? AND l.business_id=? ORDER BY sl.id LIMIT 1",
                [pageId, businessId]
            );
            if (routes.length) {
                publicUrl = process.env.NODE_ENV === "development"
                    ? `${baseUrl}/${routes[0].slug}`
                    : `https://${routes[0].primary_host}/${routes[0].slug}`;
            }
        }

        await conn.beginTransaction();

        await conn.query(
            `
            UPDATE tags_qr_pages
            SET
                status = 'published',
                slug_locked = 1,
                updated_at = NOW()
            WHERE id = ?
            AND business_id = ?
            `,
            [
                pageId,
                businessId
            ]
        );

        await conn.query(
            `
            UPDATE tags_qr_codes
            SET
                status = 'active',
                final_url = ?,
                has_qr_page = 1
            WHERE id = ?
            AND business_id = ?
            `,
            [
                publicUrl,
                page.qr_code_id,
                businessId
            ]
        );

        if (page.page_type === "directory") {
            await conn.query(
                "UPDATE tags_directory_listings SET status='published',updated_at=NOW() WHERE qr_page_id=? AND business_id=?",
                [pageId, businessId]
            );
            await conn.query(
                "UPDATE tags_directory_site_listings sl INNER JOIN tags_directory_listings l ON l.id=sl.listing_id SET sl.publication_status='published',sl.updated_at=NOW() WHERE l.qr_page_id=? AND l.business_id=?",
                [pageId, businessId]
            );
        }

        await conn.commit();

        return Response.json({
            ok: true,
            publicUrl
        });

    } catch (err) {

        await conn.rollback();

        console.log("QR PAGE PUBLISH ERROR:", err);

        return Response.json(
            {
                error:
                    err.message || "Error publicando QR-Page"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();
    }
}
