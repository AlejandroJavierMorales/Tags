// =====================================
// FILE: app/modules/resto/components/public/RestoCurrentOrder.jsx
// Descripción:
// Pantalla pública del pedido activo.
//
// Permite:
// - consultar el pedido;
// - actualizar cantidades;
// - eliminar productos;
// - seguir agregando productos;
// - pedir la cuenta;
// - llamar al mozo.
// =====================================

"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState
}
    from "react";

import Link
    from "next/link";

import Swal
    from "sweetalert2";

import {
    Spinner
}
    from "react-bootstrap";

import "../../styles/resto-current-order.css";

import {
    clearActiveRestoSession,
    getActiveRestoSession,
    setActiveRestoSession
}
    from "@/app/modules/resto/lib/restoCart";

import RestoCurrentOrderHeader
    from "./RestoCurrentOrderHeader";

import RestoCurrentOrderContext
    from "./RestoCurrentOrderContext";

import RestoCurrentOrderProducts
    from "./RestoCurrentOrderProducts";

import RestoCurrentOrderSummary
    from "./RestoCurrentOrderSummary";

import RestoCurrentOrderActions
    from "./RestoCurrentOrderActions";



export default function RestoCurrentOrder({

    slug,

    sessionToken,

    resto = null

}) {

    const [loading, setLoading] =
        useState(true);

    const [sending, setSending] =
        useState(false);

    const [
        actionLoading,
        setActionLoading
    ] =
        useState(null);

    const [session, setSession] =
        useState(null);

    const [items, setItems] =
        useState([]);

    const [tracking, setTracking] =
        useState(null);

    const [totals, setTotals] =
        useState({

            subtotal: 0,

            discount: 0,

            total: 0

        });

    /*
    =====================================
    FORMATEAR IMPORTE
    =====================================
    */

    function formatMoney(value) {

        return Number(
            value || 0
        ).toLocaleString(
            "es-AR",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

    }

    /*
    =====================================
    ESTADO DE LA SESIÓN
    =====================================
    */

    function getStatusLabel(status) {

        const labels = {

            open:
                "Pedido abierto",

            pending_activation:
                "Esperando habilitación",

            pending_confirmation:
                "Esperando confirmación",

            bill_requested:
                "Cuenta solicitada",

            paid:
                "Pedido pagado",

            closed:
                "Pedido cerrado",

            cancelled:
                "Pedido cancelado"

        };

        return (
            labels[status] ||
            status ||
            "Pedido abierto"
        );

    }

    /*
    =====================================
    CARGAR PEDIDO
    =====================================
    */

    const loadOrder =
        useCallback(

            async ({
                silent = false
            } = {}) => {

                try {

                    if (!silent) {

                        setLoading(
                            true
                        );

                    }

                    const response =
                        await fetch(

                            "/api/resto/public/orders/get",

                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({

                                        sessionToken

                                    })

                            }

                        );

                    const data =
                        await response.json();

                    if (!response.ok) {

                        throw new Error(

                            data.error ||

                            "No fue posible cargar el pedido."

                        );

                    }

                    const loadedSession =
                        data.session ||
                        null;

                    setSession(
                        loadedSession
                    );

                    if (loadedSession) {

                        const loadedToken =
                            loadedSession.session_token ||
                            loadedSession.sessionToken ||
                            sessionToken;

                        const storedSession =
                            getActiveRestoSession(
                                slug
                            );

                        if (
                            storedSession?.sessionToken &&
                            storedSession.sessionToken !== loadedToken
                        ) {

                            clearActiveRestoSession(
                                slug
                            );

                        }

                        if (
                            loadedSession.status === "closed" ||
                            loadedSession.status === "cancelled"
                        ) {

                            clearActiveRestoSession(
                                slug
                            );

                        } else {
                            console.log("LOADED SESSION", loadedSession);

                            setActiveRestoSession(
                                slug,
                                {
                                    ...loadedSession,
                                    sessionToken:
                                        loadedToken,
                                    sessionId:
                                        loadedSession.id,
                                    storeId:
                                        loadedSession.store_id ??
                                        resto?.id ??
                                        null,
                                    locationId:
                                        loadedSession.location_id ??
                                        null,
                                    serviceMode:
                                        loadedSession.service_mode === "table"
                                            ? "dine_in"
                                            : loadedSession.service_mode
                                }
                            );

                        }

                    }

                    setItems(
                        data.items ||
                        []
                    );

                    setTracking(
                        data.tracking ||
                        null
                    );

                    setTotals(

                        data.totals ||

                        {

                            subtotal: 0,

                            discount: 0,

                            total: 0

                        }

                    );

                }

                catch (err) {

                    console.error(
                        "RESTO CURRENT ORDER LOAD ERROR:",
                        err
                    );

                    Swal.fire({

                        icon:
                            "error",

                        title:
                            "Pedido",

                        text:
                            err.message ||
                            "No fue posible cargar el pedido."

                    });

                }

                finally {

                    if (!silent) {

                        setLoading(
                            false
                        );

                    }

                }

            },

            [
                resto?.id,
                sessionToken,
                slug
            ]

        );

    useEffect(

        () => {

            loadOrder();

        },

        [
            loadOrder
        ]

    );

    useEffect(

        () => {

            const interval =
                window.setInterval(
                    () => {

                        loadOrder({
                            silent: true
                        });

                    },
                    10000
                );

            return () =>
                window.clearInterval(
                    interval
                );

        },

        [
            loadOrder
        ]

    );

    /*
    =====================================
    DATOS CALCULADOS
    =====================================
    */

    const totalItems =
        useMemo(

            () =>

                items.reduce(

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

                ),

            [
                items
            ]

        );

    const isPaid =
        session?.payment_status ===
            "paid" ||
        (
            Number(
                session?.total || 0
            ) > 0 &&
            Number(
                session?.paid_total || 0
            ) >=
                Number(
                    session?.total || 0
                )
        );

    const isSessionOpen =
        !isPaid &&
        [
            "open",
            "bill_requested"
        ].includes(
            session?.status
        );

    const canCancelSession =
        !isPaid &&
        (
            Number(
                tracking?.quantities?.ready || 0
            ) +
            Number(
                tracking?.quantities?.served || 0
            )
        ) === 0 &&
        ![
            "closed",
            "cancelled"
        ].includes(
            session?.status
        );

    const locationName =
        session?.location_name ||
        session?.location?.name ||
        null;

    const parentLocationName =
        session?.parent_location_name ||
        session?.location?.parent_name ||
        null;

    const businessName =
        resto?.name ||
        session?.store_name ||
        session?.resto_name ||
        "Tags Resto";

    const businessLogo =
        resto?.logo_url ||
        session?.store_logo_url ||
        session?.resto_logo_url ||
        null;

    const businessType =
        resto?.business_type ||
        resto?.category_name ||
        resto?.subtitle ||
        "Restaurante";

    const qrLabel =
        session?.qr_label ||
        session?.qr_code ||
        session?.qr_code_label ||
        session?.location?.qr_label ||
        null;

    const qrCode =
        session?.qr_code ||
        session?.location?.qr_code ||
        null;

    const isDineIn =
        session?.service_mode === "table" ||
        session?.service_mode === "dine_in";

    const serviceModeLabel =
        isDineIn
            ? "Consumo en el lugar"
            : (
                session?.service_mode === "delivery"
                    ? "Envío a domicilio"
                    : "Retiro en el local"
            );

    /*
    =====================================
    ACTUALIZAR ITEM
    =====================================
    */

    async function updateItem(

        item,

        quantity

    ) {

        if (
            sending ||
            !isSessionOpen
        ) {

            return;

        }

        const finalQuantity =
            Math.max(
                0,
                Number(
                    quantity ||
                    0
                )
            );

        try {

            setSending(
                true
            );

            const response =
                await fetch(

                    "/api/resto/public/orders/items/update",

                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                itemId:
                                    item.id,

                                quantity:
                                    finalQuantity

                            })

                    }

                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(

                    data.error ||

                    "No fue posible actualizar el pedido."

                );

            }

            await loadOrder({
                silent: true
            });

        }

        catch (err) {

            console.error(
                "RESTO CURRENT ORDER UPDATE ERROR:",
                err
            );

            Swal.fire({

                icon:
                    "error",

                title:
                    "Pedido",

                text:
                    err.message ||
                    "No fue posible actualizar el pedido."

            });

        }

        finally {

            setSending(
                false
            );

        }

    }

    /*
    =====================================
    ELIMINAR ITEM
    =====================================
    */

    async function removeItem(item) {

        if (
            sending ||
            !isSessionOpen
        ) {

            return;

        }

        const result =
            await Swal.fire({

                icon:
                    "question",

                title:
                    "Eliminar producto",

                text:
                    `¿Deseás eliminar ${item.title} del pedido?`,

                showCancelButton:
                    true,

                confirmButtonText:
                    "Sí, eliminar",

                cancelButtonText:
                    "Cancelar",

                reverseButtons:
                    true

            });

        if (!result.isConfirmed) {

            return;

        }

        await updateItem(
            item,
            0
        );

    }

    /*
    =====================================
    SEGUIR AGREGANDO PRODUCTOS
    =====================================
    */

    function continueShopping() {

        window.location.href =
            `/p/${slug}`;

    }

    /*
    =====================================
    PEDIR LA CUENTA
    =====================================
    */

    async function requestBill() {

        if (
            actionLoading ||
            !isSessionOpen
        ) {

            return;

        }

        const result =
            await Swal.fire({

                icon:
                    "question",

                title:
                    "Pedir la cuenta",

                text:
                    "¿Deseás avisar que querés cerrar la cuenta?",

                showCancelButton:
                    true,

                confirmButtonText:
                    "Sí, pedir la cuenta",

                cancelButtonText:
                    "Cancelar",

                reverseButtons:
                    true

            });

        if (!result.isConfirmed) {

            return;

        }

        try {

            setActionLoading(
                "bill"
            );

            const response =
                await fetch(

                    "/api/resto/public/orders/request-bill",

                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                sessionToken

                            })

                    }

                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(

                    data.error ||

                    "No fue posible pedir la cuenta."

                );

            }

            await loadOrder({
                silent: true
            });

            await Swal.fire({

                icon:
                    "success",

                title:
                    "Cuenta solicitada",

                text:
                    data.message ||
                    "Avisamos al personal que solicitaste la cuenta.",

                confirmButtonText:
                    "Aceptar"

            });

        }

        catch (err) {

            console.error(
                "RESTO REQUEST BILL ERROR:",
                err
            );

            Swal.fire({

                icon:
                    "error",

                title:
                    "No pudimos pedir la cuenta",

                text:
                    err.message ||
                    "Intentá nuevamente."

            });

        }

        finally {

            setActionLoading(
                null
            );

        }

    }

    /*
    =====================================
    LLAMAR AL MOZO
    =====================================
    */

    async function callWaiter() {

        if (
            actionLoading ||
            !isSessionOpen
        ) {

            return;

        }

        const prompt =
            await Swal.fire({
                icon:
                    "question",
                title:
                    "¿Qué necesitás?",
                input:
                    "textarea",
                inputLabel:
                    "Mensaje para el personal (opcional)",
                inputPlaceholder:
                    "Ejemplo: ¿Me podés traer un poquito de pan?",
                inputAttributes: {
                    maxlength:
                        "500"
                },
                showCancelButton:
                    true,
                confirmButtonText:
                    "Enviar llamado",
                cancelButtonText:
                    "Cancelar"
            });

        if (!prompt.isConfirmed) {

            return;

        }

        try {

            setActionLoading(
                "waiter"
            );

            const response =
                await fetch(

                    "/api/resto/public/orders/call-waiter",

                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                sessionToken,

                                notes:
                                    String(
                                        prompt.value ||
                                        ""
                                    ).trim()

                            })

                    }

                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(

                    data.error ||

                    "No fue posible llamar al mozo."

                );

            }

            await Swal.fire({

                icon:
                    "success",

                title:
                    "Aviso enviado",

                text:
                    data.message ||
                    "El personal fue avisado.",

                confirmButtonText:
                    "Aceptar",

                timer:
                    2500,

                timerProgressBar:
                    true

            });

        }

        catch (err) {

            console.error(
                "RESTO CALL WAITER ERROR:",
                err
            );

            Swal.fire({

                icon:
                    "error",

                title:
                    "No pudimos enviar el aviso",

                text:
                    err.message ||
                    "Intentá nuevamente."

            });

        }

        finally {

            setActionLoading(
                null
            );

        }

    }

    async function cancelSession() {

        if (
            actionLoading ||
            !canCancelSession
        ) {

            return;

        }

        const confirmation =
            await Swal.fire({
                icon: "warning",
                title: "Cancelar pedido",
                input: "textarea",
                inputLabel:
                    "Motivo de la cancelación",
                inputPlaceholder:
                    "Contanos por qué querés cancelarlo",
                showCancelButton: true,
                confirmButtonText:
                    "Cancelar pedido",
                cancelButtonText:
                    "Volver",
                confirmButtonColor:
                    "#dc3545"
            });

        if (!confirmation.isConfirmed) {

            return;

        }

        try {

            setActionLoading(
                "cancel"
            );

            const response =
                await fetch(
                    "/api/resto/public/orders/cancel",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                sessionToken,
                                reason:
                                    confirmation.value
                            })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "No se pudo cancelar el pedido."
                );

            }

            clearActiveRestoSession(
                slug
            );

            await Swal.fire({
                icon: "success",
                title:
                    "Pedido cancelado",
                confirmButtonText:
                    "Aceptar"
            });

            window.location.href =
                `/p/${slug}`;

        } catch (err) {

            Swal.fire({
                icon: "error",
                title:
                    "No se pudo cancelar",
                text:
                    err.message
            });

        } finally {

            setActionLoading(
                null
            );

        }

    }

    /*
    =====================================
    CARGANDO
    =====================================
    */

    if (loading) {

        return (

            <main className="tags_resto_current_order_page">

                <div className="container">

                    <div className="tags_resto_current_order_loading">

                        <Spinner
                            animation="border"
                            role="status"
                        />

                        <p>
                            Cargando tu pedido...
                        </p>

                    </div>

                </div>

            </main>

        );

    }

    /*
    =====================================
    PEDIDO NO ENCONTRADO
    =====================================
    */

    if (!session) {

        return (

            <main className="tags_resto_current_order_page">

                <div className="container">

                    <div className="tags_resto_current_order_empty">

                        <div className="tags_resto_current_order_empty_icon">
                            🍽️
                        </div>

                        <h1>
                            Pedido no encontrado
                        </h1>

                        <p>
                            La sesión no existe o ya no está disponible.
                        </p>

                        <Link

                            href={`/p/${slug}`}

                            className="tags_resto_current_order_primary_link"

                        >
                            Volver al restaurante
                        </Link>

                    </div>

                </div>

            </main>

        );

    }
    /*
=====================================
RENDER PRINCIPAL
=====================================
*/

    return (

        <main className="tags_resto_current_order_page">

            <div className="container">

                <div className="tags_resto_current_order_shell">

                    <RestoCurrentOrderHeader

                        businessLogo={businessLogo}

                        businessName={businessName}

                        businessType={businessType}

                        status={session.status}

                        statusLabel={
                            getStatusLabel(
                                session.status
                            )
                        }

                    />

                    <RestoCurrentOrderContext

                        isDineIn={isDineIn}

                        serviceMode={session.service_mode}

                        serviceModeLabel={serviceModeLabel}

                        locationName={locationName}

                        parentLocationName={parentLocationName}

                        qrLabel={qrLabel}

                        qrCode ={qrCode}

                        totalItems={totalItems}

                    />

                    {

                        tracking && (

                            <section
                                className={
                                    `tags_resto_current_order_tracking tags_resto_current_order_tracking_${tracking.code}`
                                }
                            >

                                <div className="tags_resto_current_order_tracking_copy">

                                    <span>
                                        Seguimiento en vivo
                                    </span>

                                    <h2>
                                        {tracking.label}
                                    </h2>

                                    <p>
                                        {tracking.message}
                                    </p>

                                </div>

                                {

                                    tracking.total > 0 && (

                                        <div className="tags_resto_current_order_tracking_progress">

                                            <div>

                                                <strong>
                                                    {tracking.prepared} / {tracking.total}
                                                </strong>

                                                <span>
                                                    productos listos
                                                </span>

                                            </div>

                                            <div className="tags_resto_current_order_tracking_bar">

                                                <span
                                                    style={{
                                                        width:
                                                            `${Math.min(100, (Number(tracking.prepared || 0) / Number(tracking.total || 1)) * 100)}%`
                                                    }}
                                                />

                                            </div>

                                        </div>

                                    )

                                }

                                {

                                    tracking.waiter_request && (

                                        <div className="tags_resto_current_order_request_notice">
                                            Tu llamado fue enviado al personal.
                                        </div>

                                    )

                                }

                            </section>

                        )

                    }

                    <div className="tags_resto_current_order_layout">

                        <RestoCurrentOrderProducts

                            items={items}

                            totalItems={totalItems}

                            sending={sending}

                            isSessionOpen={isSessionOpen}

                            formatMoney={formatMoney}

                            updateItem={updateItem}

                            removeItem={removeItem}

                        />

                        <aside className="tags_resto_current_order_sidebar">

                            <RestoCurrentOrderSummary

                                totals={totals}

                                formatMoney={formatMoney}

                            />

                            <RestoCurrentOrderActions

                                slug={slug}

                                session={session}

                                sending={sending}

                                actionLoading={actionLoading}

                                isSessionOpen={isSessionOpen}

                                canCancelSession={
                                    canCancelSession
                                }

                                continueShopping={continueShopping}

                                requestBill={requestBill}

                                callWaiter={callWaiter}

                                cancelSession={
                                    cancelSession
                                }

                                getStatusLabel={getStatusLabel}

                            />

                        </aside>

                    </div>

                </div>

            </div>

        </main>

    );

}
