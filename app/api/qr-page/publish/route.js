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
        : process.env.NEXT_PUBLIC_BASE_URL;
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
                    slug
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
                        "NEXT_PUBLIC_BASE_URL no configurado"
                },
                {
                    status: 500
                }
            );
        }

        const publicUrl =
            `${baseUrl}/p/${page.slug}`;

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