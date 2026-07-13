// =====================================
// Archivo:
// /app/modules/store/components/public/StoreCartPageClient.jsx
//
// Descripción:
// Página pública de carrito de Tags Store.
// Muestra productos, cantidades y resumen.
// No incluye checkout.
//
// Contexto:
// store
// =====================================

"use client";

import {
    useEffect,
    useState
}
    from "react";

import Image
    from "next/image";

import Link
    from "next/link";

import {
    FiArrowLeft,
    FiMessageCircle,
    FiMinus,
    FiPlus,
    FiTrash2
}
    from "react-icons/fi";

import StoreHeaderBlock
    from "../blocks/StoreHeaderBlock";

import {
    useRouter
}
    from "next/navigation";

import {
    getCartItems,
    getCartTotal,
    removeCartItem,
    updateCartItemQuantity
}
    from "../../lib/storeCart";

import {
    formatStorePrice
}
    from "../../lib/formatStorePrice";

import showAlert
    from "@/app/components/showAlert";

import "@/app/modules/store/styles/store-public.css";

export default function StoreCartPageClient({
    store,
    settings = {}
}) {

    const [items, setItems] =
        useState([]);

    const router =
        useRouter();

    useEffect(() => {
        setItems(
            getCartItems()
        );
    }, []);

    const subtotal =
        getCartTotal(items);

    const typography =
        settings.typography || {};

    const pageStyle = {
        background:
            settings.styles?.backgroundColor || undefined,

        color:
            settings.styles?.textColor || undefined,

        padding:
            settings.styles?.padding || undefined,

        textAlign:
            settings.styles?.alignment || undefined
    };

    const cleanWhatsapp =
        String(store?.whatsapp || "").replace(/\D/g, "");

    const whatsappText =
        encodeURIComponent(
            `Hola, quiero consultar por mi carrito en ${store.name}.`
        );

    const whatsappUrl =
        cleanWhatsapp
            ? `https://wa.me/54${cleanWhatsapp}?text=${whatsappText}`
            : null;

    function createButtonStyle(prefix) {

        return {
            width:
                settings.content?.[`${prefix}ButtonWidth`] || undefined,

            maxWidth:
                "100%",

            background:
                settings.content?.[`${prefix}ButtonBackgroundColor`] || undefined,

            color:
                settings.content?.[`${prefix}ButtonTextColor`] || undefined,

            borderColor:
                settings.content?.[`${prefix}ButtonBorderColor`] || undefined,

            borderWidth:
                settings.content?.[`${prefix}ButtonBorderWidth`] || undefined,

            borderStyle:
                settings.content?.[`${prefix}ButtonBorderWidth`]
                    ? "solid"
                    : undefined,

            borderRadius:
                settings.content?.[`${prefix}ButtonRadius`] || undefined,

            padding:
                settings.content?.[`${prefix}ButtonPaddingY`] ||
                    settings.content?.[`${prefix}ButtonPaddingX`]
                    ? `${settings.content?.[`${prefix}ButtonPaddingY`] || ""} ${settings.content?.[`${prefix}ButtonPaddingX`] || ""}`
                    : undefined,

            [`--store-cart-${prefix}-hover-bg`]:
                settings.content?.[`${prefix}ButtonHoverBackgroundColor`] || undefined,

            [`--store-cart-${prefix}-hover-color`]:
                settings.content?.[`${prefix}ButtonHoverTextColor`] || undefined
        };

    }

    function createButtonWrapperStyle(prefix) {

        const align =
            settings.content?.[`${prefix}ButtonAlign`];

        return {
            display:
                "flex",

            justifyContent:
                align === "center"
                    ? "center"
                    : align === "right"
                        ? "flex-end"
                        : align === "left"
                            ? "flex-start"
                            : undefined
        };

    }

    function getButtonHoverClass(prefix) {

        const value =
            settings.content?.[`${prefix}ButtonHoverScale`];

        switch (value) {

            case "soft":
                return "store_product_btn_hover_soft";

            case "normal":
                return "store_product_btn_hover_normal";

            case "none":
                return "store_product_btn_hover_none";

            default:
                return "";

        }

    }

    const continueShoppingButtonStyle =
        createButtonStyle("continueShopping");

    const clearCartButtonStyle =
        createButtonStyle("clearCart");

    const checkoutButtonStyle =
        createButtonStyle("checkout");

    const whatsappButtonStyle =
        createButtonStyle("whatsapp");

    const continueShoppingButtonWrapperStyle =
        createButtonWrapperStyle("continueShopping");

    const clearCartButtonWrapperStyle =
        createButtonWrapperStyle("clearCart");

    const checkoutButtonWrapperStyle =
        createButtonWrapperStyle("checkout");

    const whatsappButtonWrapperStyle =
        createButtonWrapperStyle("whatsapp");

    function handleQuantity(index, quantity) {

        const nextItems =
            updateCartItemQuantity(
                index,
                Math.max(
                    1,
                    Number(quantity || 1)
                )
            );

        setItems(nextItems);

    }

    function handleRemove(index) {

        const nextItems =
            removeCartItem(index);

        setItems(nextItems);

    }

    async function handleClearCart() {

        const confirmed =
            await showAlert({
                title: "Vaciar carrito",
                text: "¿Seguro querés quitar todos los productos?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, vaciar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) {
            return;
        }

        let nextItems =
            getCartItems();

        for (let i = nextItems.length - 1; i >= 0; i--) {
            nextItems =
                removeCartItem(i);
        }

        setItems([]);

    }

    async function handleContinue() {

        if (!items.length) {
            return;
        }

        try {

            const res =
                await fetch(
                    "/api/store/public/cart/validate",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            storeId:
                                store.id,

                            items:
                                items.map(item => ({
                                    product_id:
                                        item.product_id,

                                    variant_id:
                                        item.variant_id,

                                    quantity:
                                        item.quantity
                                }))
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title:
                        "Stock insuficiente",

                    text:
                        data.error ||
                        "No hay stock suficiente.",

                    icon:
                        "warning"
                });

                return;
            }

            router.push(
                `/p/${store.slug}/checkout`
            );

        } catch (err) {

            showAlert({
                title:
                    "Error",

                text:
                    err.message,

                icon:
                    "error"
            });

        }

    }

    return (
        <main
            className="store_cart_page"
            style={pageStyle}
        >

            <StoreHeaderBlock
                entity={store}
            />

            <section className="store_cart_page_shell">
                <div className="store_cart_page_inner">

                    {
                        settings.content?.showContinueShoppingButton !== false && (

                            <div
                                className="store_cart_page_back"
                                style={continueShoppingButtonWrapperStyle}
                            >
                                <Link
                                    href={`/p/${store.slug}`}
                                    className={[
                                        "store_detail_back_link",
                                        "store_cart_continue_shopping_button",
                                        getButtonHoverClass("continueShopping")
                                    ].filter(Boolean).join(" ")}
                                    style={{
                                        ...continueShoppingButtonStyle,
                                        ...(typography.button || {})
                                    }}
                                >
                                    <FiArrowLeft />
                                    Seguir comprando
                                </Link>
                            </div>

                        )
                    }

                    <div className="row g-4 align-items-start">

                        <div className="col-12 col-md-8">

                            <div className="store_cart_page_panel">

                                <div className="store_cart_page_header">

                                    {
                                        settings.content?.showTitle !== false && (

                                            <h1
                                                style={typography.title || {}}
                                            >
                                                Carrito
                                            </h1>

                                        )
                                    }

                                    <span
                                        style={typography.text || {}}
                                    >
                                        {items.length} producto(s)
                                    </span>

                                </div>

                                {
                                    !items.length && (
                                        <div
                                            className="store_cart_page_empty"
                                            style={typography.text || {}}
                                        >
                                            Tu carrito está vacío.
                                        </div>
                                    )
                                }

                                {
                                    items.map(
                                        (item, index) => (
                                            <div
                                                key={`${item.product_id}-${item.variant_id || "base"}-${index}`}
                                                className="store_cart_page_item"
                                            >

                                                <div className="store_cart_page_product">

                                                    <div className="store_cart_page_image_wrap">
                                                        {
                                                            item.image_url ? (
                                                                <Image
                                                                    src={item.image_url}
                                                                    alt={item.product_title}
                                                                    fill
                                                                    sizes="96px"
                                                                    className="store_cart_page_image"
                                                                />
                                                            ) : (
                                                                <div className="store_cart_page_image_placeholder">
                                                                    Sin imagen
                                                                </div>
                                                            )
                                                        }
                                                    </div>

                                                    <div>
                                                        <h2
                                                            style={typography.title || {}}
                                                        >
                                                            {item.product_title}
                                                        </h2>

                                                        {
                                                            item.variant_title && (
                                                                <p
                                                                    style={typography.text || {}}
                                                                >
                                                                    {item.variant_title}
                                                                </p>
                                                            )
                                                        }

                                                        {
                                                            settings.content?.showRemoveButton !== false && (
                                                                <button
                                                                    type="button"
                                                                    className="store_cart_page_remove"
                                                                    onClick={() =>
                                                                        handleRemove(index)
                                                                    }
                                                                >
                                                                    <FiTrash2 />
                                                                    Quitar
                                                                </button>
                                                            )
                                                        }
                                                    </div>

                                                </div>

                                                {
                                                    settings.content?.showQuantity !== false && (
                                                        <div className="store_cart_page_qty">
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    Number(item.quantity) <= 1
                                                                }
                                                                onClick={() =>
                                                                    handleQuantity(
                                                                        index,
                                                                        Number(item.quantity) - 1
                                                                    )
                                                                }
                                                            >
                                                                <FiMinus />
                                                            </button>

                                                            <strong>
                                                                {item.quantity}
                                                            </strong>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleQuantity(
                                                                        index,
                                                                        Number(item.quantity) + 1
                                                                    )
                                                                }
                                                            >
                                                                <FiPlus />
                                                            </button>
                                                        </div>
                                                    )
                                                }

                                                <div className="store_cart_page_price">

                                                    {
                                                        settings.content?.showUnitPrice !== false && (
                                                            <span
                                                                style={typography.price || {}}
                                                            >
                                                                {
                                                                    formatStorePrice(
                                                                        item.unit_price,
                                                                        item.currency || store.currency || "ARS"
                                                                    )
                                                                }
                                                            </span>
                                                        )
                                                    }

                                                    {
                                                        settings.content?.showItemSubtotal !== false && (
                                                            <strong
                                                                style={typography.price || {}}
                                                            >
                                                                {
                                                                    formatStorePrice(
                                                                        item.total_price,
                                                                        item.currency || store.currency || "ARS"
                                                                    )
                                                                }
                                                            </strong>
                                                        )
                                                    }

                                                </div>

                                            </div>
                                        )
                                    )
                                }

                            </div>

                            {
                                settings.content?.showClearCartButton !== false &&
                                items.length > 0 && (

                                    <div
                                        className="mt-3"
                                        style={clearCartButtonWrapperStyle}
                                    >
                                        <button
                                            type="button"
                                            className={[
                                                "store_cart_page_remove",
                                                "store_cart_clear_button",
                                                getButtonHoverClass("clearCart")
                                            ].filter(Boolean).join(" ")}
                                            style={{
                                                ...clearCartButtonStyle,
                                                ...(typography.button || {})
                                            }}
                                            onClick={handleClearCart}
                                        >
                                            <FiTrash2 />
                                            Vaciar carrito
                                        </button>
                                    </div>

                                )
                            }

                        </div>

                        <div className="col-12 col-md-4">

                            {
                                settings.content?.showSummary !== false && (

                                    <aside className="store_cart_summary_panel">

                                        <h2
                                            style={typography.title || {}}
                                        >
                                            Resumen de compra
                                        </h2>

                                        {
                                            settings.content?.showSubtotal !== false && (
                                                <div className="store_cart_summary_row">
                                                    <span
                                                        style={typography.text || {}}
                                                    >
                                                        Productos
                                                    </span>

                                                    <strong
                                                        style={typography.price || {}}
                                                    >
                                                        {
                                                            formatStorePrice(
                                                                subtotal,
                                                                store.currency || "ARS"
                                                            )
                                                        }
                                                    </strong>
                                                </div>
                                            )
                                        }

                                        {
                                            settings.content?.showTotal !== false && (
                                                <div className="store_cart_summary_total">
                                                    <span
                                                        style={typography.text || {}}
                                                    >
                                                        Total
                                                    </span>

                                                    <strong
                                                        style={typography.total || typography.price || {}}
                                                    >
                                                        {
                                                            formatStorePrice(
                                                                subtotal,
                                                                store.currency || "ARS"
                                                            )
                                                        }
                                                    </strong>
                                                </div>
                                            )
                                        }

                                        {
                                            settings.content?.showCheckoutButton !== false && (

                                                <div style={checkoutButtonWrapperStyle}>
                                                    <button
                                                        type="button"
                                                        className={[
                                                            "store_btn_primary",
                                                            "store_cart_continue_btn",
                                                            "store_cart_checkout_button",
                                                            getButtonHoverClass("checkout")
                                                        ].filter(Boolean).join(" ")}
                                                        style={{
                                                            ...checkoutButtonStyle,
                                                            ...(typography.button || {})
                                                        }}
                                                        disabled={!items.length}
                                                        onClick={handleContinue}
                                                    >
                                                        Continuar
                                                    </button>
                                                </div>

                                            )
                                        }

                                        {
                                            settings.content?.showWhatsappButton !== false &&
                                            whatsappUrl && (

                                                <div
                                                    className="mt-3"
                                                    style={whatsappButtonWrapperStyle}
                                                >
                                                    <a
                                                        href={whatsappUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={[
                                                            "store_btn_whatsapp",
                                                            "store_cart_whatsapp_button",
                                                            getButtonHoverClass("whatsapp")
                                                        ].filter(Boolean).join(" ")}
                                                        style={{
                                                            ...whatsappButtonStyle,
                                                            ...(typography.button || {})
                                                        }}
                                                    >
                                                        <FiMessageCircle />
                                                        Consultar por WhatsApp
                                                    </a>
                                                </div>

                                            )
                                        }

                                    </aside>

                                )
                            }

                        </div>

                    </div>

                </div>
            </section>

            <style jsx>{`
                .store_cart_continue_shopping_button:hover {
                    background: var(--store-cart-continueShopping-hover-bg, transparent) !important;
                    color: var(--store-cart-continueShopping-hover-color, var(--qr-primary)) !important;
                }

                .store_cart_clear_button:hover {
                    background: var(--store-cart-clearCart-hover-bg, transparent) !important;
                    color: var(--store-cart-clearCart-hover-color, inherit) !important;
                }

                .store_cart_checkout_button:hover {
                    background: var(--store-cart-checkout-hover-bg, var(--qr-primary)) !important;
                    color: var(--store-cart-checkout-hover-color, var(--qr-primary-text)) !important;
                }

                .store_cart_whatsapp_button:hover {
                    background: var(--store-cart-whatsapp-hover-bg, var(--qr-primary)) !important;
                    color: var(--store-cart-whatsapp-hover-color, var(--qr-primary-text)) !important;
                }
            `}</style>

        </main>
    );
}