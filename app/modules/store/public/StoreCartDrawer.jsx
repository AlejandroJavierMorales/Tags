// =====================================
// COMPONENT: StoreCartDrawer
// Descripción: Drawer público del carrito de Tags Tienda.
// =====================================

"use client";

import { useEffect, useState } from "react";

import { FaWhatsapp } from "react-icons/fa";
import { SiMercadopago } from "react-icons/si";
import { BsBank } from "react-icons/bs";
import { HiOutlineCash } from "react-icons/hi";
import { MdPix } from "react-icons/md";


import showAlert
    from "@/app/components/showAlert";

import {
    clearCart,
    getCartCount,
    getCartItems,
    getCartTotal,
    removeCartItem,
    setCartItems,
    updateCartItemQuantity
} from "../lib/storeCart";

import {
    formatStorePrice
} from "../lib/formatStorePrice";

import "@/app/styles/tags_store_public.css";

function normalizeWhatsappAR(phone) {

    let clean =
        String(phone || "")
            .replace(/\D/g, "");

    if (!clean) {
        return "";
    }

    // quita 00 internacional
    if (clean.startsWith("00")) {
        clean =
            clean.slice(2);
    }

    // quita 54 si ya viene
    if (clean.startsWith("54")) {
        clean =
            clean.slice(2);
    }

    // quita 0 inicial
    if (clean.startsWith("0")) {
        clean =
            clean.slice(1);
    }

    // quita 15 móvil argentino
    clean =
        clean.replace(/^15/, "");

    // agrega 9 móvil
    if (!clean.startsWith("9")) {
        clean =
            `9${clean}`;
    }

    return `54${clean}`;
}





export default function StoreCartDrawer({
    store,
    isOpen,
    onClose
}) {
    const [items, setItems] =
        useState([]);

    const [couponCode, setCouponCode] =
        useState("");

    const [couponData, setCouponData] =
        useState(null);

    const [discountTotal, setDiscountTotal] =
        useState(0);

    const emptyCustomer = {
        name: "",
        phone: "",
        email: "",
        address: "",
        zip: "",
        city: "",
        state: "",
        notes: ""
    };

    const [customer, setCustomer] =
        useState(emptyCustomer);

    const [shippingMethods, setShippingMethods] =
        useState([]);

    const [selectedShipping, setSelectedShipping] =
        useState(null);

    const [shippingTotal, setShippingTotal] =
        useState(0);

    const [shippingDestination, setShippingDestination] =
        useState(null);

    const [paymentMethod, setPaymentMethod] =
        useState("whatsapp");

    const [shippingQuotes, setShippingQuotes] =
        useState([]);

    const [shippingQuoteLoading, setShippingQuoteLoading] =
        useState(false);

    const [selectedShippingQuote, setSelectedShippingQuote] =
        useState(null);

    const [postalResults, setPostalResults] =
        useState([]);

    const [selectedPostalCode, setSelectedPostalCode] =
        useState(null);

    const [postalLoading, setPostalLoading] =
        useState(false);


    useEffect(() => {
        loadCart();
        loadShippingMethods();
        function handleCartUpdate() {
            loadCart();
        }

        window.addEventListener(
            "tags_store_cart_updated",
            handleCartUpdate
        );

        return () => {
            window.removeEventListener(
                "tags_store_cart_updated",
                handleCartUpdate
            );
        };
    }, []);

    function loadCart() {
        setItems(
            getCartItems()
        );
    }

    const subtotal =
        getCartTotal(items);

    useEffect(() => {
        if (!couponData) {
            setDiscountTotal(0);
            return;
        }

        const value =
            Number(couponData.discount_value || 0);

        let nextDiscount =
            0;

        if (couponData.discount_type === "percent") {
            nextDiscount =
                Math.round(
                    subtotal * (value / 100)
                );
        } else {
            nextDiscount =
                Math.min(
                    value,
                    subtotal
                );
        }

        setDiscountTotal(nextDiscount);

    }, [
        subtotal,
        couponData
    ]);

    const finalTotal =
        Math.max(
            0,
            subtotal -
            discountTotal +
            shippingTotal
        );

    useEffect(() => {
        if (items.length > 0) {
            return;
        }

        setSelectedShipping(null);
        setShippingTotal(0);
        setCouponData(null);
        setDiscountTotal(0);
        setCouponCode("");
        setCustomer(emptyCustomer);
        setSelectedShippingQuote(null);
        setShippingQuotes([]);
        setPostalResults([]);
        setSelectedPostalCode(null);
        setShippingDestination(null);

    }, [
        items.length
    ]);

    const selectedRequiresAddress =
        selectedShipping &&
        Number(selectedShipping.requires_address) === 1;

    const selectedRequiresZip =
        selectedShipping &&
        Number(selectedShipping.requires_zip) === 1;

    function getShippingLabel(method) {
        const price =
            Number(method.price || 0);

        const isFree =
            method.free_from &&
            subtotal >= Number(method.free_from);

        const priceText =
            isFree
                ? "Sin costo"
                : price > 0
                    ? formatStorePrice(price, store.currency || "ARS")
                    : "A coordinar";

        const daysText =
            method.delivery_days_min && method.delivery_days_max
                ? `${method.delivery_days_min} a ${method.delivery_days_max} días`
                : method.delivery_days_min
                    ? `${method.delivery_days_min} días`
                    : "";

        return daysText
            ? `${method.name} · ${priceText} · ${daysText}`
            : `${method.name} · ${priceText}`;
    }

    function handleQuantity(index, quantity) {
        const item =
            items[index];

        if (!item) {
            return;
        }

        const allowNegativeStock =
            store.settings_json?.allowNegativeStock === true;

        const maxStock =
            item.available_stock;

        let nextQuantity =
            Math.max(
                1,
                Number(quantity || 1)
            );

        if (
            !allowNegativeStock &&
            maxStock !== null &&
            maxStock !== undefined
        ) {
            nextQuantity =
                Math.min(
                    nextQuantity,
                    Number(maxStock)
                );
        }

        const nextItems =
            updateCartItemQuantity(
                index,
                nextQuantity
            );

        setItems(nextItems);
    }

    async function handleRemove(index) {
        const confirmed =
            await showAlert({
                title: "Quitar producto",
                text: "¿Querés quitar este producto del carrito?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Quitar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) {
            return;
        }

        setItems(
            removeCartItem(index)
        );
    }

    async function handleClear() {
        const confirmed =
            await showAlert({
                title: "Vaciar carrito",
                text: "¿Querés eliminar todos los productos del carrito?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Vaciar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) {
            return;
        }

        clearCart();
        setItems([]);
        setSelectedShipping(null);
        setShippingTotal(0);
        setCouponData(null);
        setDiscountTotal(0);
        setCouponCode("");
        setCustomer(emptyCustomer);
        setSelectedShippingQuote(null);
        setShippingQuotes([]);
        setPostalResults([]);
        setSelectedPostalCode(null);
        setShippingDestination(null);
    }

    async function handleApplyCoupon() {

        try {

            const res =
                await fetch(
                    "/api/store/public/coupons/validate",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            storeId: store.id,
                            code: couponCode,
                            subtotal
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error
                );
            }

            setCouponData(
                data.coupon
            );

            setDiscountTotal(
                Number(
                    data.discount || 0
                )
            );

            showAlert({
                title: "Cupón aplicado",
                text: `Descuento de ${formatStorePrice(
                    data.discount,
                    store.currency || "ARS"
                )}`,
                icon: "success"
            });

        } catch (err) {

            setCouponData(null);
            setDiscountTotal(0);

            showAlert({
                title: "Cupón inválido",
                text: err.message,
                icon: "error"
            });
        }
    }

    function buildWhatsappText(
        orderNumber = null,
        trackingUrl = null
    ) {
        const lines = [
            `🛒 *Pedido - ${store.name}*`,
            orderNumber
                ? `*Pedido:* ${orderNumber}`
                : null,

            trackingUrl
                ? `🔎 Seguimiento: ${trackingUrl}`
                : null,
            "",
            "────────────────",
            "",
            ...items.flatMap((item, index) => [
                `*${index + 1}. ${item.product_title}*`,
                item.variant_title
                    ? `Variante: ${item.variant_title}`
                    : null,
                `Cantidad: ${item.quantity}`,
                `Precio unitario: ${formatStorePrice(
                    item.unit_price,
                    item.currency || store.currency || "ARS"
                )}`,
                `Subtotal: ${formatStorePrice(
                    item.total_price,
                    item.currency || store.currency || "ARS"
                )}`,
                ""
            ].filter(Boolean)),
            "────────────────",
            "",
            `*SUBTOTAL:* ${formatStorePrice(
                subtotal,
                store.currency || "ARS"
            )}`,
            couponData
                ? `*DESCUENTO (${couponData.code}):* -${formatStorePrice(
                    discountTotal,
                    store.currency || "ARS"
                )}`
                : null,
            selectedShipping
                ? `*ENTREGA:* ${selectedShipping.name}`
                : null,

            shippingTotal > 0
                ? `*ENVÍO:* ${formatStorePrice(
                    shippingTotal,
                    store.currency || "ARS"
                )}`
                : selectedShipping
                    ? `*ENVÍO:* Sin costo / a coordinar`
                    : null,

            `*TOTAL:* ${formatStorePrice(
                finalTotal,
                store.currency || "ARS"
            )}`,
            "",
            "📋 *Datos del cliente*",
            "",
            `Nombre: ${customer.name}`,
            `Teléfono: ${customer.phone}`,
            customer.email
                ? `Email: ${customer.email}`
                : null,
            customer.address
                ? `Dirección: ${customer.address}`
                : null,
            customer.zip
                ? `Código postal: ${customer.zip}`
                : null,
            customer.notes
                ? `Observaciones: ${customer.notes}`
                : null
        ].filter(line => line !== null);

        return lines.join("\n");
    }

    async function handleWhatsappCheckout(e) {

        e.preventDefault();

        if (!items.length) {
            return;
        }

        if (!selectedShipping) {
            showAlert({
                title: "Seleccioná la entrega",
                text: "Elegí un método de entrega para finalizar el pedido.",
                icon: "warning"
            });

            return;
        }

        if (
            selectedShipping.provider === "zipnova" &&
            !selectedShippingQuote
        ) {
            showAlert({
                title: "Seleccioná el envío",
                text: "Primero cotizá y seleccioná una opción de envío.",
                icon: "warning"
            });

            return;
        }
        if (!customer.name.trim()) {
            showAlert({
                title: "Nombre requerido",
                text: "Ingresá tu nombre para finalizar el pedido.",
                icon: "warning"
            });

            return;
        }

        if (!customer.phone.trim()) {
            showAlert({
                title: "Teléfono requerido",
                text: "Ingresá un teléfono de contacto para finalizar el pedido.",
                icon: "warning"
            });

            return;
        }

        if (
            selectedRequiresAddress &&
            !customer.address.trim()
        ) {
            showAlert({
                title: "Dirección requerida",
                text: "Ingresá la dirección de entrega.",
                icon: "warning"
            });

            return;
        }

        if (
            selectedRequiresZip &&
            !customer.zip.trim()
        ) {
            showAlert({
                title: "Código postal requerido",
                text: "Ingresá el código postal para calcular o coordinar el envío.",
                icon: "warning"
            });

            return;
        }

        try {
            const res =
                await fetch(
                    "/api/store/public/orders/create",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            storeId: store.id,
                            items,
                            coupon:
                                couponData
                                    ? {
                                        id: couponData.id,
                                        code: couponData.code
                                    }
                                    : null,
                            shippingMethod:
                                selectedShipping && !selectedShippingQuote
                                    ? {
                                        id: selectedShipping.id,
                                        name: selectedShipping.name,
                                        price: shippingTotal
                                    }
                                    : null,

                            shippingQuote:
                                selectedShippingQuote
                                    ? selectedShippingQuote
                                    : null,
                            customer: {
                                name: customer.name,
                                phone: customer.phone,
                                email: customer.email,
                                address: customer.address,
                                zip: customer.zip,
                                city: customer.city,
                                state: customer.state
                            },
                            paymentMethod,
                            notes: customer.notes
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo crear el pedido"
                );
            }

            if (paymentMethod === "mercado_pago") {
                const mpRes =
                    await fetch(
                        "/api/store/public/payments/create-preference",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                orderId: data.orderId,
                                checkoutToken:
                                    data.checkoutToken
                            })
                        }
                    );

                const mpData =
                    await mpRes.json().catch(() => ({}));

                if (!mpRes.ok) {
                    throw new Error(
                        mpData.error ||
                        "No se pudo iniciar Mercado Pago"
                    );
                }

                clearCart();
                setItems([]);
                setSelectedShipping(null);
                setShippingTotal(0);
                setCouponData(null);
                setDiscountTotal(0);
                setCouponCode("");
                setCustomer(emptyCustomer);
                setSelectedShippingQuote(null);
                setShippingQuotes([]);
                setPostalResults([]);
                setSelectedPostalCode(null);
                setShippingDestination(null);

                window.location.href =
                    mpData.initPoint;

                return;
            }

            const phone =
                normalizeWhatsappAR(
                    store.whatsapp
                );

            const trackingUrl =
                `${window.location.origin}/p/${store.slug}/orders/track`;

            const text =
                buildWhatsappText(
                    data.orderNumber,
                    trackingUrl
                );

            const url =
                `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

            clearCart();
            setItems([]);
            setSelectedShipping(null);
            setShippingTotal(0);
            setCouponData(null);
            setDiscountTotal(0);
            setCouponCode("");
            setCustomer(emptyCustomer);
            setSelectedShippingQuote(null);
            setShippingQuotes([]);
            setPostalResults([]);
            setSelectedPostalCode(null);
            setShippingDestination(null);

            window.open(
                url,
                "_blank"
            );

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        }
    }

    if (!isOpen) {
        return null;
    }

    function updateCustomerField(field, value) {
        setCustomer(prev => ({
            ...prev,
            [field]: value
        }));
    }

    async function loadShippingMethods() {

        try {

            const res =
                await fetch(
                    `/api/store/public/shipping/list?storeId=${store.id}`
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error
                );
            }

            setShippingMethods(
                data.methods || []
            );

        } catch (err) {

            console.error(err);
        }
    }

    function handleShippingChange(id) {
        const method =
            shippingMethods.find(
                item =>
                    Number(item.id) === Number(id)
            );

        setSelectedShipping(method || null);

        setShippingQuotes([]);
        setSelectedShippingQuote(null);
        setShippingDestination(null);
        setPostalResults([]);
        setSelectedPostalCode(null);
        setShippingDestination(null);

        if (!method) {
            setShippingTotal(0);
            return;
        }

        if (method.provider === "zipnova") {
            setShippingTotal(0);
            return;
        }

        let shipping =
            Number(method.price || 0);

        if (
            method.free_from &&
            subtotal >= Number(method.free_from)
        ) {
            shipping = 0;
        }

        setShippingTotal(shipping);
    }

    async function handleQuoteShipping() {
        if (!selectedShipping) {
            return;
        }

        if (selectedShipping.provider !== "zipnova") {
            return;
        }

        let destination =
            selectedPostalCode;

        if (!destination) {
            destination =
                await handleLookupPostalCode();
        }

        if (!destination) {
            showAlert({
                title: "Confirmá el destino",
                text: "Seleccioná la localidad correspondiente al código postal.",
                icon: "warning"
            });

            return;
        }

        try {
            setShippingQuoteLoading(true);
            setShippingQuotes([]);
            setSelectedShippingQuote(null);
            setShippingTotal(0);

            const res =
                await fetch(
                    "/api/store/public/shipping/quote",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            storeId: store.id,
                            zip: destination.postal_code,
                            city: destination.city,
                            state: destination.state,
                            items: items.map(item => ({
                                product_id: item.product_id,
                                quantity: item.quantity
                            }))
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error || "No se pudo cotizar el envío"
                );
            }

            setShippingDestination(
                data?.raw?.destination || {
                    city: destination.city,
                    state: destination.state,
                    zipcode: destination.postal_code
                }
            );

            const filteredQuotes =
                (data.quotes || []).filter(quote =>
                    quote.service_code === selectedShipping.provider_service_code
                );

            setShippingQuotes(filteredQuotes);

            if (!filteredQuotes.length) {
                showAlert({
                    title: "Sin opciones disponibles",
                    text: "No encontramos una cotización disponible para ese método y código postal.",
                    icon: "warning"
                });
            }

        } catch (err) {
            showAlert({
                title: "Error cotizando envío",
                text: err.message,
                icon: "error"
            });

        } finally {
            setShippingQuoteLoading(false);
        }
    }

    function handleSelectShippingQuote(quote) {
        setSelectedShippingQuote(quote);
        setShippingTotal(Number(quote.price || 0));
    }

    async function handleLookupPostalCode() {
        const cleanZip =
            String(customer.zip || "")
                .trim()
                .toUpperCase()
                .replace(/\s+/g, "");

        if (!cleanZip) {
            showAlert({
                title: "Código postal requerido",
                text: "Ingresá el código postal.",
                icon: "warning"
            });

            return null;
        }

        try {
            setPostalLoading(true);
            setPostalResults([]);
            setSelectedPostalCode(null);
            setShippingQuotes([]);
            setSelectedShippingQuote(null);
            setShippingTotal(0);

            const res =
                await fetch(
                    `/api/store/public/shipping/postal-code?postalCode=${encodeURIComponent(cleanZip)}`
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error || "No encontramos ese código postal"
                );
            }

            setPostalResults(data.results || []);

            if ((data.results || []).length === 1) {
                const only =
                    data.results[0];

                setSelectedPostalCode(only);

                setCustomer(prev => ({
                    ...prev,
                    zip: only.postal_code,
                    city: only.city,
                    state: only.state
                }));

                return only;
            }

            return null;

        } catch (err) {
            showAlert({
                title: "Código postal no encontrado",
                text: err.message,
                icon: "error"
            });

            return null;

        } finally {
            setPostalLoading(false);
        }
    }

    /*  UI */

    return (
        <div
            className="store_cart_overlay"
            onClick={onClose}
        >
            <div className="store_cart_overlay_inner">
                <aside
                    className="store_cart_drawer"
                    onClick={(e) =>
                        e.stopPropagation()
                    }
                >
                    <div className="store_cart_header">
                        <div>
                            <h2>
                                Carrito
                            </h2>

                            <small>
                                {getCartCount(items)} producto(s)
                            </small>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="store_cart_close"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="store_cart_body">
                        {items.map((item, index) => (
                            <div
                                key={`${item.product_id}-${item.variant_id || "base"}-${index}`}
                                className="store_cart_item"
                            >
                                <div className="store_cart_item_main">

                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt={item.product_title}
                                            className="store_cart_item_image"
                                        />
                                    ) : (
                                        <div className="store_cart_item_image placeholder">
                                            📦
                                        </div>
                                    )}

                                    <div>
                                        <strong>
                                            {item.product_title}
                                        </strong>

                                        {item.variant_title && (
                                            <small>
                                                {item.variant_title}
                                            </small>
                                        )}

                                        <span>
                                            {formatStorePrice(
                                                item.unit_price,
                                                item.currency || store.currency || "ARS"
                                            )}
                                        </span>
                                    </div>

                                </div>

                                <div className="store_cart_item_controls">
                                    <button
                                        type="button"
                                        disabled={Number(item.quantity) <= 1}
                                        onClick={() =>
                                            handleQuantity(
                                                index,
                                                Number(item.quantity) - 1
                                            )
                                        }
                                    >
                                        -
                                    </button>

                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) =>
                                            handleQuantity(
                                                index,
                                                e.target.value
                                            )
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleQuantity(
                                                index,
                                                Number(item.quantity) + 1
                                            )
                                        }
                                    >
                                        +
                                    </button>
                                </div>

                                <div className="store_cart_item_footer">
                                    <strong>
                                        {formatStorePrice(
                                            item.total_price,
                                            item.currency || store.currency || "ARS"
                                        )}
                                    </strong>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleRemove(index)
                                        }
                                    >
                                        Quitar
                                    </button>
                                </div>
                            </div>
                        ))}

                        {!items.length && (
                            <div className="store_cart_empty">
                                El carrito está vacío.
                            </div>
                        )}

                        {items.length > 0 && (
                            <div className="store_cart_customer_panel">
                                <div className="store_cart_shipping">

                                    <h3>
                                        🚚 Entrega
                                    </h3>

                                    {/* ==========================
                                        ENVÍO MANUAL EXISTENTE
                                        ========================== */}

                                    <select
                                        className="qr_page_select"
                                        value={
                                            selectedShipping?.id || ""
                                        }
                                        onChange={(e) =>
                                            handleShippingChange(
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="">
                                            Seleccionar método
                                        </option>

                                        {shippingMethods.map(
                                            method => (
                                                <option
                                                    key={method.id}
                                                    value={method.id}
                                                >
                                                    {getShippingLabel(method)}
                                                </option>
                                            )
                                        )}
                                    </select>

                                    {
                                        selectedShipping && (
                                            <div className="store_cart_shipping_info">
                                                {
                                                    selectedShipping.description
                                                }
                                            </div>
                                        )
                                    }

                                    {/* ==========================
                                        ZIPNOVA
                                        ========================== */}

                                    <div className="store_cart_zipnova">

                                        {
                                            selectedShipping?.provider === "zipnova" && (
                                                <div className="store_cart_zipnova">

                                                    <h4>
                                                        Cotizar envío por código postal
                                                    </h4>

                                                    <div className="store_cart_zipnova_grid">

                                                        <input
                                                            value={customer.zip || ""}
                                                            onChange={(e) => {
                                                                updateCustomerField(
                                                                    "zip",
                                                                    e.target.value
                                                                );

                                                                setPostalResults([]);
                                                                setSelectedPostalCode(null);
                                                                setShippingDestination(null);
                                                                setShippingQuotes([]);
                                                                setSelectedShippingQuote(null);
                                                                setShippingTotal(0);
                                                            }}
                                                            placeholder="Código postal"
                                                        />

                                                    </div>

                                                    {postalResults.length > 1 && (
                                                        <div className="store_cart_field mt-2">
                                                            <label>
                                                                Seleccioná tu localidad
                                                            </label>

                                                            <select
                                                                className="qr_page_select"
                                                                value={selectedPostalCode?.id || ""}
                                                                onChange={(e) => {
                                                                    const selected =
                                                                        postalResults.find(
                                                                            item =>
                                                                                Number(item.id) === Number(e.target.value)
                                                                        );

                                                                    setSelectedPostalCode(selected || null);

                                                                    if (selected) {
                                                                        setCustomer(prev => ({
                                                                            ...prev,
                                                                            zip: selected.postal_code,
                                                                            city: selected.city,
                                                                            state: selected.state
                                                                        }));

                                                                        setShippingDestination({
                                                                            city: selected.city,
                                                                            state: selected.state,
                                                                            zipcode: selected.postal_code
                                                                        });

                                                                        setShippingQuotes([]);
                                                                        setSelectedShippingQuote(null);
                                                                        setShippingTotal(0);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">
                                                                    Seleccionar localidad
                                                                </option>

                                                                {postalResults.map(item => (
                                                                    <option
                                                                        key={item.id}
                                                                        value={item.id}
                                                                    >
                                                                        {item.city}, {item.state} · CP {item.postal_code}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    <button
                                                        type="button"
                                                        className="store_cart_quote_btn"
                                                        onClick={handleQuoteShipping}
                                                        disabled={shippingQuoteLoading || postalLoading}
                                                    >
                                                        {
                                                            shippingQuoteLoading || postalLoading
                                                                ? "Cotizando..."
                                                                : "Cotizar envío"
                                                        }
                                                    </button>

                                                    {
                                                        shippingDestination && (
                                                            <div className="store_cart_destination">

                                                                <strong>
                                                                    Destino detectado
                                                                </strong>

                                                                <div>
                                                                    {shippingDestination.city}
                                                                    {shippingDestination.state
                                                                        ? `, ${shippingDestination.state}`
                                                                        : ""}
                                                                </div>

                                                                <small>
                                                                    CP {
                                                                        shippingDestination.zipcode ||
                                                                        shippingDestination.postal_code ||
                                                                        customer.zip
                                                                    }
                                                                </small>

                                                            </div>
                                                        )
                                                    }

                                                    {
                                                        shippingQuotes.length > 0 && (
                                                            <div className="store_cart_quotes">

                                                                {shippingQuotes.map(quote => (
                                                                    <button
                                                                        type="button"
                                                                        key={quote.id}
                                                                        className={
                                                                            String(selectedShippingQuote?.id) === String(quote.id)
                                                                                ? "store_cart_quote_option active"
                                                                                : "store_cart_quote_option"
                                                                        }
                                                                        onClick={() =>
                                                                            handleSelectShippingQuote(quote)
                                                                        }
                                                                    >
                                                                        <div>
                                                                            <strong>
                                                                                {quote.carrier_name}
                                                                            </strong>

                                                                            {" · "}

                                                                            {quote.service_name}

                                                                            <br />

                                                                            <small>
                                                                                {quote.delivery_days_min}
                                                                                {" - "}
                                                                                {quote.delivery_days_max}
                                                                                {" días"}
                                                                            </small>
                                                                        </div>

                                                                        <strong>
                                                                            $
                                                                            {Number(
                                                                                quote.price || 0
                                                                            ).toLocaleString("es-AR")}
                                                                        </strong>
                                                                    </button>
                                                                ))}

                                                            </div>
                                                        )
                                                    }

                                                </div>
                                            )
                                        }

                                    </div>

                                </div>
                                <div className="store_cart_customer_data">
                                    <h3>
                                        Datos del comprador
                                    </h3>

                                    <div className="store_cart_customer_grid">

                                        <div className="store_cart_field">
                                            <label>
                                                Nombre *
                                            </label>

                                            <input
                                                value={customer.name}
                                                onChange={(e) =>
                                                    updateCustomerField(
                                                        "name",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Tu nombre"
                                            />
                                        </div>

                                        <div className="store_cart_field">
                                            <label>
                                                Teléfono *
                                            </label>

                                            <input
                                                value={customer.phone}
                                                onChange={(e) =>
                                                    updateCustomerField(
                                                        "phone",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Ej: 3546 520243"
                                            />
                                        </div>

                                        <div className="store_cart_field">
                                            <label>
                                                Email
                                            </label>

                                            <input
                                                value={customer.email}
                                                onChange={(e) =>
                                                    updateCustomerField(
                                                        "email",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="tu@email.com"
                                            />
                                        </div>

                                        {selectedRequiresAddress && (
                                            <div className="store_cart_field">
                                                <label>
                                                    Dirección *
                                                </label>

                                                <input
                                                    value={customer.address}
                                                    onChange={(e) =>
                                                        updateCustomerField(
                                                            "address",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Dirección de entrega"
                                                />
                                            </div>
                                        )}
                                        {selectedRequiresZip && (
                                            <div className="store_cart_field">
                                                <label>
                                                    Código postal *
                                                </label>

                                                <input
                                                    value={customer.zip}
                                                    onChange={(e) =>
                                                        updateCustomerField(
                                                            "zip",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Ej: 5194"
                                                />
                                            </div>
                                        )}

                                        <div className="store_cart_field full">
                                            <label>
                                                Observaciones
                                            </label>

                                            <textarea
                                                value={customer.notes}
                                                onChange={(e) =>
                                                    updateCustomerField(
                                                        "notes",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Comentarios sobre el pedido"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="store_cart_coupon">

                                    <label>
                                        Cupón promocional
                                    </label>

                                    <div className="store_cart_coupon_row">

                                        <input
                                            value={couponCode}
                                            onChange={(e) =>
                                                setCouponCode(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Ej: INVIERNO10"
                                        />

                                        <button
                                            type="button"
                                            onClick={
                                                handleApplyCoupon
                                            }
                                        >
                                            Aplicar
                                        </button>

                                    </div>

                                    {couponData && (
                                        <div className="store_cart_coupon_success">
                                            Cupón aplicado:
                                            {" "}
                                            <strong>
                                                {couponData.code}
                                            </strong>
                                        </div>
                                    )}

                                </div>

                            </div>
                        )}
                    </div>

                    <div className="store_cart_footer">

                        <div className="store_cart_summary">

                            <div>
                                <span>Subtotal</span>
                                <strong>
                                    {formatStorePrice(subtotal, store.currency || "ARS")}
                                </strong>
                            </div>

                            {discountTotal > 0 && (
                                <div>
                                    <span>Descuento</span>
                                    <strong className="discount">
                                        - {formatStorePrice(discountTotal, store.currency || "ARS")}
                                    </strong>
                                </div>
                            )}

                            {selectedShipping && (
                                <div>
                                    <span>Envío</span>
                                    <strong>
                                        {selectedShipping?.provider === "zipnova" && !selectedShippingQuote
                                            ? "Pendiente"
                                            : shippingTotal > 0
                                                ? formatStorePrice(shippingTotal, store.currency || "ARS")
                                                : "A coordinar"}
                                    </strong>
                                </div>
                            )}

                            <div className="total">
                                <span>Total</span>
                                <strong>
                                    {formatStorePrice(finalTotal, store.currency || "ARS")}
                                </strong>
                            </div>

                        </div>

                        <div className="store_cart_payment">

                            <label>
                                Medio de pago
                            </label>

                            <select
                                className="store_cart_payment_select"
                                value={paymentMethod}
                                onChange={(e) =>
                                    setPaymentMethod(e.target.value)
                                }
                            >
                                <option value="whatsapp">
                                    Coordinar por WhatsApp
                                </option>

                                <option value="mercado_pago">
                                    Mercado Pago
                                </option>

                                <option value="manual_transfer">
                                    Transferencia bancaria
                                </option>

                                <option value="cash">
                                    Efectivo / a convenir
                                </option>
                            </select>

                        </div>

                        <button
                            type="button"
                            className={
                                items.length
                                    ? "store_public_btn store_cart_checkout_btn"
                                    : "store_public_btn store_cart_checkout_btn disabled"
                            }
                            disabled={!items.length}
                            onClick={handleWhatsappCheckout}
                        >
                            {paymentMethod === "mercado_pago" && (
                                <>
                                    <SiMercadopago />
                                    <span>Pagar con Mercado Pago</span>
                                </>
                            )}

                            {paymentMethod === "manual_transfer" && (
                                <>
                                    <BsBank />
                                    <span>Finalizar por transferencia</span>
                                </>
                            )}

                            {paymentMethod === "cash" && (
                                <>
                                    <HiOutlineCash />
                                    <span>Finalizar pedido</span>
                                </>
                            )}

                            {paymentMethod === "whatsapp" && (
                                <>
                                    <FaWhatsapp />
                                    <span>Finalizar por WhatsApp</span>
                                </>
                            )}
                        </button>

                        {items.length > 0 && (
                            <button
                                type="button"
                                className="store_cart_clear mt-2"
                                onClick={handleClear}
                            >
                                Vaciar carrito
                            </button>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}
