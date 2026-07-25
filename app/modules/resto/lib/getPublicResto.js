// =====================================
// FILE: app/modules/resto/lib/getPublicResto.js
// Descripción:
// Obtiene todos los datos públicos de Tags
// Resto a partir del slug de su página
// publicada.
//
// Incluye:
// - Configuración del restaurante.
// - Datos públicos normalizados.
// - Tema público.
// - Categorías.
// - Productos.
// - Secciones de la plantilla.
// - Bloques públicos de Tags Resto.
//
// Contexto:
// resto
// =====================================

import { db }
    from "@/app/lib/tags-db";

import { safeParseJSON }
    from "@/app/modules/qr-page/lib/safeParseJSON";

export async function getPublicResto(
    slug,
    {
        locationId = null,
        qrCode = null
    } = {}
) {

    if (!slug) {
        return null;
    }

    // =====================================
    // RESTAURANTE Y PÁGINA PÚBLICA
    // =====================================

    const [storeRows] =
        await db.query(
            `
            SELECT
                s.*,

                p.id AS page_id,
                p.slug AS page_slug,
                p.status AS page_status,
                p.page_type,
                p.schema_type,
                p.business_id,
                p.theme_id,

                t.code AS theme_code,
                t.name AS theme_name,
                t.css_tokens AS theme_css_tokens

            FROM tags_stores s

            INNER JOIN tags_qr_pages p
                ON p.id = s.page_id

            LEFT JOIN tags_qr_page_themes t
                ON t.id = p.theme_id

            WHERE p.slug = ?
            AND p.status = 'published'
            AND p.page_type = 'resto'
            AND s.app_type = 'resto'
            AND s.status = 'published'

            LIMIT 1
            `,
            [
                slug
            ]
        );

    const store =
        storeRows?.[0];

    if (!store) {
        return null;
    }

    store.settings_json =
        safeParseJSON(
            store.settings_json
        );

    store.styles_json =
        safeParseJSON(
            store.styles_json
        );

    // =====================================
    // DATOS PÚBLICOS NORMALIZADOS
    // =====================================
    //
    // Estos objetos constituyen la única
    // fuente de información pública para
    // los bloques de Tags Resto.
    //
    // Los componentes no deben volver a
    // leer directamente settings_json ni
    // definir datos comerciales ficticios.
    // =====================================

    store.contact = {
        ...(
            store.settings_json?.contact ||
            {}
        )
    };

    store.social = {
        ...(
            store.settings_json?.social ||
            {}
        )
    };

    store.location = {
        ...(
            store.settings_json?.location ||
            {}
        )
    };

    store.delivery = {
        ...(
            store.settings_json?.delivery ||
            {}
        )
    };

    store.takeaway = {
        ...(
            store.settings_json?.takeaway ||
            {}
        )
    };

    store.serviceModes = {
        ...(
            store.settings_json?.serviceModes ||
            {}
        )
    };

    store.tableService = {
        ...(
            store.settings_json?.tableService ||
            {}
        )
    };

    store.features = {
        ...(
            store.settings_json?.features ||
            {}
        )
    };

    store.payments = {
        ...(
            store.settings_json?.payments ||
            {}
        )
    };

    store.businessHours = {
        ...(
            store.settings_json?.businessHours ||
            {}
        )
    };

    store.showOwnHeader =
        store.settings_json?.showOwnHeader !==
        false;

    store.showOwnFooter =
        store.settings_json?.showOwnFooter !==
        false;

    store.orderTrackingEnabled =
        store.settings_json
            ?.orderTrackingEnabled ===
        true;

    // =====================================
    // TEMA PÚBLICO
    // =====================================

    const themeTokens =
        safeParseJSON(
            store.theme_css_tokens
        );

    const customTokens =
        safeParseJSON(
            store.styles_json?.css_tokens
        );

    store.theme_css_vars = {
        ...themeTokens,
        ...customTokens
    };

    store.theme =
        store.theme_id
            ? {
                id:
                    store.theme_id,

                code:
                    store.theme_code,

                name:
                    store.theme_name,

                css_tokens:
                    themeTokens
            }
            : null;

    // =====================================
    // CATEGORÍAS
    // =====================================

    const [categoryRows] =
        await db.query(
            `
            SELECT
                *
            FROM tags_store_categories
            WHERE store_id = ?
            AND is_visible = 1
            ORDER BY
                sort_order ASC,
                name ASC
            `,
            [
                store.id
            ]
        );

    const categories =
        categoryRows.map(
            category => ({
                ...category,

                settings_json:
                    safeParseJSON(
                        category.settings_json
                    )
            })
        );

    // =====================================
    // PRODUCTOS
    // =====================================

    const [productRows] =
        await db.query(
            `
            SELECT
                p.*,

                c.name AS category_name,

                img.image_url AS primary_image_url,

                COUNT(
                    DISTINCT v.id
                ) AS variants_count

            FROM tags_store_products p

            LEFT JOIN tags_store_categories c
                ON c.id = p.category_id

            LEFT JOIN tags_store_product_images img
                ON img.product_id = p.id
                AND img.is_primary = 1

            LEFT JOIN tags_store_variants v
                ON v.product_id = p.id
                AND v.is_visible = 1

            WHERE p.store_id = ?
            AND p.is_visible = 1

            GROUP BY
                p.id,
                c.name,
                img.image_url

            ORDER BY
                p.is_featured DESC,
                p.created_at DESC
            `,
            [
                store.id
            ]
        );

    const products =
        productRows.map(
            product => ({
                ...product,

                images_json:
                    safeParseJSON(
                        product.images_json
                    ),

                settings_json:
                    safeParseJSON(
                        product.settings_json
                    )
            })
        );

    // =====================================
    // SECCIONES DE LA PLANTILLA
    // =====================================

    const [sectionRows] =
        await db.query(
            `
            SELECT
                *
            FROM tags_store_sections
            WHERE store_id = ?
            AND is_visible = 1
            ORDER BY
                sort_order ASC,
                id ASC
            `,
            [
                store.id
            ]
        );

    const sections =
        sectionRows.map(
            section => ({
                ...section,

                settings_json:
                    safeParseJSON(
                        section.settings_json
                    )
            })
        );

    // =====================================
    // BLOQUES DE LA PLANTILLA
    // =====================================

    let blocks = [];

    if (sections.length) {

        const sectionIds =
            sections.map(
                section =>
                    Number(section.id)
            );

        const placeholders =
            sectionIds
                .map(() => "?")
                .join(", ");

        const [blockRows] =
            await db.query(
                `
                SELECT
                    *
                FROM tags_store_blocks
                WHERE section_id IN (
                    ${placeholders}
                )
                AND is_visible = 1
                ORDER BY
                    sort_order ASC,
                    id ASC
                `,
                sectionIds
            );

        blocks =
            blockRows.map(
                block => ({
                    ...block,

                    content_json:
                        safeParseJSON(
                            block.content_json
                        ),

                    styles_json:
                        safeParseJSON(
                            block.styles_json
                        ),

                    animation_json:
                        safeParseJSON(
                            block.animation_json
                        )
                })
            );
    }

    // =====================================
    // UBICACIÓN DE ORIGEN
    // =====================================

    let location = null;

    if (locationId) {

        const [locationRows] =
            await db.query(
                `
            SELECT
                l.*,

                parent.name AS parent_name,

                qr.id AS source_qr_code_id,
                qr.code AS qr_code,
                qr.final_url AS qr_final_url,
                qr.status AS qr_status,
                qr.is_active AS qr_is_active

            FROM tags_resto_locations l

            LEFT JOIN tags_resto_locations parent
                ON parent.id = l.parent_id
                AND parent.store_id = l.store_id

            INNER JOIN tags_qr_codes qr
                ON qr.id = l.qr_code_id

            WHERE l.id = ?
            AND l.store_id = ?
            AND l.is_active = 1
            AND qr.is_active = 1
            AND qr.status = 'active'
            AND (
                ? IS NULL
                OR qr.code = ?
            )

            LIMIT 1
            `,
                [
                    Number(locationId),
                    store.id,
                    qrCode || null,
                    qrCode || null
                ]
            );

        location =
            locationRows?.[0] ||
            null;
    }

    // =====================================
    // RESULTADO PÚBLICO COMPLETO
    // =====================================

    return {
    store,
    categories,
    products,
    sections,
    blocks,
    location
};
}