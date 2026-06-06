export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

export async function POST(req) {

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

        await db.query(
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