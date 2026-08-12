// =====================================
// API: /api/resto/public/orders/create
// Descripción:
// Crea o agrega productos a una sesión
// pública de Tags Resto.
//
// table
// takeaway
// delivery
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";

import {
    db
} from "@/app/lib/tags-db";
import {
    getRestoProductAvailability
} from "@/app/modules/resto/lib/products/restoProductAvailability";
import { getGuestPublicSession } from "@/app/modules/guest-experience/lib/getGuestPublicSession";

function createToken() {

    return crypto
        .randomBytes(32)
        .toString("hex");

}

function safe(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;

    }

    return value;

}

function money(value) {

    return Number(
        Number(value || 0).toFixed(2)
    );

}

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const body =
            await req.json();

        const {

            serviceMode,

            service_mode,

            createSessionOnly = false,

            sessionId,

            sessionToken,

            locationId,

            storeId,

            customer:
            receivedCustomer = {},

            notes = "",

            items = [],

            guestExperience = null

        } = body;

        const guestSession = guestExperience?.slug
            ? await getGuestPublicSession(String(guestExperience.slug))
            : null;

        if (guestExperience?.slug && !guestSession) {
            return Response.json({ error: "La sesión de Mi Estadía no es válida" }, { status: 401 });
        }

        const receivedServiceMode =
            service_mode ||
            serviceMode;

        const normalizedServiceMode =
            receivedServiceMode === "dine_in"
                ? "table"
                : receivedServiceMode;

        /*
        =====================================
        NORMALIZAR CLIENTE
        =====================================
        */

        const customer =
            receivedCustomer &&
                typeof receivedCustomer === "object" &&
                !Array.isArray(receivedCustomer)
                ? receivedCustomer
                : {};

        const customerName =
            safe(
                customer.name
            );

        if (

            ![
                "table",
                "takeaway",
                "delivery"
            ].includes(
                normalizedServiceMode
            )

        ) {

            return Response.json(
                {
                    error:
                        "Modo de servicio inválido."
                },
                {
                    status: 400
                }
            );

        }

        if (
            !createSessionOnly &&
            (
                !Array.isArray(items) ||
                !items.length
            )
        ) {

            return Response.json(
                {
                    error:
                        "No hay productos."
                },
                {
                    status: 400
                }
            );

        }

        await conn.beginTransaction();

        let session =
            null;

        let orderRules = {};

        let sourceQrCodeId =
            null;

        /*
        =====================================
        TABLE
        reutiliza sesión existente
        =====================================
        */

        if (
            sessionToken
        ) {

            let sql = `
                SELECT *
                FROM tags_resto_sessions
                WHERE status IN (
                    'open',
                    'bill_requested'
                )
                AND COALESCE(
                    payment_status,
                    'pending'
                ) <> 'paid'
            `;

            const params = [
                sessionToken
            ];

            sql += `
                AND session_token=?
            `;

            if (sessionId) {

                sql += `
                    AND id=?
                `;

                params.push(
                    sessionId
                );

            }

            if (storeId) {

                sql += `
                    AND store_id=?
                `;

                params.push(
                    storeId
                );

            }

            sql += `
                LIMIT 1
            `;

            const [rows] =
                await conn.query(
                    sql,
                    params
                );

            session =
                rows[0];

            if (!session) {

                await conn.rollback();

                return Response.json(
                    {
                        error:
                            "La sesión no existe."
                    },
                    {
                        status: 404
                    }
                );

            }

        }

        /*
        =====================================
        CREAR NUEVA SESIÓN
        =====================================
        */

        else {

            let sessionStoreId =
                null;

            let sessionLocationId =
                null;

            /*
            =====================================
            TABLE
            =====================================
            */

            if (
                normalizedServiceMode === "table"
            ) {

                if (!locationId) {

                    await conn.rollback();

                    return Response.json(
                        {
                            error:
                                "locationId requerido."
                        },
                        {
                            status: 400
                        }
                    );

                }

                const [locationRows] =
                    await conn.query(
                        `
                        SELECT
                            l.*,
                            s.id AS store_id,
                            s.settings_json
                                AS store_settings_json
                        FROM tags_resto_locations l

                        INNER JOIN tags_stores s
                            ON s.id=l.store_id

                        WHERE l.id=?
                        LIMIT 1
                        `,
                        [
                            locationId
                        ]
                    );

                const location =
                    locationRows[0];

                if (!location) {

                    await conn.rollback();

                    return Response.json(
                        {
                            error:
                                "Ubicación inexistente."
                        },
                        {
                            status: 404
                        }
                    );

                }

                sessionStoreId =
                    location.store_id;

                sessionLocationId =
                    location.id;

                sourceQrCodeId =
                    location.qr_code_id ||
                    null;

                const tableSettings =
                    parseSettings(
                        location
                            .store_settings_json
                    );

                orderRules =
                    tableSettings
                        ?.resto_order_rules ||
                    {};

                const tableModeSetting =
                    tableSettings
                        ?.serviceModes
                        ?.table;

                const tableModeEnabled =
                    tableModeSetting ===
                        undefined
                        ? true
                        : settingEnabled(
                            tableModeSetting
                        );

                if (!tableModeEnabled) {

                    await conn.rollback();

                    return Response.json(
                        {
                            error:
                                "El consumo en el lugar no está habilitado."
                        },
                        {
                            status: 400
                        }
                    );

                }

                const [activeTableRows] =
                    await conn.query(
                        `
                        SELECT *
                        FROM tags_resto_sessions
                        WHERE location_id = ?
                        AND status IN (
                            'pending_activation',
                            'open',
                            'bill_requested'
                        )
                        LIMIT 1
                        FOR UPDATE
                        `,
                        [
                            location.id
                        ]
                    );

                if (activeTableRows.length) {

                    const activeTableSession =
                        activeTableRows[0];

                    if (
                        String(
                            activeTableSession
                                .customer_name ||
                            ""
                        )
                            .trim()
                            .toLowerCase() !==
                        String(
                            customerName
                        )
                            .trim()
                            .toLowerCase()
                    ) {

                        await conn.rollback();

                        return Response.json(
                            {
                                error:
                                    "La mesa está habilitada para otro cliente. Pedile ayuda al personal."
                            },
                            {
                                status: 409
                            }
                        );

                    }

                    session =
                        activeTableSession;

                }

            }

            /*
            =====================================
            TAKEAWAY / DELIVERY
            =====================================
            */

            else {

                if (!storeId) {

                    await conn.rollback();

                    return Response.json(
                        {
                            error:
                                "storeId requerido."
                        },
                        {
                            status: 400
                        }
                    );

                }

                const [storeRows] =
                    await conn.query(
                        `
                        SELECT
                            id,
                            business_id,
                            currency,
                            settings_json
                        FROM tags_stores
                        WHERE id=?
                        LIMIT 1
                        `,
                        [
                            storeId
                        ]
                    );

                if (!storeRows.length) {

                    await conn.rollback();

                    return Response.json(
                        {
                            error:
                                "Tienda inexistente."
                        },
                        {
                            status: 404
                        }
                    );

                }

                if (guestSession) {
                    if (Number(guestSession.business_id) !== Number(storeRows[0].business_id)) {
                        await conn.rollback();
                        return Response.json({ error: "La estadía no pertenece a este restaurante" }, { status: 403 });
                    }
                    const [integrations] = await conn.query("SELECT id,allow_room_charge FROM tags_guest_commerce_integrations WHERE guest_app_id=? AND module_type='resto' AND store_id=? AND is_active=1 LIMIT 1", [guestSession.id, storeId]);
                    if (!integrations[0]) {
                        await conn.rollback();
                        return Response.json({ error: "El restaurante no está habilitado en Mi Estadía" }, { status: 403 });
                    }
                    guestSession.commerce_integration = integrations[0];
                    guestSession.commerce_currency = storeRows[0].currency || "ARS";
                }

                const settings =
                    parseSettings(
                        storeRows[0]
                            .settings_json
                    );

                orderRules =
                    settings
                        ?.resto_order_rules ||
                    {};

                const modeEnabled =
                    normalizedServiceMode ===
                        "delivery"
                        ? (
                            settingEnabled(
                                settings
                                    ?.serviceModes
                                    ?.delivery
                            ) ||
                            settingEnabled(
                                settings
                                    ?.delivery
                                    ?.enabled
                            )
                        )
                        : (
                            settingEnabled(
                                settings
                                    ?.serviceModes
                                    ?.takeaway
                            ) ||
                            settingEnabled(
                                settings
                                    ?.takeaway
                                    ?.enabled
                            )
                        );

                if (!modeEnabled && !guestSession) {

                    await conn.rollback();

                    return Response.json(
                        {
                            error:
                                "La modalidad seleccionada no está habilitada."
                        },
                        {
                            status: 400
                        }
                    );

                }

                sessionStoreId =
                    storeId;

                sessionLocationId =
                    null;

            }

            if (
                !customerName &&
                !sessionToken &&
                orderRules
                    .require_customer_name !== false
            ) {
                await conn.rollback();
                return Response.json(
                    {
                        error:
                            "El nombre del cliente es requerido."
                    },
                    { status: 400 }
                );
            }

            if (!session) {

            const token =
                createToken();

            const initialStatus =
                normalizedServiceMode ===
                    "table"
                    ? (
                        orderRules
                            .table_requires_activation === false
                            ? "open"
                            : "pending_activation"
                    )
                    : (
                        orderRules
                            .online_requires_confirmation === false
                            ? "open"
                            : "pending_confirmation"
                    );

            const [result] =
                await conn.query(

                    `
                    INSERT INTO
                    tags_resto_sessions
                    (

                        store_id,

                        location_id,

                        source_qr_code_id,

                        session_token,

                        service_mode,

                        guests,

                        status,

                        customer_name,

                        customer_phone,

                        customer_email,

                        customer_address,

                        customer_zip,

                        notes,

                        subtotal,

                        discount_total,

                        total,

                        opened_at,

                        created_at,

                        updated_at

                    )

                    VALUES
                    (

                        ?,

                        ?,

                        ?,

                        ?,

                        ?,

                        1,

                        ?,

                        ?,

                        ?,

                        ?,

                        ?,

                        ?,

                        ?,

                        0,

                        0,

                        0,

                        NOW(),

                        NOW(),

                        NOW()

                    )
                    `,

                    [

                        sessionStoreId,

                        sessionLocationId,

                        sourceQrCodeId,

                        token,

                        normalizedServiceMode,

                        initialStatus,

                        customerName,

                        safe(
                            customer.phone
                        ),

                        safe(
                            customer.email
                        ),

                        safe(
                            customer.address
                        ),

                        safe(
                            customer.zip
                        ),

                        safe(notes)

                    ]

                );


            const orderNumber =
                `R-${String(
                    result.insertId
                ).padStart(
                    6,
                    "0"
                )}`;

            await conn.query(
                `
                    UPDATE tags_resto_sessions
                    SET
                        order_number = ?,
                        updated_at = NOW()
                    WHERE id = ?
                `,
                [
                    orderNumber,
                    result.insertId
                ]
            );

            const [rows] =
                await conn.query(

                    `
                    SELECT *
                    FROM tags_resto_sessions
                    WHERE id=?
                    LIMIT 1
                    `,

                    [
                        result.insertId
                    ]

                );

            session =
                rows[0];

            }

        }

        if (
            normalizedServiceMode !==
            session.service_mode
        ) {

            await conn.rollback();

            return Response.json(
                {
                    error:
                        "La modalidad no coincide con el pedido activo."
                },
                {
                    status: 409
                }
            );

        }

        let subtotal = 0;

        let discountTotal = 0;

        if (createSessionOnly) {

            await conn.commit();

            return Response.json({

                ok: true,

                session

            });

        }

        /*
        =====================================
        VALIDAR PRODUCTOS
        =====================================
        */

        for (const item of items) {

            const [productRows] =
                await conn.query(
                    `
                    SELECT *
                    FROM tags_store_products
                    WHERE id = ?
                    AND store_id = ?
                    AND is_visible = 1
                    LIMIT 1
                    `,
                    [
                        item.product_id,
                        session.store_id
                    ]
                );

            const product =
                productRows[0];

            if (!product) {

                await conn.rollback();

                return Response.json(
                    {
                        error:
                            `Producto inexistente (${item.product_id})`
                    },
                    {
                        status: 404
                    }
                );

            }

            if (
                !getRestoProductAvailability(
                    product
                ).isAvailable
            ) {
                await conn.rollback();

                return Response.json(
                    {
                        error:
                            `"${product.title}" está agotado por el momento`
                    },
                    {
                        status:
                            409
                    }
                );
            }

            let variant =
                null;

            if (
                item.variant_id
            ) {

                const [variantRows] =
                    await conn.query(
                        `
                        SELECT *
                        FROM tags_store_product_variants
                        WHERE id=?
                        AND product_id=?
                        LIMIT 1
                        `,
                        [
                            item.variant_id,
                            product.id
                        ]
                    );

                variant =
                    variantRows[0];

                if (!variant) {

                    await conn.rollback();

                    return Response.json(
                        {
                            error:
                                "Variante inexistente."
                        },
                        {
                            status: 404
                        }
                    );

                }

            }

            const quantity =
                Math.max(
                    1,
                    Math.trunc(
                        Number(
                            item.quantity ||
                            1
                        )
                    )
                );

            const unitPrice =
                money(
                    variant
                        ? (
                            variant.sale_price ??
                            variant.price
                        )
                        : (
                            product.sale_price ??
                            product.price
                        )
                );

            const totalPrice =
                money(
                    quantity *
                    unitPrice
                );

            const requiresPreparation =
                Number(
                    product.requires_preparation ||
                    0
                ) === 1
                    ? 1
                    : 0;

            const preparationStatus =
                requiresPreparation === 0 &&
                [
                    "open",
                    "bill_requested"
                ].includes(
                    session.status
                )
                    ? "ready"
                    : "pending";

            const optionsJson =
                JSON.stringify(
                    item.options ||
                    {}
                );

            const itemNotes =
                safe(
                    item.notes
                );

            /*
            =====================================
            BUSCAR FILA PENDIENTE COMPATIBLE
            =====================================

            Nunca se modifica una fila ya enviada
            a preparación. Si existe una fila pendiente
            idéntica, se acumula allí la nueva cantidad.
            */

            const [pendingRows] =
                await conn.query(
                    `
                    SELECT *
                    FROM tags_resto_session_items
                    WHERE session_id=?
                    AND product_id=?
                    AND variant_id <=> ?
                    AND requires_preparation=?
                    AND COALESCE(
                        preparation_status,
                        'pending'
                    )=?
                    AND COALESCE(
                        options_json,
                        '{}'
                    )=?
                    AND COALESCE(
                        notes,
                        ''
                    )=COALESCE(
                        ?,
                        ''
                    )
                    ORDER BY id ASC
                    LIMIT 1
                    FOR UPDATE
                    `,
                    [
                        session.id,
                        product.id,
                        safe(
                            variant?.id
                        ),
                        requiresPreparation,
                        preparationStatus,
                        optionsJson,
                        itemNotes
                    ]
                );

            const pendingItem =
                pendingRows[0] ||
                null;

            if (pendingItem) {

                const updatedQuantity =
                    Number(
                        pendingItem.quantity ||
                        0
                    ) +
                    quantity;

                const updatedTotalPrice =
                    money(
                        updatedQuantity *
                        Number(
                            pendingItem.unit_price ||
                            unitPrice
                        )
                    );

                await conn.query(
                    `
                    UPDATE tags_resto_session_items
                    SET
                        quantity=?,
                        total_price=?,
                        preparation_status=?,
                        preparation_sent_at=NULL
                    WHERE id=?
                    AND session_id=?
                    `,
                    [
                        updatedQuantity,
                        updatedTotalPrice,
                        preparationStatus,
                        pendingItem.id,
                        session.id
                    ]
                );

            } else {

                await conn.query(
                    `
                    INSERT INTO
                    tags_resto_session_items
                    (
                        session_id,
                        product_id,
                        variant_id,
                        title,
                        variant_title,
                        sku,
                        quantity,
                        unit_price,
                        total_price,
                        options_json,
                        notes,
                        requires_preparation,
                        preparation_status,
                        preparation_sent_at,
                        created_at
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        NULL,
                        NOW()
                    )
                    `,
                    [
                        session.id,
                        product.id,
                        safe(
                            variant?.id
                        ),
                        product.title,
                        safe(
                            variant?.title
                        ),
                        safe(
                            variant?.sku ??
                            product.sku
                        ),
                        quantity,
                        unitPrice,
                        totalPrice,
                        optionsJson,
                        itemNotes,
                        requiresPreparation,
                        preparationStatus

                    ]
                );

            }

        }
        /*
=====================================
RECALCULAR TOTALES DE LA SESIÓN
=====================================
*/

        const [totalRows] =
            await conn.query(
                `
                SELECT
                    COALESCE(
                        SUM(total_price),
                        0
                    ) AS subtotal
                FROM tags_resto_session_items
                WHERE session_id=?
                `,
                [
                    session.id
                ]
            );

        subtotal =
            money(
                totalRows[0].subtotal
            );

        discountTotal =
            Math.min(
                subtotal,
                money(
                    session.discount_total
                )
            );

        const total =
            money(
                subtotal -
                discountTotal
            );

        /*
        =====================================
        CONSERVAR DATOS EXISTENTES
        =====================================
        */

        await conn.query(

            `
            UPDATE
                tags_resto_sessions
            SET

                customer_name=?,

                customer_phone=?,

                customer_email=?,

                customer_address=?,

                customer_zip=?,

                notes=?,

                subtotal=?,

                discount_total=?,

                total=?,

                updated_at=NOW()

            WHERE id=?
            `,

            [

                safe(customer.name)
                ?? session.customer_name,

                safe(customer.phone)
                ?? session.customer_phone,

                safe(customer.email)
                ?? session.customer_email,

                safe(customer.address)
                ?? session.customer_address,

                safe(customer.zip)
                ?? session.customer_zip,

                safe(notes)
                ?? session.notes,

                subtotal,

                discountTotal,

                total,

                session.id

            ]

        );

        if (guestSession) {
            const chargeToStay = Boolean(guestExperience?.chargeToStay && Number(guestSession.commerce_integration.allow_room_charge));
            let accountEntryId = null;
            if (chargeToStay) {
                const [accounts] = await conn.query("SELECT id,currency FROM tags_guest_accounts WHERE guest_app_id=? AND stay_id=? LIMIT 1", [guestSession.id,guestSession.stay_id]);
                if (!accounts[0]) throw Object.assign(new Error("La cuenta de la estadía no está disponible"),{status:409});
                const [entry] = await conn.query("INSERT INTO tags_guest_account_entries(account_id,entry_type,source_type,source_id,idempotency_key,description,quantity,unit_amount,total_amount,currency,status,created_by_type) VALUES(?,'charge','resto',?,?,?,1,?,?,?,'confirmed','guest')",[accounts[0].id,String(session.id),`resto:${session.id}`,`Gastronomía · Pedido #${session.id}`,total,total,guestSession.commerce_currency||accounts[0].currency||"ARS"]);
                accountEntryId=entry.insertId;
            }
            await conn.query("INSERT INTO tags_guest_commerce_orders(guest_app_id,stay_id,guest_id,module_type,store_id,external_session_id,account_entry_id,fulfillment_mode,charge_to_stay,total_amount,currency,status) VALUES(?,?,?,'resto',?,?,?,'room_delivery',?,?,?,'created')",[guestSession.id,guestSession.stay_id,guestSession.guest_id,session.store_id,session.id,accountEntryId,chargeToStay?1:0,total,guestSession.commerce_currency||"ARS"]);
        }

        await conn.commit();

        const [itemsRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_resto_session_items
                WHERE session_id = ?
                ORDER BY id ASC
                `,
                [
                    session.id
                ]
            );

        const [sessionRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_resto_sessions
                WHERE id = ?
                LIMIT 1
                `,
                [
                    session.id
                ]
            );

        return Response.json({

            ok: true,

            session:
                sessionRows[0],

            items:
                itemsRows,

            totals: {

                subtotal,

                discountTotal,

                total

            }

        });

    } catch (err) {

        try {

            await conn.rollback();

        } catch {

            // Puede no existir una transacción activa.

        }

        console.error(

            "RESTO PUBLIC ORDER CREATE ERROR:",

            err

        );

        return Response.json(

            {

                error:
                    err.message ||
                    "Error creando el pedido."

            },

            {

                status:
                    err.status ||
                    500

            }

        );

    } finally {

        conn.release();

    }

}

function parseSettings(value) {

    if (
        value &&
        typeof value === "object"
    ) {

        return value;

    }

    try {

        return JSON.parse(
            value || "{}"
        );

    } catch {

        return {};

    }

}

function settingEnabled(value) {

    return (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true"
    );

}
