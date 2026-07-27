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

    const [welcomeOpen, setWelcomeOpen] =
        useState(false);
    const [recoverOpen, setRecoverOpen] = useState(false);
    const [recoverOrderNumber, setRecoverOrderNumber] = useState("");
    const [recoverContact, setRecoverContact] = useState("");
    const [recoverError, setRecoverError] = useState("");
    const [recovering, setRecovering] = useState(false);

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

                if (
                    product.is_available ===
                    false
                ) {
                    showAlert({
                        icon:
                            "warning",
                        title:
                            "Producto agotado",
                        text:
                            "Este producto no está disponible por el momento."
                    });

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

        if (cartCount > 0) {

            setCartOpen(
                true
            );

            return;

        }

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

        setWelcomeOpen(
            true
        );

    }

    function handleStartOrder() {

        setWelcomeOpen(
            false
        );

        const menuSection =
            document.querySelector(
                '[data-section-type="categories"], ' +
                '[data-section-type="products"], ' +
                '[data-section-type="menu"]'
            );

        if (menuSection) {

            menuSection.scrollIntoView({
                behavior:
                    "smooth",

                block:
                    "start"
            });

            return;

        }

        window.dispatchEvent(
            new CustomEvent(
                "resto:view-menu"
            )
        );

    }

    async function recoverOrder(event) {
        event.preventDefault();
        setRecovering(true); setRecoverError("");
        try {
            const response = await fetch("/api/resto/public/orders/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: restoSlug, orderNumber: recoverOrderNumber, contact: recoverContact }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "No se pudo recuperar el pedido.");
            window.location.href = `/p/${restoSlug}/order/${data.sessionToken}`;
        } catch (error) { setRecoverError(error.message); }
        finally { setRecovering(false); }
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

            {
                welcomeOpen && (

                    <div
                        className="resto_order_welcome_backdrop"
                        role="presentation"
                        onMouseDown={
                            event => {
                                if (
                                    event.target ===
                                    event.currentTarget
                                ) {
                                    setWelcomeOpen(false);
                                }
                            }
                        }
                    >

                        <section
                            className="resto_order_welcome"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="resto-order-welcome-title"
                        >

                            <button
                                type="button"
                                className="resto_order_welcome_close"
                                aria-label="Cerrar"
                                onClick={() => setWelcomeOpen(false)}
                            >
                                ×
                            </button>

                            <span
                                className="resto_order_welcome_icon"
                                aria-hidden="true"
                            >
                                🍽️
                            </span>

                            <h2 id="resto-order-welcome-title">
                                ¡Bienvenido!
                            </h2>

                            <p>
                                Ya podés iniciar tu pedido agregando
                                productos de nuestra carta.
                            </p>

                            <button
                                type="button"
                                className="resto_order_welcome_action"
                                onClick={handleStartOrder}
                            >
                                Ver la carta
                            </button>

                            <button type="button" className="resto_order_recover_link" onClick={() => { setWelcomeOpen(false); setRecoverOpen(true); }}>
                                ¿Ya tenés un pedido? Recuperarlo
                            </button>

                        </section>

                    </div>

                )
            }

            {recoverOpen && (
                <div className="resto_order_welcome_backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setRecoverOpen(false)}>
                    <section className="resto_order_welcome" role="dialog" aria-modal="true">
                        <button type="button" className="resto_order_welcome_close" aria-label="Cerrar" onClick={() => setRecoverOpen(false)}>×</button>
                        <h2>Recuperar pedido</h2>
                        <p>Ingresá el número de pedido y el email o teléfono usado al realizarlo.</p>
                        <form onSubmit={recoverOrder} className="resto_order_recover_form">
                            <input value={recoverOrderNumber} onChange={event => setRecoverOrderNumber(event.target.value)} placeholder="Número de pedido" required />
                            <input value={recoverContact} onChange={event => setRecoverContact(event.target.value)} placeholder="Email o teléfono" required />
                            {recoverError && <p className="resto_order_welcome_error">{recoverError}</p>}
                            <button type="submit" className="resto_order_welcome_action" disabled={recovering}>{recovering ? "Buscando..." : "Recuperar pedido"}</button>
                        </form>
                    </section>
                </div>
            )}

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
                onRecoverOrder={() => { setCartOpen(false); setRecoverOpen(true); }}
            />

        </>
    );

}
