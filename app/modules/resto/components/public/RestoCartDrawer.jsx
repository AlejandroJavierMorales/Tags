// =====================================
// FILE: app/modules/resto/components/public/RestoCartDrawer.jsx
// Descripción:
// Drawer del carrito público de Tags Resto.
//
// Permite confirmar pedidos para:
// - consumo en mesa;
// - retiro en el local;
// - envío a domicilio.
//
// Recupera y persiste la sesión activa del
// restaurante para continuar agregando productos
// sobre el mismo pedido.
// =====================================

"use client";

import {
    useEffect,
    useMemo,
    useState
}
    from "react";

import Swal
    from "sweetalert2";

import {
    Offcanvas,
    Button,
    Form
}
    from "react-bootstrap";

import {
    getCartItems,
    clearCart,
    updateCartItemQuantity,
    removeCartItem,
    getCartTotal,
    getActiveRestoSession,
    setActiveRestoSession
}
    from "@/app/modules/resto/lib/restoCart";

import "../../styles/restoCartDrawer.css";

const SERVICE_MODE_DINE_IN =
    "dine_in";

const SERVICE_MODE_TAKEAWAY =
    "takeaway";

const SERVICE_MODE_DELIVERY =
    "delivery";

function settingEnabled(value) {

    return (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true"
    );

}

function getStoreSlug(store) {

    return (
        store?.slug ||
        store?.page_slug ||
        ""
    );

}

function normalizeServiceMode(
    value
) {

    if (
        value === "table" ||
        value === SERVICE_MODE_DINE_IN
    ) {

        return SERVICE_MODE_DINE_IN;

    }

    if (
        value === SERVICE_MODE_DELIVERY
    ) {

        return SERVICE_MODE_DELIVERY;

    }

    return SERVICE_MODE_TAKEAWAY;

}

function getApiServiceMode(
    serviceMode
) {

    /*
    Compatibilidad con la API existente.

    Hasta actualizar la API, el consumo
    en mesa continúa enviándose como "table".
    */

    return serviceMode ===
        SERVICE_MODE_DINE_IN
        ? "table"
        : serviceMode;

}

function getSessionToken(
    value
) {

    return (
        value?.sessionToken ||
        value?.session_token ||
        value?.session?.sessionToken ||
        value?.session?.session_token ||
        null
    );

}

function getSessionId(
    value
) {

    return (
        value?.sessionId ??
        value?.session_id ??
        value?.session?.sessionId ??
        value?.session?.session_id ??
        value?.session?.id ??
        value?.id ??
        null
    );

}

export default function RestoCartDrawer({

    show,

    onHide,

    session,

    location,

    store,

    onOrderCreated,

    themeCssVars = {},
    onRecoverOrder

}) {

    const storeSlug =
        getStoreSlug(
            store
        );

    const restaurantName =
        store?.name ||
        store?.title ||
        "Tags Resto";

    const restaurantLogo =
        store?.logo_url ||
        store?.logo ||
        null;

    const tableEnabled =
        store?.serviceModes?.table ===
            undefined
            ? true
            : settingEnabled(
                store?.serviceModes?.table
            );

    const takeawayEnabled =
        settingEnabled(
            store?.serviceModes?.takeaway
        ) ||
        settingEnabled(
            store?.takeaway?.enabled
        );

    const deliveryEnabled =
        settingEnabled(
            store?.serviceModes?.delivery
        ) ||
        settingEnabled(
            store?.delivery?.enabled
        );

    const initialServiceMode =
        session?.service_mode ||
        session?.serviceMode
            ? normalizeServiceMode(
                session?.service_mode ||
                session?.serviceMode
            )
            : location &&
                tableEnabled
                ? SERVICE_MODE_DINE_IN
                : takeawayEnabled
                    ? SERVICE_MODE_TAKEAWAY
                    : SERVICE_MODE_DELIVERY;

    const [cart, setCart] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    const [
        hydratedSessionToken,
        setHydratedSessionToken
    ] =
        useState(null);

    const [notes, setNotes] =
        useState("");

    const [activeSession, setActiveSession] =
        useState(
            session ||
            null
        );

    const [serviceMode, setServiceMode] =
        useState(
            initialServiceMode
        );

    const accessFromTable =
        serviceMode ===
        SERVICE_MODE_DINE_IN;

    const [customer, setCustomer] =
        useState({

            name: "",

            phone: "",

            email: "",

            address: "",

            zip: ""

        });

    const customerName =
        String(
            customer?.name ||
            activeSession?.customer_name ||
            activeSession?.customerName ||
            ""
        ).trim();

    useEffect(
        () => {

            const source =
                activeSession ||
                session;

            if (!source) {

                return;

            }

            setCustomer(
                previous => ({
                    name:
                        source.customer_name ??
                        source.customerName ??
                        previous.name,

                    phone:
                        source.customer_phone ??
                        source.customerPhone ??
                        previous.phone,

                    email:
                        source.customer_email ??
                        source.customerEmail ??
                        previous.email,

                    address:
                        source.customer_address ??
                        source.customerAddress ??
                        previous.address,

                    zip:
                        source.customer_zip ??
                        source.customerZip ??
                        previous.zip
                })
            );

        },
        [
            activeSession,
            session
        ]
    );

    /*
    =====================================
    HIDRATAR DATOS DEL PEDIDO ACTIVO
    =====================================
    */

    useEffect(
        () => {

            const sessionToken =
                getSessionToken(
                    activeSession
                );

            if (
                !show ||
                !storeSlug ||
                !sessionToken ||
                hydratedSessionToken ===
                    sessionToken
            ) {

                return;

            }

            const controller =
                new AbortController();

            async function hydrateSession() {

                try {

                    const response =
                        await fetch(
                            "/api/resto/public/orders/get",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                body: JSON.stringify({
                                    sessionToken
                                }),
                                signal:
                                    controller.signal
                            }
                        );

                    const data =
                        await response
                            .json()
                            .catch(() => ({}));

                    if (
                        !response.ok ||
                        !data?.session
                    ) {

                        return;

                    }

                    setHydratedSessionToken(
                        sessionToken
                    );

                    const hydratedSession = {
                        ...activeSession,
                        ...data.session,
                        sessionToken,
                        sessionId:
                            data.session.id ??
                            getSessionId(
                                activeSession
                            ),
                        storeId:
                            data.session.store_id ??
                            activeSession?.storeId ??
                            store?.id ??
                            null,
                        locationId:
                            data.session.location_id ??
                            activeSession?.locationId ??
                            null,
                        serviceMode:
                            normalizeServiceMode(
                                data.session.service_mode ??
                                activeSession?.serviceMode
                            )
                    };

                    const storedSession =
                        setActiveRestoSession(
                            storeSlug,
                            hydratedSession
                        );

                    setActiveSession(
                        storedSession ||
                        hydratedSession
                    );

                } catch (error) {

                    if (
                        error?.name !==
                        "AbortError"
                    ) {

                        console.error(
                            "RESTO CART SESSION HYDRATION ERROR:",
                            error
                        );

                    }

                }

            }

            hydrateSession();

            return () => {

                controller.abort();

            };

        },
        [
            show,
            storeSlug,
            store?.id,
            activeSession,
            hydratedSessionToken
        ]
    );

    /*
    =====================================
    CARGAR CARRITO
    =====================================
    */

    function reloadCart() {

        setCart(
            getCartItems()
        );

    }

    useEffect(
        () => {

            reloadCart();

            window.addEventListener(
                "tags_resto_cart_updated",
                reloadCart
            );

            return () => {

                window.removeEventListener(
                    "tags_resto_cart_updated",
                    reloadCart
                );

            };

        },
        []
    );

    /*
    =====================================
    RECUPERAR SESIÓN ACTIVA
    =====================================
    */

    useEffect(
        () => {

            if (!storeSlug) {

                return;

            }

            if (session) {

                const normalizedMode =
                    normalizeServiceMode(
                        session?.service_mode ||
                        session?.serviceMode ||
                        (
                            location
                                ? SERVICE_MODE_DINE_IN
                                : null
                        )
                    );

                const sessionToStore = {

                    ...session,

                    storeId:
                        session?.store_id ??
                        session?.storeId ??
                        store?.id ??
                        null,

                    locationId:
                        session?.location_id ??
                        session?.locationId ??
                        location?.id ??
                        null,

                    serviceMode:
                        normalizedMode

                };

                const currentId =
                    getSessionId(activeSession);

                const nextId =
                    getSessionId(sessionToStore);

                if (currentId !== nextId) {

                    setActiveSession(
                        sessionToStore
                    );

                }

                setActiveRestoSession(
                    storeSlug,
                    sessionToStore
                );

                setServiceMode(
                    previous =>
                        previous === normalizedMode
                            ? previous
                            : normalizedMode
                );

                return;

            }

            const storedSession =
                getActiveRestoSession(
                    storeSlug
                );

            if (!storedSession) {

                if (location) {

                    setServiceMode(
                        previous =>
                            previous === SERVICE_MODE_DINE_IN
                                ? previous
                                : SERVICE_MODE_DINE_IN
                    );

                }

                return;

            }

            const storedMode =
                normalizeServiceMode(
                    storedSession.serviceMode
                );

            if (
                location &&
                storedMode !==
                SERVICE_MODE_DINE_IN
            ) {

                if (activeSession) {

                    setActiveSession(null);

                }

                setServiceMode(
                    previous =>
                        previous === SERVICE_MODE_DINE_IN
                            ? previous
                            : SERVICE_MODE_DINE_IN
                );

                return;

            }

            if (
                location?.id &&
                storedSession.locationId &&
                Number(storedSession.locationId) !==
                Number(location.id)
            ) {

                if (activeSession) {

                    setActiveSession(null);

                }

                setServiceMode(
                    previous =>
                        previous === SERVICE_MODE_DINE_IN
                            ? previous
                            : SERVICE_MODE_DINE_IN
                );

                return;

            }

            const currentId =
                getSessionId(activeSession);

            const storedId =
                getSessionId(storedSession);

            if (currentId !== storedId) {

                setActiveSession(
                    storedSession
                );

            }

            setServiceMode(
                previous =>
                    previous === storedMode
                        ? previous
                        : storedMode
            );

        },
        [
            storeSlug,
            session?.id,
            session?.session_id,
            session?.session_token,
            session?.service_mode,
            session?.store_id,
            session?.location_id,
            location?.id,
            store?.id
        ]
    );

    /*
    =====================================
    TOTALES
    =====================================
    */

    const totals =
        useMemo(
            () => {

                const total =
                    getCartTotal(
                        cart
                    );

                return {

                    subtotal:
                        total,

                    total

                };

            },
            [
                cart
            ]
        );

    /*
    =====================================
    CANTIDAD
    =====================================
    */

    function increase(
        item
    ) {

        updateCartItemQuantity(
            cart.indexOf(
                item
            ),
            Number(
                item.quantity ||
                0
            ) + 1
        );

    }

    function decrease(
        item
    ) {

        if (
            Number(
                item.quantity ||
                0
            ) <= 1
        ) {

            removeCartItem(
                cart.indexOf(
                    item
                )
            );

            return;

        }

        updateCartItemQuantity(
            cart.indexOf(
                item
            ),
            Number(
                item.quantity ||
                0
            ) - 1
        );

    }

    function deleteItem(
        item
    ) {

        removeCartItem(
            cart.indexOf(
                item
            )
        );

    }

    /*
    =====================================
    VACIAR
    =====================================
    */

    async function handleClear() {

        const result =
            await Swal.fire({

                icon:
                    "question",

                title:
                    "Vaciar pedido",

                text:
                    "¿Deseas eliminar todos los productos?",

                showCancelButton:
                    true,

                confirmButtonText:
                    "Sí",

                cancelButtonText:
                    "Cancelar"

            });

        if (
            !result.isConfirmed
        ) {

            return;

        }

        clearCart();

    }

    /*
    =====================================
    CLIENTE
    =====================================
    */

    function updateCustomer(
        field,
        value
    ) {

        setCustomer(
            previous => ({

                ...previous,

                [field]:
                    value

            })
        );

    }

    /*
    =====================================
    VALIDACIONES
    =====================================
    */

    function validateOrder() {

        if (
            !cart.length
        ) {

            Swal.fire({

                icon:
                    "warning",

                title:
                    "Carrito vacío",

                text:
                    "Agregá al menos un producto."

            });

            return false;

        }

        if (
            !accessFromTable &&
            !takeawayEnabled &&
            !deliveryEnabled
        ) {

            Swal.fire({
                icon: "warning",
                title:
                    "Pedidos no disponibles",
                text:
                    "El restaurante no tiene modalidades de pedido habilitadas."
            });

            return false;

        }

        if (
            serviceMode ===
            SERVICE_MODE_DINE_IN &&
            !location?.id &&
            !activeSession?.locationId &&
            !activeSession?.location_id
        ) {

            Swal.fire({

                icon:
                    "warning",

                title:
                    "Mesa no identificada",

                text:
                    "Volvé a escanear el código QR de la mesa."

            });

            return false;

        }

        if (
            !customer.name.trim()
        ) {

            Swal.fire({

                icon:
                    "warning",

                title:
                    "Nombre requerido",

                text:
                    "Ingresá tu nombre."

            });

            return false;

        }

        if (
            serviceMode !==
            SERVICE_MODE_DINE_IN &&
            !customer.phone.trim()
        ) {

            Swal.fire({

                icon:
                    "warning",

                title:
                    "Teléfono requerido",

                text:
                    "Ingresá un teléfono de contacto."

            });

            return false;

        }

        if (
            serviceMode ===
            SERVICE_MODE_DELIVERY &&
            !customer.address.trim()
        ) {

            Swal.fire({

                icon:
                    "warning",

                title:
                    "Dirección requerida",

                text:
                    "Ingresá la dirección de entrega."

            });

            return false;

        }

        if (
            serviceMode ===
            SERVICE_MODE_DELIVERY &&
            !customer.zip.trim()
        ) {

            Swal.fire({

                icon:
                    "warning",

                title:
                    "Código postal requerido",

                text:
                    "Ingresá el código postal de entrega."

            });

            return false;

        }

        return true;

    }

    /*
    =====================================
    ENVIAR PEDIDO
    =====================================
    */

    async function submitOrder() {

        if (
            !validateOrder()
        ) {

            return;

        }

        try {

            setLoading(
                true
            );

            const currentSession =
                activeSession ||
                session ||
                null;

            const currentSessionId =
                getSessionId(
                    currentSession
                );

            const currentSessionToken =
                getSessionToken(
                    currentSession
                );

            const currentLocationId =
                location?.id ??
                currentSession?.locationId ??
                currentSession?.location_id ??
                null;

            const response =
                await fetch(
                    "/api/resto/public/orders/create",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                storeId:
                                    store?.id ??
                                    currentSession?.storeId ??
                                    currentSession?.store_id ??
                                    null,

                                storeSlug,

                                /*
                                Campo existente para mantener
                                compatibilidad con la API.
                                */

                                serviceMode:
                                    getApiServiceMode(
                                        serviceMode
                                    ),

                                /*
                                Modalidad canónica nueva.
                                La API puede comenzar a usarla
                                sin romper el campo anterior.
                                */

                                service_mode:
                                    serviceMode,

                                sessionId:
                                    currentSessionId,

                                sessionToken:
                                    currentSessionToken,

                                locationId:
                                    currentLocationId,

                                sourceQrCodeId:
                                    currentSession?.sourceQrCodeId ??
                                    currentSession?.source_qr_code_id ??
                                    null,

                                qrCode:
                                    currentSession?.qrCode ??
                                    currentSession?.qr_code ??
                                    null,

                                customer: {
                                            name:
                                                customer.name.trim(),

                                            phone:
                                                customer.phone.trim(),

                                            email:
                                                customer.email.trim(),

                                            address:
                                                serviceMode ===
                                                    SERVICE_MODE_DELIVERY
                                                    ? customer.address.trim()
                                                    : "",

                                            zip:
                                                serviceMode ===
                                                    SERVICE_MODE_DELIVERY
                                                    ? customer.zip.trim()
                                                    : ""
                                        },

                                notes:
                                    notes.trim(),

                                items:
                                    cart.map(
                                        item => ({

                                            product_id:
                                                item.product_id,

                                            variant_id:
                                                item.variant_id ??
                                                null,

                                            quantity:
                                                Number(
                                                    item.quantity ||
                                                    1
                                                ),

                                            notes:
                                                item.notes ||
                                                "",

                                            options:
                                                item.options ??
                                                null

                                        })
                                    )

                            })

                    }
                );

            const data =
                await response.json();

            if (
                !response.ok
            ) {

                throw new Error(
                    data?.error ||
                    "No fue posible crear el pedido."
                );

            }

            const returnedSessionToken =
                getSessionToken(
                    data
                );

            const returnedSessionId =
                getSessionId(
                    data
                );

            if (
                returnedSessionToken &&
                storeSlug
            ) {

                const savedSession =
                    setActiveRestoSession(
                        storeSlug,
                        {
                            ...currentSession,
                            ...data?.session,

                            sessionToken:
                                returnedSessionToken,

                            sessionId:
                                returnedSessionId,

                            storeId:
                                data?.storeId ??
                                data?.store_id ??
                                data?.session?.store_id ??
                                store?.id ??
                                null,

                            locationId:
                                data?.locationId ??
                                data?.location_id ??
                                data?.session?.location_id ??
                                currentLocationId,

                            sourceQrCodeId:
                                data?.sourceQrCodeId ??
                                data?.source_qr_code_id ??
                                data?.session?.source_qr_code_id ??
                                currentSession?.sourceQrCodeId ??
                                currentSession?.source_qr_code_id ??
                                null,

                            qrCode:
                                data?.qrCode ??
                                data?.qr_code ??
                                data?.session?.qr_code ??
                                currentSession?.qrCode ??
                                currentSession?.qr_code ??
                                null,

                            qrLabel:
                                data?.qrLabel ??
                                data?.qr_label ??
                                data?.session?.qr_label ??
                                currentSession?.qrLabel ??
                                currentSession?.qr_label ??
                                null,

                            serviceMode,

                            customerName:
                                data?.session?.customer_name ??
                                customer.name.trim(),

                            customerPhone:
                                data?.session?.customer_phone ??
                                customer.phone.trim(),

                            customerEmail:
                                data?.session?.customer_email ??
                                customer.email.trim(),

                            customerAddress:
                                data?.session?.customer_address ??
                                (
                                    serviceMode ===
                                        SERVICE_MODE_DELIVERY
                                        ? customer.address.trim()
                                        : ""
                                ),

                            customerZip:
                                data?.session?.customer_zip ??
                                (
                                    serviceMode ===
                                        SERVICE_MODE_DELIVERY
                                        ? customer.zip.trim()
                                        : ""
                                ),

                            status:
                                data?.status ??
                                data?.session?.status ??
                                currentSession?.status ??
                                "open"
                        }
                    );

                setActiveSession(
                    savedSession
                );

            }

            clearCart();

            setNotes(
                ""
            );

            setCustomer({

                name:
                    "",

                phone:
                    "",

                email:
                    "",

                address:
                    "",

                zip:
                    ""

            });

            const returnedStatus =
                data?.session?.status ||
                data?.status ||
                null;

            const confirmationCopy =
                returnedStatus ===
                    "pending_activation"
                    ? {
                        title:
                            "Solicitud enviada",
                        text:
                            "El personal debe habilitar tu mesa o ubicación antes de preparar el pedido."
                    }
                    : returnedStatus ===
                        "pending_confirmation"
                        ? {
                            title:
                                "Pedido enviado",
                            text:
                                "El restaurante debe confirmar tu pedido antes de prepararlo."
                        }
                        : {
                            title:
                                "Pedido registrado",
                            text:
                                "Tu pedido fue registrado correctamente."
                        };

            await Swal.fire({

                icon:
                    "success",

                title:
                    confirmationCopy.title,

                text:
                    confirmationCopy.text,

                confirmButtonText:
                    "Ver pedido"

            });

            onHide?.();

            onOrderCreated?.(
                data
            );

        } catch (
        error
        ) {

            console.error(
                error
            );

            Swal.fire({

                icon:
                    "error",

                title:
                    "Error",

                text:
                    error?.message ||
                    "No fue posible enviar el pedido."

            });

        } finally {

            setLoading(
                false
            );

        }

    }

    /*
    =====================================
    UI
    =====================================
    */

    return (

        <Offcanvas
            show={show}
            onHide={onHide}
            placement="end"
            className="tags_resto_cart_drawer"
            style={themeCssVars}
        >

            <Offcanvas.Header
                closeButton
                className="tags_resto_cart_header"
            >

                <Offcanvas.Title>

                    <span className="tags_resto_cart_brand">

                        {restaurantLogo && (

                            <img
                                src={restaurantLogo}
                                alt=""
                                className="tags_resto_cart_brand_logo"
                            />

                        )}

                        <span className="tags_resto_cart_brand_copy">

                            <small>
                                {restaurantName}
                            </small>

                            <strong>
                                Mi pedido
                            </strong>

                            {customerName && (

                                <span>
                                    Hola, {customerName}
                                </span>

                            )}

                        </span>

                    </span>

                </Offcanvas.Title>

            </Offcanvas.Header>

            <Offcanvas.Body
                className="tags_resto_cart_body"
            >

                {onRecoverOrder && (
                    <button type="button" className="resto_order_recover_link tags_resto_cart_recover" onClick={onRecoverOrder}>
                        ¿Ya tenés un pedido? Recuperarlo
                    </button>
                )}

                {!cart.length && (

                    <div className="text-center py-5">

                        <div className="mb-3">

                            🛒

                        </div>

                        <h5>

                            Tu pedido está vacío

                        </h5>

                        <p className="text-muted mb-0">

                            Agregá productos para comenzar.

                        </p>

                    </div>

                )}

                {cart.length > 0 && (

                    <>

                        <div className="d-flex justify-content-end mb-3">

                            <Button
                                type="button"
                                variant="link"
                                className="text-danger p-0"
                                onClick={handleClear}
                            >

                                Vaciar pedido

                            </Button>

                        </div>

                        <div className="mb-3">

                            {cart.map(
                                item => (

                                    <div
                                        key={item.key}
                                        className="tags_resto_cart_item"
                                    >

                                        <div className="d-flex justify-content-between align-items-start">

                                            <div className="flex-grow-1 pe-2">

                                                <div className="fw-semibold">

                                                    {
                                                        item.title
                                                    }

                                                </div>

                                                {item.variant_title && (

                                                    <div className="small text-muted">

                                                        {
                                                            item.variant_title
                                                        }

                                                    </div>

                                                )}

                                                {item.notes && (

                                                    <div className="small fst-italic text-muted mt-1">

                                                        {
                                                            item.notes
                                                        }

                                                    </div>

                                                )}

                                                <div className="mt-2 fw-semibold">

                                                    $

                                                    {
                                                        Number(
                                                            item.unit_price
                                                        ).toLocaleString(
                                                            "es-AR",
                                                            {
                                                                minimumFractionDigits:
                                                                    2
                                                            }
                                                        )
                                                    }

                                                </div>

                                            </div>

                                            <Button
                                                type="button"
                                                variant="link"
                                                className="text-danger p-0"
                                                onClick={
                                                    () =>
                                                        deleteItem(
                                                            item
                                                        )
                                                }
                                            >

                                                ✕

                                            </Button>

                                        </div>

                                        <div className="d-flex align-items-center mt-3">

                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline-secondary"
                                                onClick={
                                                    () =>
                                                        decrease(
                                                            item
                                                        )
                                                }
                                            >

                                                −

                                            </Button>

                                            <div className="px-3 fw-bold">

                                                {
                                                    item.quantity
                                                }

                                            </div>

                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline-secondary"
                                                onClick={
                                                    () =>
                                                        increase(
                                                            item
                                                        )
                                                }
                                            >

                                                +

                                            </Button>

                                            <div className="ms-auto fw-semibold">

                                                $

                                                {
                                                    Number(
                                                        item.total_price
                                                    ).toLocaleString(
                                                        "es-AR",
                                                        {
                                                            minimumFractionDigits:
                                                                2
                                                        }
                                                    )
                                                }

                                            </div>

                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                        <div className="border-top pt-3">

                            <div className="d-flex justify-content-between mb-2">

                                <span>

                                    Subtotal

                                </span>

                                <strong>

                                    $

                                    {
                                        Number(
                                            totals.subtotal
                                        ).toLocaleString(
                                            "es-AR",
                                            {
                                                minimumFractionDigits:
                                                    2
                                            }
                                        )
                                    }

                                </strong>

                            </div>

                            <div className="d-flex justify-content-between">

                                <span>

                                    Total

                                </span>

                                <strong className="fs-5">

                                    $

                                    {
                                        Number(
                                            totals.total
                                        ).toLocaleString(
                                            "es-AR",
                                            {
                                                minimumFractionDigits:
                                                    2
                                            }
                                        )
                                    }

                                </strong>

                            </div>

                        </div>

                        <hr />

                        {
                            (
                                accessFromTable ||
                                takeawayEnabled ||
                                deliveryEnabled
                            ) && (

                        <Form.Group className="mb-3">

                            <Form.Label>

                                Modalidad

                            </Form.Label>

                            <Form.Select
                                value={serviceMode}
                                disabled={accessFromTable}
                                onChange={
                                    event =>
                                        setServiceMode(
                                            event.target.value
                                        )
                                }
                            >

                                {accessFromTable ? (

                                    <option value={SERVICE_MODE_DINE_IN}>

                                        Consumir en la mesa

                                    </option>

                                ) : (

                                    <>

                                        {
                                            takeawayEnabled && (

                                                <option value={SERVICE_MODE_TAKEAWAY}>
                                                    Retirar en el local
                                                </option>

                                            )
                                        }

                                        {
                                            deliveryEnabled && (

                                                <option value={SERVICE_MODE_DELIVERY}>
                                                    Envío a domicilio
                                                </option>

                                            )
                                        }

                                    </>

                                )}

                            </Form.Select>

                        </Form.Group>

                            )
                        }

                        <Form.Group className="mb-3">

                            <Form.Label>

                                Nombre

                            </Form.Label>

                            <Form.Control
                                value={customer.name}
                                autoComplete="name"
                                onChange={
                                    event =>
                                        updateCustomer(
                                            "name",
                                            event.target.value
                                        )
                                }
                            />

                        </Form.Group>

                        {serviceMode !==
                            SERVICE_MODE_DINE_IN && (

                                <>
                                    <Form.Group className="mb-3">

                                        <Form.Label>

                                            Teléfono

                                        </Form.Label>

                                        <Form.Control
                                            type="tel"
                                            value={customer.phone}
                                            autoComplete="tel"
                                            onChange={
                                                event =>
                                                    updateCustomer(
                                                        "phone",
                                                        event.target.value
                                                    )
                                            }
                                        />

                                    </Form.Group>

                                    <Form.Group className="mb-3">

                                        <Form.Label>

                                            Email

                                        </Form.Label>

                                        <Form.Control
                                            type="email"
                                            value={customer.email}
                                            autoComplete="email"
                                            onChange={
                                                event =>
                                                    updateCustomer(
                                                        "email",
                                                        event.target.value
                                                    )
                                            }
                                        />

                                    </Form.Group>

                                </>

                            )}

                        {serviceMode ===
                            SERVICE_MODE_DELIVERY && (

                                <>

                                    <Form.Group className="mb-3">

                                        <Form.Label>

                                            Dirección

                                        </Form.Label>

                                        <Form.Control
                                            value={customer.address}
                                            autoComplete="street-address"
                                            onChange={
                                                event =>
                                                    updateCustomer(
                                                        "address",
                                                        event.target.value
                                                    )
                                            }
                                        />

                                    </Form.Group>

                                    <Form.Group className="mb-3">

                                        <Form.Label>

                                            Código Postal

                                        </Form.Label>

                                        <Form.Control
                                            value={customer.zip}
                                            autoComplete="postal-code"
                                            onChange={
                                                event =>
                                                    updateCustomer(
                                                        "zip",
                                                        event.target.value
                                                    )
                                            }
                                        />

                                    </Form.Group>

                                </>

                            )}

                        <Form.Group className="mb-4">

                            <Form.Label>

                                Observaciones del pedido

                            </Form.Label>

                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={notes}
                                onChange={
                                    event =>
                                        setNotes(
                                            event.target.value
                                        )
                                }
                            />

                        </Form.Group>

                        <div className="d-grid">

                            <Button
                                type="button"
                                size="lg"
                                disabled={loading}
                                onClick={submitOrder}
                            >

                                {
                                    loading
                                        ? "Enviando..."
                                        : activeSession
                                            ? "Agregar al pedido"
                                            : "Confirmar pedido"
                                }

                            </Button>

                        </div>

                    </>

                )}

            </Offcanvas.Body>

        </Offcanvas>

    );

}
