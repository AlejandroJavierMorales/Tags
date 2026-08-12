export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

export async function POST(req) {

    const conn = await db.getConnection();

    try {

        const {
            businessId,
            pageId
        } = await req.json();

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

        const [pages] = await conn.query(
            "SELECT id,page_type FROM tags_qr_pages WHERE id=? AND business_id=? LIMIT 1",
            [pageId, businessId]
        );
        if (!pages.length) {
            return Response.json({ error: "QR-Page no encontrada" }, { status: 404 });
        }

        await conn.beginTransaction();

        await conn.query(
            `
            UPDATE
                tags_qr_pages
            SET
                status = 'draft',
                updated_at = NOW()
            WHERE
                id = ?
                AND business_id = ?
            `,
            [
                pageId,
                businessId
            ]
        );

        if (pages[0].page_type === "directory") {
            await conn.query(
                "UPDATE tags_directory_listings SET status='draft',updated_at=NOW() WHERE qr_page_id=? AND business_id=?",
                [pageId, businessId]
            );
            await conn.query(
                "UPDATE tags_directory_site_listings sl INNER JOIN tags_directory_listings l ON l.id=sl.listing_id SET sl.publication_status='draft',sl.updated_at=NOW() WHERE l.qr_page_id=? AND l.business_id=?",
                [pageId, businessId]
            );
        }

        await conn.commit();

        return Response.json({
            ok: true
        });

    } catch (err) {

        await conn.rollback();

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
    } finally {
        conn.release();
    }
}
