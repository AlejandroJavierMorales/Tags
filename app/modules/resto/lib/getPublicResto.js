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
import {
    withRestoProductAvailability
} from "@/app/modules/resto/lib/products/restoProductAvailability";

const WEEK_DAYS = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
];

function minutesFromTime(value) {
    const [hours, minutes] =
        String(value || "")
            .split(":")
            .map(Number);

    if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes)
    ) {
        return null;
    }

    return hours * 60 + minutes;
}

function getServiceAvailability(operation = {}) {
    const openingHours =
        operation?.opening_hours || {};

    const hasConfiguredHours =
        Object.values(openingHours).some(
            day => day?.enabled === true
        );

    if (!hasConfiguredHours) {
        return {
            configured: false,
            isOpen: null,
            status: ""
        };
    }

    const timezone =
        operation?.timezone ||
        "America/Argentina/Buenos_Aires";

    let parts;

    try {
        parts =
            new Intl.DateTimeFormat(
                "en-US",
                {
                    timeZone: timezone,
                    weekday: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23"
                }
            ).formatToParts(new Date());
    } catch {
        parts =
            new Intl.DateTimeFormat(
                "en-US",
                {
                    timeZone:
                        "America/Argentina/Buenos_Aires",
                    weekday: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23"
                }
            ).formatToParts(new Date());
    }

    const partValue =
        type =>
            parts.find(part => part.type === type)
                ?.value || "";

    const day =
        partValue("weekday").toLowerCase();

    const currentMinutes =
        Number(partValue("hour")) * 60 +
        Number(partValue("minute"));

    const currentDay =
        openingHours[day] || {};

    const currentOpen =
        minutesFromTime(currentDay.open);

    const currentClose =
        minutesFromTime(currentDay.close);

    let isOpen = false;

    if (
        currentDay.enabled === true &&
        currentOpen !== null &&
        currentClose !== null
    ) {
        isOpen =
            currentOpen === currentClose ||
            (
                currentOpen < currentClose
                    ? currentMinutes >= currentOpen &&
                        currentMinutes < currentClose
                    : currentMinutes >= currentOpen
            );
    }

    if (!isOpen) {
        const dayIndex =
            WEEK_DAYS.indexOf(day);

        const previousDayName =
            WEEK_DAYS[
                (
                    dayIndex - 1 +
                    WEEK_DAYS.length
                ) %
                WEEK_DAYS.length
            ];

        const previousDay =
            openingHours[previousDayName] || {};

        const previousOpen =
            minutesFromTime(previousDay.open);

        const previousClose =
            minutesFromTime(previousDay.close);

        isOpen =
            previousDay.enabled === true &&
            previousOpen !== null &&
            previousClose !== null &&
            previousOpen > previousClose &&
            currentMinutes < previousClose;
    }

    return {
        configured: true,
        isOpen,
        status:
            isOpen
                ? "open"
                : "closed"
    };
}

export async function getPublicResto(
    slug,
    {
        locationId = null,
        qrCode = null,
        allowDirectoryEmbedding = false
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
                p.global_styles AS page_global_styles,

                t.code AS theme_code,
                t.name AS theme_name,
                t.css_tokens AS theme_css_tokens,

                b.logo_url AS business_logo_url,
                b.cover_url AS business_cover_url,
                b.email AS business_email,
                b.phone AS business_phone,
                b.whatsapp AS business_whatsapp,
                b.address AS business_address,
                b.website_url AS business_website_url,
                b.instagram_url AS business_instagram_url,
                b.facebook_url AS business_facebook_url,
                b.latitude AS business_latitude,
                b.longitude AS business_longitude

            FROM tags_stores s

            INNER JOIN tags_qr_pages p
                ON p.id = s.page_id

            INNER JOIN tags_businesses b
                ON b.id = s.business_id

            LEFT JOIN tags_qr_page_themes t
                ON t.id = p.theme_id

            WHERE p.slug = ?
            AND p.page_type = 'resto'
            AND s.app_type = 'resto'
            AND (
                (p.status = 'published' AND s.status = 'published')
                OR (
                    ? = 1
                    AND EXISTS (
                        SELECT 1
                        FROM tags_business_addons ba_resto
                        WHERE ba_resto.business_id = s.business_id
                        AND ba_resto.addon_code = 'resto'
                        AND ba_resto.status = 'active'
                        AND (ba_resto.expires_at IS NULL OR ba_resto.expires_at >= NOW())
                    )
                    AND EXISTS (
                        SELECT 1
                        FROM tags_directory_listings dl
                        INNER JOIN tags_directory_site_listings dsl
                            ON dsl.listing_id = dl.id
                            AND dsl.publication_status = 'published'
                            AND dsl.is_free = 0
                        INNER JOIN tags_qr_pages dp
                            ON dp.id = dl.qr_page_id
                            AND dp.page_type = 'directory'
                            AND dp.status = 'published'
                        WHERE dl.business_id = s.business_id
                        AND dl.status = 'published'
                    )
                )
            )

            LIMIT 1
            `,
            [
                slug,
                allowDirectoryEmbedding ? 1 : 0
            ]
        );

    const store =
        storeRows?.[0];

    if (!store) {
        return null;
    }

    const [reviewAddonRows] =
        await db.query(
            `
            SELECT 1 AS active
            FROM tags_business_addons
            WHERE business_id = ?
            AND addon_code = 'client_reviews'
            AND status IN ('active', 'enabled')
            LIMIT 1
            `,
            [store.business_id]
        );

    store.has_reviews = Boolean(reviewAddonRows?.length);

    store.settings_json =
        safeParseJSON(
            store.settings_json
        );

    store.styles_json =
        safeParseJSON(
            store.styles_json
        );

    store.page_global_styles =
        safeParseJSON(
            store.page_global_styles
        );

    store.logo_url =
        store.business_logo_url || store.logo_url;
    store.cover_url =
        store.business_cover_url || store.cover_url;
    store.email =
        store.business_email || store.email;
    store.whatsapp =
        store.business_whatsapp || store.whatsapp;
    store.address =
        store.business_address || store.address;

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
            store.settings_json?.resto_contact ||
            store.settings_json?.contact ||
            {}
        ),
        email:
            store.business_email ||
            store.settings_json?.resto_contact?.email ||
            store.email ||
            "",
        phone:
            store.business_phone ||
            store.settings_json?.resto_contact?.phone ||
            "",
        whatsapp:
            store.business_whatsapp ||
            store.settings_json?.resto_contact?.whatsapp ||
            store.whatsapp ||
            "",
        website:
            store.business_website_url ||
            store.settings_json?.resto_contact?.website ||
            ""
    };

    store.social = {
        ...(
            store.settings_json?.social ||
            {}
        ),
        instagram:
            store.business_instagram_url ||
            store.settings_json?.resto_contact?.instagram ||
            store.settings_json?.social?.instagram ||
            "",
        facebook:
            store.business_facebook_url ||
            store.settings_json?.resto_contact?.facebook ||
            store.settings_json?.social?.facebook ||
            ""
    };

    store.location = {
        ...(
            store.settings_json?.resto_location ||
            store.settings_json?.location ||
            {}
        ),
        address:
            store.business_address ||
            store.settings_json?.resto_location?.address ||
            store.address ||
            "",
        latitude:
            store.business_latitude ??
            store.settings_json?.resto_location?.latitude ??
            null,
        longitude:
            store.business_longitude ??
            store.settings_json?.resto_location?.longitude ??
            null
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
            store.settings_json
                ?.resto_operation
                ?.opening_hours ||
            store.settings_json?.businessHours ||
            {}
        )
    };

    store.operation = {
        ...(
            store.settings_json
                ?.resto_operation ||
            {}
        )
    };

    const serviceAvailability =
        getServiceAvailability(
            store.operation
        );

    store.is_open =
        serviceAvailability.isOpen;

    store.service_status =
        serviceAvailability.status;

    store.service_hours_configured =
        serviceAvailability.configured;

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
        product =>
            withRestoProductAvailability({
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

    let sections =
        sectionRows.map(
            section => ({
                ...section,

                settings_json:
                    safeParseJSON(
                        section.settings_json
                    )
            })
        );

    if (!store.has_reviews) {
        sections = sections.filter(
            section =>
                !["reviews", "reviews_cta"].includes(
                    section.section_type
                )
        );
    }

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

        if (!store.has_reviews) {
            blocks = blocks.filter(
                block =>
                    !["resto_reviews", "resto_reviews_cta"].includes(
                        block.block_type
                    )
            );
        }
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
