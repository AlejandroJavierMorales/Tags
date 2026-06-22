// =====================================
// COMPONENT: StoreProductDetailRenderer
// Descripción: Detalle público completo de producto de Tags Tienda.
// Incluye galería/carrusel, variantes, precio final y WhatsApp.
// =====================================

"use client";

import { useEffect, useMemo, useState } from "react";

import {
    formatStorePrice,
    getProductFinalPrice,
    hasProductSale
} from "../lib/formatStorePrice";



import StoreCartDrawer
    from "./StoreCartDrawer";

import {
    addCartItem,
    getCartCount,
    getCartItems
} from "../lib/storeCart";

import "@/app/styles/tags_store_public.css";

import {
    FaShoppingCart
} from "react-icons/fa";
import showAlert from "@/app/components/showAlert";

function cleanPhone(phone) {
    return String(phone || "").replace(/\D/g, "");
}

function hasValue(value) {
    return (
        value !== null &&
        value !== undefined &&
        value !== ""
    );
}

function getVariantFinalPrice(product, variant) {
    if (hasValue(variant?.sale_price)) {
        return Number(variant.sale_price);
    }

    if (hasValue(variant?.price)) {
        return Number(variant.price);
    }

    return getProductFinalPrice(product);
}

function getOldPrice(product, variant, finalPrice) {
    if (hasValue(variant?.sale_price)) {
        return Number(variant.price || product.price || 0);
    }

    if (!variant && hasProductSale(product)) {
        return Number(product.price || 0);
    }

    return null;
}

export default function StoreProductDetailRenderer({
    store,
    product,
    images = [],
    variants = []
}) {
    const [activeImageIndex, setActiveImageIndex] =
        useState(0);

    const [selectedVariantId, setSelectedVariantId] =
        useState("");

    const [quantity, setQuantity] =
        useState(1);

    const [cartOpen, setCartOpen] =
        useState(false);

    const [cartCount, setCartCount] =
        useState(0);

    useEffect(() => {
        function refreshCart() {
            setCartCount(
                getCartCount(
                    getCartItems()
                )
            );
        }

        refreshCart();

        window.addEventListener(
            "tags_store_cart_updated",
            refreshCart
        );

        return () => {
            window.removeEventListener(
                "tags_store_cart_updated",
                refreshCart
            );
        };
    }, []);

    const selectedVariant =
        variants.find(variant =>
            Number(variant.id) === Number(selectedVariantId)
        );

    const activeImage =
        images[activeImageIndex]?.image_url ||
        product.primary_image_url ||
        "";

    const currency =
        product.currency ||
        store.currency ||
        "ARS";

    const finalPrice =
        getVariantFinalPrice(
            product,
            selectedVariant
        );

    const oldPrice =
        getOldPrice(
            product,
            selectedVariant,
            finalPrice
        );

    const hasVariants =
        variants.length > 0;

    const allowNegativeStock =
        store.settings_json?.allowNegativeStock === true;

    const canAsk =
        !hasVariants || !!selectedVariant;

    const stockLimit =
        selectedVariant
            ? Number(selectedVariant.stock_qty || 0)
            : Number(product.stock_qty || 0);

    const hasStockControl =
        selectedVariant
            ? true
            : Number(product.stock_enabled) === 1;

    const availableStock =
        hasStockControl
            ? stockLimit
            : null;

    const canBuy =
        canAsk &&
        (
            allowNegativeStock ||
            !hasStockControl ||
            availableStock > 0
        );

    function updateQuantity(nextValue) {
        let next =
            Math.max(
                1,
                Number(nextValue || 1)
            );

        if (
            !allowNegativeStock &&
            hasStockControl &&
            availableStock !== null
        ) {
            next =
                Math.min(
                    next,
                    availableStock
                );
        }

        setQuantity(next);
    }



    function previousImage() {
        if (!images.length) return;

        setActiveImageIndex(prev =>
            prev === 0
                ? images.length - 1
                : prev - 1
        );
    }

    function nextImage() {
        if (!images.length) return;

        setActiveImageIndex(prev =>
            prev === images.length - 1
                ? 0
                : prev + 1
        );
    }

    const whatsappHref =
        useMemo(() => {
            const phone =
                cleanPhone(store.whatsapp);

            if (!phone) {
                return "#";
            }

            const lines = [
                "Hola! Quiero consultar por este producto:",
                "",
                `Producto: ${product.title}`,
                selectedVariant
                    ? `Variante: ${selectedVariant.title || selectedVariant.options_label}`
                    : null,
                `Cantidad: ${quantity}`,
                `Precio unitario: ${formatStorePrice(finalPrice, currency)}`,
                `Total estimado: ${formatStorePrice(finalPrice * quantity, currency)}`,
                "",
                `Link: /p/${store.slug}/products/${product.id}`
            ].filter(Boolean);

            return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
        }, [
            store.whatsapp,
            store.slug,
            product.id,
            product.title,
            selectedVariant,
            quantity,
            finalPrice,
            currency
        ]);

    return (
        <main
            className="store_public_page"
            style={{
                "--store-bg": store.styles_json?.backgroundColor || "#f8fafc",
                "--store-text": store.styles_json?.textColor || "#111827",
                "--store-muted": store.styles_json?.mutedColor || "#64748b",
                "--store-border": store.styles_json?.borderColor || "#e5e7eb",
                "--store-primary": store.styles_json?.primaryColor || "#16a34a",
                "--store-primary-text": store.styles_json?.primaryTextColor || "#ffffff",
                "--store-primary-hover": store.styles_json?.primaryHoverColor || "#15803d",
                "--store-surface": store.styles_json?.surfaceColor || "#ffffff",
                "--store-surface-alt": store.styles_json?.surfaceAltColor || "#f3f4f6",
                "--store-radius": store.styles_json?.borderRadius || "18px",
                "--store-shadow": store.styles_json?.shadow || "0 14px 32px rgba(15,23,42,.08)"
            }}
        >
            <div className="store_product_detail_shell">

                <a
                    href={`/p/${store.slug}`}
                    className="store_product_back"
                >
                    ← Volver a la tienda
                </a>

                <section className="store_product_detail">

                    <div className="store_product_gallery">

                        <div className="store_product_main_image_box">
                            {activeImage ? (
                                <img
                                    src={activeImage}
                                    alt={product.title}
                                    className="store_product_main_image"
                                />
                            ) : (
                                <div className="store_product_no_image">
                                    📦
                                </div>
                            )}

                            {images.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        className="store_product_carousel_btn left"
                                        onClick={previousImage}
                                    >
                                        ‹
                                    </button>

                                    <button
                                        type="button"
                                        className="store_product_carousel_btn right"
                                        onClick={nextImage}
                                    >
                                        ›
                                    </button>
                                </>
                            )}
                        </div>

                        {images.length > 1 && (
                            <div className="store_product_thumbs">
                                {images.map((image, index) => (
                                    <button
                                        key={image.id || image.image_url}
                                        type="button"
                                        className={
                                            activeImageIndex === index
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() =>
                                            setActiveImageIndex(index)
                                        }
                                    >
                                        <img
                                            src={image.image_url}
                                            alt=""
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                    </div>

                    <div className="store_product_info">

                        <small className="store_public_product_category">
                            {product.category_name || store.name}
                        </small>

                        <h1>
                            {product.title}
                        </h1>

                        {product.sku && (
                            <div className="store_product_sku">
                                SKU: {product.sku}
                            </div>
                        )}

                        <div className="store_product_price_block">
                            <strong>
                                {formatStorePrice(finalPrice, currency)}
                            </strong>

                            {oldPrice && Number(oldPrice) > Number(finalPrice) && (
                                <small>
                                    {formatStorePrice(oldPrice, currency)}
                                </small>
                            )}
                        </div>

                        {hasVariants && (
                            <div className="store_product_variants">
                                <label>
                                    Variante
                                </label>

                                <select
                                    value={selectedVariantId}
                                    onChange={(e) =>
                                        setSelectedVariantId(e.target.value)
                                    }
                                >
                                    <option value="">
                                        Seleccioná una variante
                                    </option>

                                    {variants.map(variant => (
                                        <option
                                            key={variant.id}
                                            value={variant.id}
                                        >
                                            {variant.title || variant.options_label}
                                            {!allowNegativeStock && Number(variant.stock_qty || 0) <= 0
                                                ? " - Sin stock"
                                                : ""}
                                        </option>
                                    ))}
                                </select>

                                {selectedVariant && (
                                    <small className="store_product_variant_help">
                                        {selectedVariant.options_label || selectedVariant.title}
                                        {" · "}
                                        Stock: {selectedVariant.stock_qty ?? 0}
                                    </small>
                                )}
                            </div>
                        )}



                        <div className="store_product_quantity">
                            <label>
                                Cantidad
                            </label>

                            <div>
                                <button
                                    type="button"
                                    disabled={quantity <= 1}
                                    onClick={() =>
                                        updateQuantity(quantity - 1)
                                    }
                                >
                                    -
                                </button>

                                <input
                                    type="number"
                                    min="1"
                                    max={
                                        !allowNegativeStock && availableStock !== null
                                            ? availableStock
                                            : undefined
                                    }
                                    value={quantity}
                                    onChange={(e) =>
                                        updateQuantity(e.target.value)
                                    }
                                />

                                <button
                                    type="button"
                                    disabled={
                                        !allowNegativeStock &&
                                        availableStock !== null &&
                                        quantity >= availableStock
                                    }
                                    onClick={() =>
                                        updateQuantity(quantity + 1)
                                    }
                                >
                                    +
                                </button>
                            </div>

                            {availableStock !== null && (
                                <small className="store_product_variant_help">
                                    Stock disponible: {availableStock}
                                </small>
                            )}
                        </div>

                        {product.description && (
                            <div className="store_product_description">
                                {product.description}
                            </div>
                        )}

                        {hasVariants && !selectedVariant && (
                            <div className="store_product_warning">
                                Seleccioná una variante para consultar.
                            </div>
                        )}



                        <div className="store_product_actions">

                            <button
                                type="button"
                                className="store_public_btn"
                                disabled={!canBuy}
                                onClick={() => {
                                    addCartItem({
                                        product_id: product.id,
                                        product_title: product.title,
                                        variant_id: selectedVariant?.id || null,
                                        variant_title:
                                            selectedVariant?.title ||
                                            selectedVariant?.options_label ||
                                            null,
                                        quantity,
                                        unit_price: finalPrice,
                                        total_price: finalPrice * quantity,
                                        currency,
                                        available_stock:
                                            availableStock,
                                        image_url:
                                            activeImage || product.primary_image_url || null,
                                    });

                                    showAlert({
                                        title: "Producto agregado",
                                        text: "El producto fue agregado al carrito.",
                                        icon: "success",
                                        timer: 1600
                                    });

                                    setCartOpen(true);
                                }}
                            >
                                <>
                                    <FaShoppingCart />
                                    <span>
                                        {` Agregar al carrito`}
                                    </span>
                                </>
                            </button>

                            {store.whatsapp && (
                                <a
                                    className={
                                        canBuy
                                            ? "store_public_btn store_product_whatsapp_btn"
                                            : "store_public_btn store_product_whatsapp_btn disabled"
                                    }
                                    href={canBuy ? whatsappHref : "#"}
                                    target="_blank"
                                    onClick={(e) => {
                                        if (!canBuy) {
                                            e.preventDefault();
                                        }
                                    }}
                                >
                                    Comprar por WhatsApp
                                </a>
                            )}

                        </div>

                    </div>

                </section>

            </div>
            <button
                type="button"
                className="store_cart_floating_btn"
                onClick={() => setCartOpen(true)}
            >
                <span className="store_cart_count">({cartCount})</span>
                <span className="store_cart_icon">
                    <FaShoppingCart />
                </span>

            </button>

            <StoreCartDrawer
                store={store}
                isOpen={cartOpen}
                onClose={() => setCartOpen(false)}
            />
        </main>
    );
}