// =====================================
// API: /api/qr-page/blocks/update
// Nombre: Actualizar bloque QR-Page
// Descripción: Actualiza contenido, estilos, tipo o visibilidad de un bloque.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";
import { normalizeWebSectionBlock } from "@/app/modules/qr-page/lib/normalizeWebSectionBlock";

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {
            businessId,
            pageId,
            sectionId,
            blockId,
            type,
            is_visible,
            content_json,
            styles_json
        } = body;

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
                { status: 400 }
            );
        }

        if (!pageId) {
            return Response.json(
                { error: "pageId requerido" },
                { status: 400 }
            );
        }

        if (!sectionId) {
            return Response.json(
                { error: "sectionId requerido" },
                { status: 400 }
            );
        }

        if (!blockId) {
            return Response.json(
                { error: "blockId requerido" },
                { status: 400 }
            );
        }

        const access =
            await requireQRPageAccess(
                businessId
            );

        if (!access.ok) {
            return Response.json(
                { error: access.error },
                { status: access.status }
            );
        }

        const [blocks] =
            await db.query(
                `
                SELECT
                    b.id,
                    p.page_type
                FROM
                    tags_qr_page_blocks b
                INNER JOIN
                    tags_qr_page_sections s
                        ON s.id = b.section_id
                INNER JOIN
                    tags_qr_pages p
                        ON p.id = s.page_id
                WHERE
                    b.id = ?
                    AND b.section_id = ?
                    AND s.page_id = ?
                    AND p.business_id = ?
                LIMIT 1
                `,
                [
                    blockId,
                    sectionId,
                    pageId,
                    businessId
                ]
            );

        if (!blocks.length) {
            return Response.json(
                { error: "Bloque no encontrado" },
                { status: 404 }
            );
        }

        await db.query(
            `
            UPDATE
                tags_qr_page_blocks
            SET
                type = COALESCE(?, type),
                is_visible = ?,
                content_json = ?,
                styles_json = ?,
                updated_at = NOW()
            WHERE
                id = ?
                AND section_id = ?
            `,
            [
                type || null,
                is_visible ? 1 : 0,
                JSON.stringify(type === "web_section" ? normalizeWebSectionBlock(content_json) : (content_json || {})),
                JSON.stringify(styles_json || {}),
                blockId,
                sectionId
            ]
        );

        if (blocks[0].page_type === "directory" && type === "gallery" && Number(content_json?.maxImages) === 8) {
            const images = (Array.isArray(content_json?.images) ? content_json.images : []).filter(item => item?.url).slice(0, 8);
            const [listings] = await db.query("SELECT id FROM tags_directory_listings WHERE qr_page_id=? AND business_id=? LIMIT 1", [pageId, businessId]);
            if (listings.length) {
                await db.query("DELETE FROM tags_directory_media WHERE listing_id=? AND media_type='gallery'", [listings[0].id]);
                for (let index = 0; index < images.length; index += 1) {
                    await db.query("INSERT INTO tags_directory_media (listing_id,media_type,url,alt_text,sort_order,is_active) VALUES (?,'gallery',?,?,?,1)", [listings[0].id, String(images[index].url).slice(0, 2000), String(images[index].alt || "").slice(0, 255) || null, index]);
                }
            }
        }

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
