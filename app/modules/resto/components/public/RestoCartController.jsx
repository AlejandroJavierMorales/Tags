// =====================================
// Archivo:
// /app/modules/resto/components/public/RestoCartController.jsx
//
// Descripción:
// Controlador cliente del carrito público
// de Tags Resto.
//
// Escucha los eventos emitidos por la carta,
// agrega productos al carrito, actualiza el
// contador y controla el Drawer.
//
// También recupera la sesión activa del
// restaurante y permite acceder al pedido.
//
// Contexto:
// resto
// =====================================

"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState
}
    from "react";



import "../../styles/restoCartController.css";

import {
    ACTIVE_SESSION_UPDATED_EVENT,
    addCartItem,
    getActiveRestoSession,
    getCartItems,
    setActiveRestoSession,
    ensureAttention
}
    from "../../lib/restoCart";
import RestoCartDrawer from "./RestoCartDrawer";

export default function RestoCartController({
    resto,
    session = null,
    location = null,
    themeCssVars
}) {

    const [cartOpen, setCartOpen] =
        useState(false);

    const [cartCount, setCartCount] =
        useState(0);

    const [
        activeSession,
        setActiveSession
    ] =
        useState(null);

    const restoSlug =
        resto?.slug ||
        "";

    /*
    =====================================
    RECARGAR CONTADOR DEL CARRITO
    =====================================
    */

    const reloadCartCount =
        useCallback(
            () => {

                const cart =
                    getCartItems();

                const count =
                    cart.reduce(
                        (
                            total,
                            item
                        ) =>
                            total +
                            Number(
                                item.quantity ||
                                0
                            ),
                        0
                    );

                setCartCount(
                    count
                );

            },
            []
        );

    /*
    =====================================
    SINCRONIZAR SESIÓN ACTIVA
    =====================================
    */

    const reloadActiveSession =
        useCallback(
            () => {

                if (!restoSlug) {

                    setActiveSession(
                        null
                    );

                    return;

                }

                const storedSession =
                    getActiveRestoSession(
                        restoSlug
                    );

                setActiveSession(
                    storedSession
                );

            },
            [
                restoSlug
            ]
        );

    /*
    =====================================
    PERSISTIR SESIÓN RECIBIDA DEL SERVIDOR
    =====================================
    */

    useEffect(
        () => {

            if (
                !restoSlug ||
                !session
            ) {

                reloadActiveSession();

                return;

            }

            const sessionToken =
                session.sessionToken ||
                session.session_token;

            const sessionStatus =
                session.status ||
                "open";

            if (
                !sessionToken ||
                (
                    sessionStatus !== "open" &&
                    sessionStatus !== "bill_requested" &&
                    sessionStatus !== "pending_activation" &&
                    sessionStatus !== "pending_confirmation"
                )
            ) {

                reloadActiveSession();

                return;

            }

            const persistedSession =
                setActiveRestoSession(
                    restoSlug,
                    session
                );

            setActiveSession(
                persistedSession
            );

        },
        [
            restoSlug,
            session,
            reloadActiveSession
        ]
    );

    /*
    =====================================
    EVENTOS PÚBLICOS
    =====================================
    */

    useEffect(
        () => {

            reloadCartCount();

            reloadActiveSession();

            async function handleAddProduct(
                event
            ) {

                const product =
                    event?.detail?.product;

                if (!product) {
                    return;
                }

                /*
                Si tiene variantes debe ingresar
                al detalle para seleccionarlas.
                */

                if (
                    Number(
                        product.variants_count ||
                        0
                    ) > 0
                ) {

                    window.location.href =
                        `/p/${restoSlug}/products/${product.id}`;

                    return;

                }

                const unitPrice =
                    Number(
                        product.sale_price ||
                        product.price ||
                        0
                    );

                addCartItem({

                    product_id:
                        product.id,

                    variant_id:
                        null,

                    product_title:
                        product.title,

                    title:
                        product.title,

                    variant_title:
                        null,

                    image_url:
                        product.primary_image_url ||
                        product.image_url ||
                        null,

                    quantity:
                        1,

                    unit_price:
                        unitPrice,

                    total_price:
                        unitPrice,

                    currency:
                        product.currency ||
                        resto?.currency ||
                        "ARS",

                    available_stock:
                        product.stock_qty ??
                        null,

                    notes:
                        "",

                    options:
                        null

                });

                reloadCartCount();

                setCartOpen(
                    true
                );

            }

            function handleCartUpdated() {

                reloadCartCount();

            }

            function handleActiveSessionUpdated() {

                reloadActiveSession();

            }

            function handleOpenCart() {

                setCartOpen(
                    true
                );

            }

            window.addEventListener(
                "resto:add-product",
                handleAddProduct
            );

            window.addEventListener(
                "tags_resto_cart_updated",
                handleCartUpdated
            );

            window.addEventListener(
                ACTIVE_SESSION_UPDATED_EVENT,
                handleActiveSessionUpdated
            );

            window.addEventListener(
                "resto:open-cart",
                handleOpenCart
            );

            return () => {

                window.removeEventListener(
                    "resto:add-product",
                    handleAddProduct
                );

                window.removeEventListener(
                    "tags_resto_cart_updated",
                    handleCartUpdated
                );

                window.removeEventListener(
                    ACTIVE_SESSION_UPDATED_EVENT,
                    handleActiveSessionUpdated
                );

                window.removeEventListener(
                    "resto:open-cart",
                    handleOpenCart
                );

            };

        },
        [
            reloadCartCount,
            reloadActiveSession,
            restoSlug,
            resto?.currency
        ]
    );

    /*
    =====================================
    SESIÓN UTILIZABLE
    =====================================
    */

    const currentSession =
        useMemo(
            () => {

                const serverStatus =
                    session?.status;

                if (
                    session &&
                    (
                        serverStatus === "open" ||
                        serverStatus === "bill_requested" ||
                        serverStatus === "pending_activation" ||
                        serverStatus === "pending_confirmation"
                    )
                ) {

                    return session;

                }

                return activeSession;

            },
            [
                session,
                activeSession
            ]
        );

    const activeSessionToken =
        currentSession?.sessionToken ||
        currentSession?.session_token ||
        null;

    const hasActiveOrder =
        Boolean(
            activeSessionToken
        );

    /*
    =====================================
    ABRIR CARRITO O PEDIDO
    =====================================
    */

    async function handleFloatingButtonClick() {

        /*
        Si ya hay una sesión activa, abre
        la pantalla del pedido actual.
        */

        if (
            hasActiveOrder &&
            restoSlug
        ) {

            window.location.href =
                `/p/${restoSlug}/order/${activeSessionToken}`;

            return;

        }

        setCartOpen(
            true
        );

    }

    /*
    =====================================
    PEDIDO CREADO O ACTUALIZADO
    =====================================
    */

    function handleOrderCreated(
        data
    ) {

        const sessionData =
            data?.session ||
            data ||
            null;

        const sessionToken =
            data?.sessionToken ||
            data?.session_token ||
            data?.session?.sessionToken ||
            data?.session?.session_token;

        if (!sessionToken) {
            return;
        }

        const persistedSession =
            setActiveRestoSession(
                restoSlug,
                {
                    ...sessionData,

                    sessionToken,

                    status:
                        sessionData?.status ||
                        "open",

                    storeId:
                        sessionData?.storeId ??
                        sessionData?.store_id ??
                        resto?.id ??
                        null,

                    locationId:
                        sessionData?.locationId ??
                        sessionData?.location_id ??
                        location?.id ??
                        null
                }
            );

        setActiveSession(
            persistedSession
        );

        window.location.href =
            `/p/${restoSlug}/order/${sessionToken}`;

    }

    const sessionNumber =
        currentSession?.sessionId ??
        currentSession?.session_id ??
        currentSession?.id ??
        null;

    const sessionLocationLabel =
        location?.name ||
        location?.label ||
        currentSession?.location_name ||
        currentSession?.qrLabel ||
        currentSession?.qr_label ||
        null;

    const sessionQrCode =
        currentSession?.qrCode ||
        currentSession?.qr_code ||
        null;

    /*
    =====================================
    UI
    =====================================
    */

    return (
        <>

            <button
                type="button"
                className={
                    [
                        "resto_cart_floating_button",
                        hasActiveOrder
                            ? "has_active_order"
                            : "",
                        cartCount > 0
                            ? "has_cart_items"
                            : ""
                    ]
                        .filter(Boolean)
                        .join(" ")
                }
                onClick={
                    handleFloatingButtonClick
                }
                aria-label={
                    hasActiveOrder
                        ? "Abrir mi pedido"
                        : "Hacer pedido"
                }
                title={
                    hasActiveOrder
                        ? "Abrir mi pedido"
                        : "Hacer pedido"
                }
            >

                <span
                    className="resto_cart_floating_icon"
                    aria-hidden="true"
                >
                    {
                        hasActiveOrder
                            ? "🧾"
                            : "🛒"
                    }
                </span>

                <span className="resto_cart_floating_content">

                    <strong className="resto_cart_floating_title">
                        {
                            hasActiveOrder
                                ? "Mi pedido"
                                : "Hacer pedido"
                        }
                    </strong>

                    {hasActiveOrder && (

                        <span className="resto_cart_floating_details">

                            {sessionNumber && (
                                <span>
                                    Pedido #{sessionNumber}
                                </span>
                            )}

                            {sessionLocationLabel && (
                                <span>
                                    {sessionLocationLabel}
                                </span>
                            )}

                            {sessionQrCode && (
                                <span>
                                    QR {sessionQrCode}
                                </span>
                            )}

                        </span>

                    )}

                </span>

                {cartCount > 0 && (

                    <span className="resto_cart_floating_count">
                        {cartCount}
                    </span>

                )}

            </button>

            <RestoCartDrawer
                show={cartOpen}
                onHide={
                    () =>
                        setCartOpen(false)
                }
                session={currentSession}
                location={location}
                store={resto}
                onOrderCreated={
                    handleOrderCreated
                }
                themeCssVars={
                    themeCssVars
                }
            />

        </>
    );

}
