// =====================================
// FILE: app/modules/resto/lib/restoCart.js
// Descripción:
// Helpers del carrito público de Tags Resto.
//
// Mantiene:
// - el carrito temporal previo a enviar productos;
// - la sesión activa persistida por restaurante;
// - eventos de actualización independientes.
//
// El pedido confirmado continúa viviendo en
// tags_resto_sessions y tags_resto_session_items.
// =====================================

const CART_KEY =
    "tags_resto_cart";

const CART_UPDATED_EVENT =
    "tags_resto_cart_updated";

const ACTIVE_SESSION_KEY =
    "tags_resto_active_sessions";

const ACTIVE_SESSION_UPDATED_EVENT =
    "tags_resto_active_session_updated";

/*
=====================================
UTILIDADES DE NAVEGADOR
=====================================
*/

function canUseBrowserStorage() {

    return (
        typeof window !== "undefined" &&
        typeof window.localStorage !== "undefined"
    );

}

function parseStoredJSON(
    value,
    fallback
) {

    try {

        return JSON.parse(
            value
        );

    } catch {

        return fallback;

    }

}

/*
=====================================
CARRITO TEMPORAL
=====================================
*/

function getBrowserCart() {

    if (!canUseBrowserStorage()) {

        return [];

    }

    const storedValue =
        localStorage.getItem(
            CART_KEY
        );

    if (!storedValue) {

        return [];

    }

    const parsed =
        parseStoredJSON(
            storedValue,
            []
        );

    return Array.isArray(parsed)
        ? parsed
        : [];

}

function saveBrowserCart(items) {

    if (!canUseBrowserStorage()) {

        return;

    }

    const safeItems =
        Array.isArray(items)
            ? items
            : [];

    localStorage.setItem(
        CART_KEY,
        JSON.stringify(
            safeItems
        )
    );

    window.dispatchEvent(
        new CustomEvent(
            CART_UPDATED_EVENT,
            {
                detail: {
                    items:
                        safeItems
                }
            }
        )
    );

}

function normalizeNotes(notes) {

    return String(
        notes || ""
    ).trim();

}

function normalizeVariantId(
    variantId
) {

    if (
        variantId === undefined ||
        variantId === null ||
        variantId === ""
    ) {

        return "";

    }

    return String(
        variantId
    );

}

export function getCartItems() {

    return getBrowserCart();

}

export function setCartItems(items) {

    saveBrowserCart(
        items
    );

}

export function clearCart() {

    saveBrowserCart(
        []
    );

}

export function getCartCount(
    items = null
) {

    const cartItems =
        Array.isArray(items)
            ? items
            : getBrowserCart();

    return cartItems.reduce(
        (
            total,
            item
        ) =>
            total +
            Number(
                item?.quantity ||
                0
            ),
        0
    );

}

export function getCartTotal(
    items = null
) {

    const cartItems =
        Array.isArray(items)
            ? items
            : getBrowserCart();

    return cartItems.reduce(
        (
            total,
            item
        ) =>
            total +
            Number(
                item?.total_price ||
                0
            ),
        0
    );

}

export function addCartItem(item) {

    if (
        !item ||
        !item.product_id
    ) {

        return getBrowserCart();

    }

    const cart =
        getBrowserCart();

    const itemNotes =
        normalizeNotes(
            item.notes
        );

    const itemVariantId =
        normalizeVariantId(
            item.variant_id
        );

    const existingIndex =
        cart.findIndex(
            cartItem =>

                Number(
                    cartItem?.product_id
                ) ===
                Number(
                    item.product_id
                ) &&

                normalizeVariantId(
                    cartItem?.variant_id
                ) ===
                itemVariantId &&

                normalizeNotes(
                    cartItem?.notes
                ) ===
                itemNotes
        );

    const quantity =
        Math.max(
            1,
            Number(
                item.quantity ||
                1
            )
        );

    const unitPrice =
        Number(
            item.unit_price ||
            0
        );

    if (
        existingIndex >= 0
    ) {

        const previousQuantity =
            Number(
                cart[
                    existingIndex
                ]?.quantity ||
                0
            );

        const nextQuantity =
            previousQuantity +
            quantity;

        cart[
            existingIndex
        ] = {

            ...cart[
                existingIndex
            ],

            ...item,

            variant_id:
                item.variant_id ??
                null,

            quantity:
                nextQuantity,

            unit_price:
                unitPrice,

            total_price:
                nextQuantity *
                unitPrice,

            notes:
                itemNotes

        };

    } else {

        cart.push({

            ...item,

            key:
                item.key ||
                [
                    item.product_id,
                    itemVariantId ||
                    "base",
                    Date.now()
                ].join("-"),

            variant_id:
                item.variant_id ??
                null,

            quantity,

            unit_price:
                unitPrice,

            total_price:
                quantity *
                unitPrice,

            notes:
                itemNotes

        });

    }

    saveBrowserCart(
        cart
    );

    return cart;

}

export function updateCartItemQuantity(
    index,
    quantity
) {

    const cart =
        getBrowserCart();

    if (
        !cart[
            index
        ]
    ) {

        return cart;

    }

    const nextQuantity =
        Math.max(
            1,
            Number(
                quantity ||
                1
            )
        );

    const unitPrice =
        Number(
            cart[
                index
            ]?.unit_price ||
            0
        );

    cart[
        index
    ] = {

        ...cart[
            index
        ],

        quantity:
            nextQuantity,

        total_price:
            nextQuantity *
            unitPrice

    };

    saveBrowserCart(
        cart
    );

    return cart;

}

export function updateCartItemNotes(
    index,
    notes
) {

    const cart =
        getBrowserCart();

    if (
        !cart[
            index
        ]
    ) {

        return cart;

    }

    cart[
        index
    ] = {

        ...cart[
            index
        ],

        notes:
            normalizeNotes(
                notes
            )

    };

    saveBrowserCart(
        cart
    );

    return cart;

}

export function removeCartItem(index) {

    const cart =
        getBrowserCart()
            .filter(
                (
                    _,
                    itemIndex
                ) =>
                    itemIndex !==
                    index
            );

    saveBrowserCart(
        cart
    );

    return cart;

}

/*
=====================================
SESIONES ACTIVAS
=====================================

Se guarda una sesión por slug de restaurante.

Ejemplo:

{
    "mi-resto": {
        "sessionToken": "...",
        "sessionId": 12,
        "storeId": 3,
        "locationId": 8,
        "serviceMode": "table",
        "updatedAt": 123456789
    }
}
=====================================
*/

function normalizeSlug(slug) {

    return String(
        slug ||
        ""
    )
        .trim()
        .toLowerCase();

}

function getStoredSessions() {

    if (!canUseBrowserStorage()) {

        return {};

    }

    const storedValue =
        localStorage.getItem(
            ACTIVE_SESSION_KEY
        );

    if (!storedValue) {

        return {};

    }

    const parsed =
        parseStoredJSON(
            storedValue,
            {}
        );

    if (
        !parsed ||
        Array.isArray(parsed) ||
        typeof parsed !== "object"
    ) {

        return {};

    }

    return parsed;

}

function saveStoredSessions(
    sessions
) {

    if (!canUseBrowserStorage()) {

        return;

    }

    const safeSessions =
        sessions &&
        !Array.isArray(
            sessions
        ) &&
        typeof sessions ===
            "object"
            ? sessions
            : {};

    localStorage.setItem(
        ACTIVE_SESSION_KEY,
        JSON.stringify(
            safeSessions
        )
    );

    window.dispatchEvent(
        new CustomEvent(
            ACTIVE_SESSION_UPDATED_EVENT,
            {
                detail: {
                    sessions:
                        safeSessions
                }
            }
        )
    );

}

export function getActiveRestoSession(
    slug
) {

    const normalizedSlug =
        normalizeSlug(
            slug
        );

    if (!normalizedSlug) {

        return null;

    }

    const sessions =
        getStoredSessions();

    const activeSession =
        sessions[
            normalizedSlug
        ];

    if (
        !activeSession ||
        !activeSession.sessionToken
    ) {

        return null;

    }

    return activeSession;

}

export function setActiveRestoSession(
    slug,
    session
) {

    const normalizedSlug =
        normalizeSlug(
            slug
        );

    const sessionToken =
        session?.sessionToken ||
        session?.session_token;

    if (
        !normalizedSlug ||
        !sessionToken
    ) {

        return null;

    }

    const sessions =
        getStoredSessions();

    const activeSession = {

        sessionToken,

        sessionId:
            session?.sessionId ??
            session?.session_id ??
            session?.id ??
            null,

        storeId:
            session?.storeId ??
            session?.store_id ??
            null,

        locationId:
            session?.locationId ??
            session?.location_id ??
            null,

        sourceQrCodeId:
            session?.sourceQrCodeId ??
            session?.source_qr_code_id ??
            null,

        qrCode:
            session?.qrCode ??
            session?.qr_code ??
            null,

        qrLabel:
            session?.qrLabel ??
            session?.qr_label ??
            null,

        serviceMode:
            session?.serviceMode ??
            session?.service_mode ??
            null,

        status:
            session?.status ??
            "open",

        updatedAt:
            Date.now()

    };

    sessions[
        normalizedSlug
    ] =
        activeSession;

    saveStoredSessions(
        sessions
    );

    return activeSession;

}

export function clearActiveRestoSession(
    slug
) {

    const normalizedSlug =
        normalizeSlug(
            slug
        );

    if (!normalizedSlug) {

        return;

    }

    const sessions =
        getStoredSessions();

    if (
        !sessions[
            normalizedSlug
        ]
    ) {

        return;

    }

    delete sessions[
        normalizedSlug
    ];

    saveStoredSessions(
        sessions
    );

}

export function clearAllActiveRestoSessions() {

    saveStoredSessions(
        {}
    );

}

export function getActiveRestoSessionToken(
    slug
) {

    return (
        getActiveRestoSession(
            slug
        )?.sessionToken ||
        null
    );

}

export {
    CART_UPDATED_EVENT,
    ACTIVE_SESSION_UPDATED_EVENT
};