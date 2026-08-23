// =====================================
// API: /api/workspace/apps/qr-page/activate
// Descripción: Activa una QR-Page desde el Workspace creando automáticamente su QR digital asociado.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getRequestBaseUrl } from "@/app/lib/channelContext";

import { createSlug }
    from "@/app/modules/qr-page/lib/createSlug";

import { registerQRAddonUsage }
    from "@/app/modules/addons/lib/registerQRAddonUsage";

import { createAppQRCode }
    from "@/app/modules/qr/lib/createAppQRCode";
import { createQRPageFromTemplate } from "@/app/modules/qr-page/lib/createQRPageFromTemplate";

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const body =
            await req.json();

        const {
            businessId,
            title,
            slug
        } = body;

        if (!businessId || !title || !slug) {
            return Response.json(
                {
                    error:
                        "businessId, title y slug son requeridos"
                },
                {
                    status: 400
                }
            );
        }

        const cleanSlug =
            createSlug(slug);

        if (!cleanSlug) {
            return Response.json(
                {
                    error:
                        "Slug inválido"
                },
                {
                    status: 400
                }
            );
        }

        const [businessRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_businesses
                WHERE id = ?
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const business =
            businessRows[0];

        if (!business) {
            return Response.json(
                {
                    error:
                        "Cliente no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const [slugRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_qr_pages
                WHERE slug = ?
                LIMIT 1
                `,
                [
                    cleanSlug
                ]
            );

        if (slugRows.length) {
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

        const [addonRows] =
            await conn.query(
                `
                SELECT quantity
                FROM tags_business_addons
                WHERE business_id = ?
                AND addon_code = 'qr_page'
                AND status = 'active'
                AND (
                    expires_at IS NULL
                    OR expires_at >= NOW()
                )
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const totalAllowed =
            Number(addonRows[0]?.quantity || 0);

        if (totalAllowed <= 0) {
            return Response.json(
                {
                    error:
                        "Este cliente no tiene cupo de QR-Page"
                },
                {
                    status: 403
                }
            );
        }

        const [usageRows] =
            await conn.query(
                `
                SELECT COUNT(*) AS total_used
                FROM tags_qr_pages
                WHERE business_id = ?
                AND page_type = 'qr_page'
                `,
                [
                    businessId
                ]
            );

        const totalUsed =
            Number(usageRows[0]?.total_used || 0);

        if (totalUsed >= totalAllowed) {
            return Response.json(
                {
                    error:
                        "No quedan QR-Pages disponibles",
                    totalAllowed,
                    totalUsed
                },
                {
                    status: 403
                }
            );
        }

        await conn.beginTransaction();

        const publicUrl =
            `${getRequestBaseUrl(req)}/p/${cleanSlug}`;

        const qr =
            await createAppQRCode({
                conn,
                businessId,
                label: title,
                value: publicUrl,
                finalUrl: publicUrl,
                status: "active"
            });

        const { pageId } = await createQRPageFromTemplate({
            conn,
            business,
            businessId,
            qrCodeId: qr.id,
            slug: cleanSlug,
            title,
            status: "draft"
        });



        await registerQRAddonUsage({
            conn,
            qrCodeId: qr.id,
            businessId,
            addonCode: "qr_page",
            sourceTable: "tags_qr_pages",
            sourceId: pageId
        });

        await conn.query(
            `
            UPDATE tags_qr_codes
            SET has_qr_page = 1
            WHERE id = ?
            AND business_id = ?
            `,
            [
                qr.id,
                businessId
            ]
        );

        await conn.commit();

        return Response.json({
            ok: true,
            qrId: qr.id,
            qrCode: qr.code,
            pageId,
            slug: cleanSlug,
            publicUrl
        });

    } catch (err) {

        await conn.rollback();

        console.error(
            "WORKSPACE QR-PAGE ACTIVATE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error activando QR-Page desde Workspace"
            },
            {
                status:
                    err.status || 500
            }
        );

    } finally {

        conn.release();
    }
}
