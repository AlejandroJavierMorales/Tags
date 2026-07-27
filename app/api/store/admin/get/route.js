// =====================================
// API: /api/store/admin/get
// Descripción: Obtiene la tienda de un cliente por businessId,
// incluyendo secciones y bloques del builder de Tags Store.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function parseJson(value, fallback = {}) {
    if (!value) {
        return fallback;
    }

    if (typeof value === "object") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("businessId");

        if (!businessId) {
            return Response.json(
                {
                    error: "businessId es requerido"
                },
                {
                    status: 400
                }
            );
        }

        const [storeRows] =
            await db.query(
                `
                SELECT
                    s.*,
                    p.slug AS page_slug,
                    p.status AS page_status,
                    p.page_type AS page_type
                FROM tags_stores s
                LEFT JOIN tags_qr_pages p
                    ON p.id = s.page_id
                WHERE s.business_id = ?
                AND s.app_type = 'store'
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows[0] || null;

        if (!store) {
            return Response.json({
                ok: true,
                store: null,
                sections: [],
                blocks: []
            });
        }

        store.settings_json =
            parseJson(
                store.settings_json,
                {}
            );

        store.styles_json =
            parseJson(
                store.styles_json,
                {}
            );

        const [sectionRows] =
            await db.query(
                `
                SELECT *
                FROM tags_store_sections
                WHERE store_id = ?
                ORDER BY sort_order ASC, id ASC
                `,
                [
                    store.id
                ]
            );

        const sections =
            sectionRows.map(section => ({
                ...section,
                settings_json:
                    parseJson(
                        section.settings_json,
                        {}
                    )
            }));

        const sectionIds =
            sections.map(section => section.id);

        let blocks = [];

        if (sectionIds.length) {
            const placeholders =
                sectionIds.map(() => "?").join(",");

            const [blockRows] =
                await db.query(
                    `
                    SELECT *
                    FROM tags_store_blocks
                    WHERE section_id IN (${placeholders})
                    ORDER BY sort_order ASC, id ASC
                    `,
                    sectionIds
                );

            blocks =
                blockRows.map(block => ({
                    ...block,
                    content_json:
                        parseJson(
                            block.content_json,
                            {}
                        ),
                    styles_json:
                        parseJson(
                            block.styles_json,
                            {}
                        ),
                    animation_json:
                        parseJson(
                            block.animation_json,
                            {}
                        )
                }));
        }

        return Response.json({
            ok: true,
            store,
            sections,
            blocks
        });

    } catch (err) {
        console.error(
            "STORE ADMIN GET ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error obteniendo tienda"
            },
            {
                status: 500
            }
        );
    }
}
