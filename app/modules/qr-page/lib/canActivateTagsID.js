// =====================================
// LIB: canActivateTagsID
// Descripción: Valida si un cliente puede activar TagsID.
// =====================================

import { db }
    from "@/app/lib/tags-db";

export async function canActivateTagsID({
    businessId
}) {

    const [addonRows] =
        await db.query(
            `
            SELECT
                id
            FROM
                tags_business_addons
            WHERE
                business_id = ?
                AND addon_code = 'tagsid'
                AND status = 'active'
            LIMIT 1
            `,
            [
                businessId
            ]
        );

    if (!addonRows.length) {

        return {
            ok: false,
            status: 403,
            error:
                "El cliente no tiene TagsID habilitado"
        };
    }

    const [pageRows] =
        await db.query(
            `
            SELECT
                id
            FROM
                tags_qr_pages
            WHERE
                business_id = ?
                AND page_type = 'tagsid'
            LIMIT 1
            `,
            [
                businessId
            ]
        );

    if (pageRows.length) {

        return {
            ok: false,
            status: 409,
            error:
                "El cliente ya tiene un TagsID"
        };
    }

    return {
        ok: true
    };
}