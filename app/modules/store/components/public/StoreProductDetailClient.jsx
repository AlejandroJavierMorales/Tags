// =====================================
// Archivo:
// /app/modules/store/components/public/StoreProductDetailClient.jsx
//
// Descripción:
// Detalle público profesional de producto.
// Usa header real de tienda, galería,
// panel sticky de compra y variantes
// seleccionables tipo MercadoLibre.
//
// Contexto:
// store
// =====================================

"use client";

import {
    useMemo,
    useState
}
    from "react";

import Image
    from "next/image";

import Link
    from "next/link";

import {
    addCartItem
}
    from "../../lib/storeCart";

import showAlert
    from "@/app/components/showAlert";

import {
    FiArrowLeft,
    FiChevronLeft,
    FiChevronRight,
    FiMinus,
    FiPlus,
    FiShoppingCart,
    FiShield,
    FiTruck,
    FiMessageCircle,
    FiShare2
}
    from "react-icons/fi";

import StoreHeaderBlock
    from "../blocks/StoreHeaderBlock";

import {
    formatStorePrice,
}
    from "../../lib/formatStorePrice";

import StoreProductActions from "./StoreProductActions";
import { getStoreReturnUrl, withStoreReturnUrl } from "../../lib/storePublicContext";

export default function StoreProductDetailClient({
    store,
    product,
    images = [],
    variants = [],
    variantOptions = [],
    settings = {}
}) {

    const storeReturnUrl = getStoreReturnUrl(store);

    const [imageIndex, setImageIndex] = useState(0);

    const [quantity, setQuantity] = useState(1);

    const typography = settings.typography || {};

    const [selectedOptions, setSelectedOptions] = useState(() => {

        const firstVariant =
            variants?.[0];

        const initial = {};

        firstVariant?.options?.forEach(
            (option) => {
                initial[option.option_id] =
                    option.value_id;
            }
        );

        return initial;

    });

    const selectedVariant =
        useMemo(
            () => {

                if (!variants.length) {
                    return null;
                }

                return variants.find(
                    (variant) => {

                        return variant.options?.every(
                            (option) =>
                                String(
                                    selectedOptions[
                                    option.option_id
                                    ]
                                ) ===
                                String(
                                    option.value_id
                                )
                        );

                    }
                ) || null;

            },
            [
                variants,
                selectedOptions
            ]
        );

    const allowNegativeStock =
        store?.settings_json?.allowNegativeStock === true;

    const currentStock =
        selectedVariant
            ? selectedVariant.stock_qty
            : product.stock_qty;

    const stockEnabled =
        selectedVariant
            ? true
            : Number(product.stock_enabled) === 1;

    const shouldLimitStock =
        stockEnabled &&
        !allowNegativeStock;

    const maxQuantity =
        shouldLimitStock
            ? Number(currentStock || 0)
            : null;

    const activeImage =
        images?.[imageIndex] || null;

    function hasValidPrice(value) {
        return (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            Number(value) > 0
        );
    }

    const variantPrice =
        hasValidPrice(selectedVariant?.price)
            ? Number(selectedVariant.price)
            : null;

    const variantSalePrice =
        hasValidPrice(selectedVariant?.sale_price)
            ? Number(selectedVariant.sale_price)
            : null;

    const productPrice =
        hasValidPrice(product.price)
            ? Number(product.price)
            : null;

    const productSalePrice =
        hasValidPrice(product.sale_price)
            ? Number(product.sale_price)
            : null;

    const finalPrice =
        variantSalePrice ??
        variantPrice ??
        productSalePrice ??
        productPrice ??
        0;

    const regularPrice =
        variantPrice ??
        productPrice ??
        finalPrice;

    const productHasSale =
        (
            variantSalePrice !== null &&
            variantPrice !== null &&
            variantSalePrice < variantPrice
        ) ||
        (
            !selectedVariant &&
            productSalePrice !== null &&
            productPrice !== null &&
            productSalePrice < productPrice
        );

    const whatsappText =
        encodeURIComponent(
            `Hola, quiero consultar por el producto: ${product.title}`
        );

    const whatsappUrl =
        store?.whatsapp
            ? `https://wa.me/54${store.whatsapp}?text=${whatsappText}`
            : null;

    function getSelectedImageUrl() {
        if (selectedVariant?.image_url) {
            return selectedVariant.image_url;
        }

        if (activeImage?.image_url) {
            return activeImage.image_url;
        }

        return "";
    }

    function handleAddToCart({
        goToCart = false
    } = {}) {

        if (
            variants.length > 0 &&
            !selectedVariant
        ) {
            showAlert({
                title: "Seleccioná una variante",
                text: "Elegí una combinación disponible para agregar el producto.",
                icon: "warning"
            });

            return;
        }

        if (
            shouldLimitStock &&
            maxQuantity <= 0
        ) {
            showAlert({
                title: "Sin stock",
                text: "Este producto no tiene stock disponible.",
                icon: "warning"
            });

            return;
        }

        if (
            shouldLimitStock &&
            quantity > maxQuantity
        ) {
            showAlert({
                title: "Stock insuficiente",
                text: `Solo hay ${maxQuantity} unidad(es) disponibles.`,
                icon: "warning"
            });

            setQuantity(
                Math.max(1, maxQuantity)
            );

            return;
        }

        const unitPrice =
            Number(finalPrice || 0);



        const cartItem = {
            product_id:
                product.id,

            variant_id:
                selectedVariant?.id || null,

            product_title:
                product.title,

            variant_title:
                selectedVariant
                    ? (
                        selectedVariant.options
                            ?.map(option =>
                                `${option.option_name}: ${option.value}`
                            )
                            .join(" | ") ||
                        selectedVariant.title
                    )
                    : null,

            image_url:
                getSelectedImageUrl(),

            quantity:
                quantity,

            unit_price:
                unitPrice,

            total_price:
                unitPrice * Number(quantity || 1),

            currency:
                product.currency || store.currency || "ARS",

            available_stock:
                selectedVariant?.stock_qty ??
                product.stock_qty ??
                null
        };

        addCartItem(
            cartItem
        );

        if (goToCart) {
            window.location.href =
                withStoreReturnUrl(`/p/${store.slug}/cart`, store);

            return;
        }

        showAlert({
            title: "Producto agregado",
            text: "El producto se agregó al carrito.",
            icon: "success",
            confirmButtonText: "Ver carrito",
            showCancelButton: true,
            cancelButtonText: "Seguir comprando"
        }).then((result) => {
            if (result) {
                window.location.href =
                    withStoreReturnUrl(`/p/${store.slug}/cart`, store);
            }
        });

    }

    function selectOption(
        optionId,
        valueId
    ) {

        setSelectedOptions(
            previous => ({
                ...previous,
                [optionId]: valueId
            })
        );

    }

    function prevImage() {

        if (!images.length) {
            return;
        }

        setImageIndex(
            imageIndex === 0
                ? images.length - 1
                : imageIndex - 1
        );

    }

    function nextImage() {

        if (!images.length) {
            return;
        }

        setImageIndex(
            imageIndex === images.length - 1
                ? 0
                : imageIndex + 1
        );

    }


    async function handleShareProduct() {
        const productUrl =
            `${window.location.origin}/p/${store.slug}/products/${product.id}`;

        const shareData = {
            title:
                product.title,
            text:
                `Mirá este producto en ${store.name}`,
            url:
                productUrl
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                return;
            }

            await navigator.clipboard.writeText(
                productUrl
            );

            showAlert({
                title: "Enlace copiado",
                text: "El link del producto se copió al portapapeles.",
                icon: "success",
                timer: 1400
            });

        } catch (err) {
            if (err?.name === "AbortError") {
                return;
            }

            showAlert({
                title: "No se pudo compartir",
                text: "Copiá el enlace desde la barra del navegador.",
                icon: "info"
            });
        }
    }
    const pageStyle = {

        background:
            settings.styles?.backgroundColor || undefined,

        color:
            settings.styles?.textColor || undefined,

        border:
            settings.content?.panelBorder === false
                ? "none"
                : undefined,

        borderColor:
            settings.content?.panelBorderColor || undefined,

        borderRadius:
            settings.content?.panelRadius || undefined,

        padding:
            settings.content?.panelPadding || undefined,

        boxShadow:
            getShadow(
                settings.content?.panelShadow
            )

    };

    function getShadow(shadow) {

        switch (shadow) {

            case "soft":
                return "0 6px 20px rgba(0,0,0,.08)";

            case "medium":
                return "0 10px 30px rgba(0,0,0,.12)";

            case "strong":
                return "0 18px 40px rgba(0,0,0,.18)";

            default:
                return undefined;

        }

    }
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

            [`--store-detail-${prefix}-hover-bg`]:
                settings.content?.[`${prefix}ButtonHoverBackgroundColor`] || undefined,

            [`--store-detail-${prefix}-hover-color`]:
                settings.content?.[`${prefix}ButtonHoverTextColor`] || undefined
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

    const buyButtonStyle =
        createButtonStyle("buy");

    const cartButtonStyle =
        createButtonStyle("cart");

    const whatsappButtonStyle =
        createButtonStyle("whatsapp");

    const shareButtonStyle =
        createButtonStyle("share");

    function createButtonWrapperStyle(prefix) {
        const align =
            settings.content?.[`${prefix}ButtonAlign`];

        return {
            display: "flex",
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

const buyButtonWrapperStyle = createButtonWrapperStyle("buy");
const cartButtonWrapperStyle = createButtonWrapperStyle("cart");
const whatsappButtonWrapperStyle = createButtonWrapperStyle("whatsapp");
const shareButtonWrapperStyle = createButtonWrapperStyle("share");

    /*  UI  */

    return (
        <main className="store_product_detail_page" style={pageStyle}>

            {!storeReturnUrl && (
                <StoreHeaderBlock
                    entity={store}
                />
            )}

            <div className="store_detail_breadcrumb">
                {
                    settings.content?.showBreadcrumb !== false && (
                        <div className="container">
                            <Link
                                href={storeReturnUrl || `/p/${store.slug}`}
                                className="store_detail_back_link"
                            >
                                <FiArrowLeft />
                                Volver a la tienda
                            </Link>
                        </div>
                    )}
            </div>

            <section className="store_detail_shell">
                <div className="container">

                    <div className="row g-4 align-items-start">

                        <div className="col-12 col-lg-8">
                            <div
                                className="store_detail_gallery_panel"
                            /* style={galleryStyle} */
                            >

                                <StoreProductActions
                                    store={store}
                                    product={product}
                                    settings={settings}
                                />

                                <div className="row g-3">

                                    {
                                        images.length > 1 && (
                                            <div className="col-auto d-none d-md-block">
                                                <div className="store_detail_thumbs">
                                                    {
                                                        images.map(
                                                            (image, index) => (
                                                                <button
                                                                    key={image.id}
                                                                    type="button"
                                                                    className={
                                                                        index === imageIndex
                                                                            ? "store_detail_thumb active"
                                                                            : "store_detail_thumb"
                                                                    }
                                                                    onClick={() =>
                                                                        setImageIndex(index)
                                                                    }
                                                                >
                                                                    <Image
                                                                        src={image.image_url}
                                                                        alt={product.title}
                                                                        width={72}
                                                                        height={72}
                                                                        className="store_detail_thumb_img"
                                                                    />
                                                                </button>
                                                            )
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        )
                                    }

                                    <div className="col">
                                        <div className="store_detail_main_image">

                                            {
                                                activeImage?.image_url ? (
                                                    <Image
                                                        src={activeImage.image_url}
                                                        alt={product.title}
                                                        fill
                                                        priority
                                                        sizes="
                                                            (max-width: 991px) 100vw,
                                                            65vw
                                                        "
                                                        className="store_detail_main_img"
                                                    />
                                                ) : (
                                                    <div className="store_detail_no_image">
                                                        Sin imagen
                                                    </div>
                                                )
                                            }

                                            {
                                                images.length > 1 && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="store_detail_gallery_arrow left"
                                                            onClick={prevImage}
                                                        >
                                                            <FiChevronLeft />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="store_detail_gallery_arrow right"
                                                            onClick={nextImage}
                                                        >
                                                            <FiChevronRight />
                                                        </button>
                                                    </>
                                                )
                                            }

                                        </div>

                                        {
                                            images.length > 1 && (
                                                <div className="store_detail_dots">
                                                    {
                                                        images.map(
                                                            (image, index) => (
                                                                <button
                                                                    key={image.id}
                                                                    type="button"
                                                                    className={
                                                                        index === imageIndex
                                                                            ? "store_detail_dot active"
                                                                            : "store_detail_dot"
                                                                    }
                                                                    onClick={() =>
                                                                        setImageIndex(index)
                                                                    }
                                                                />
                                                            )
                                                        )
                                                    }
                                                </div>
                                            )
                                        }

                                    </div>

                                </div>

                            </div>
                            {
                                settings.content?.showDescription !== false && (
                                    <>
                                        {
                                            product.description && (
                                                <div className="store_detail_description_panel mt-4">
                                                    <h2 style={typography.title || {}}>
                                                        Descripción
                                                    </h2>
                                                    <p style={typography.text || {}}                                                    >
                                                        {product.description}
                                                    </p>
                                                </div>
                                            )
                                        }
                                    </>
                                )
                            }
                        </div>

                        <div className="col-12 col-lg-4">

                            <aside className="store_detail_buy_panel">



                                <div className="d-flex flex-wrap gap-2 mb-3">
                                    {
                                        settings.content?.showFeaturedBadge !== false && (
                                            <>
                                                {

                                                    Number(product.is_featured) === 1 && (
                                                        <span
                                                            className="store_detail_badge success"
                                                            style={typography.badge || {}}
                                                        >
                                                            Destacado
                                                        </span>
                                                    )
                                                }
                                            </>
                                        )}
                                    {
                                        settings.content?.showCategoryBadge !== false && (
                                            <>
                                                {
                                                    product.category_name && (
                                                        <span
                                                            className="store_detail_badge"
                                                            style={typography.category || {}}
                                                        >
                                                            {product.category_name}
                                                        </span>
                                                    )
                                                }
                                            </>)}
                                </div>

                                {
                                    settings.content?.showTitle !== false && (
                                        <h1
                                            className="store_detail_title"
                                            style={typography.title || {}}
                                        >
                                            {product.title}
                                        </h1>
                                    )}
                                <div className="store_detail_price_box">
                                    <div
                                        className="store_detail_price"
                                        style={typography.price || {}}
                                    >
                                        {
                                            settings.content?.showPrice !== false && (
                                                <>
                                                    {
                                                        formatStorePrice(
                                                            finalPrice,
                                                            product.currency
                                                        )
                                                    }

                                                </>)}
                                    </div>
                                    {
                                        settings.content?.showOldPrice !== false &&
                                        product.sale_price > 0 && (
                                            <>       {
                                                productHasSale && (
                                                    <div
                                                        className="store_detail_old_price"
                                                        style={typography.oldPrice || {}}
                                                    >
                                                        {
                                                            formatStorePrice(
                                                                regularPrice,
                                                                product.currency
                                                            )
                                                        }
                                                    </div>
                                                )
                                            }
                                            </>)}
                                </div>
                                {
                                    settings.content?.showVariants !== false && (
                                        <>
                                            {
                                                variantOptions.length > 0 && (
                                                    <div className="store_variant_selector">
                                                        {
                                                            variantOptions.map(
                                                                (option) => (
                                                                    <div
                                                                        key={option.option_id}
                                                                        className="store_variant_group"
                                                                    >
                                                                        <div className="store_variant_label">
                                                                            {option.name}
                                                                        </div>

                                                                        <div className="store_variant_values">
                                                                            {
                                                                                option.values.map(
                                                                                    (value) => {

                                                                                        const active =
                                                                                            String(
                                                                                                selectedOptions[
                                                                                                option.option_id
                                                                                                ]
                                                                                            ) ===
                                                                                            String(
                                                                                                value.value_id
                                                                                            );

                                                                                        return (
                                                                                            <button
                                                                                                key={value.value_id}
                                                                                                type="button"
                                                                                                className={
                                                                                                    active
                                                                                                        ? "store_variant_chip active"
                                                                                                        : "store_variant_chip"
                                                                                                }
                                                                                                onClick={() =>
                                                                                                    selectOption(
                                                                                                        option.option_id,
                                                                                                        value.value_id
                                                                                                    )
                                                                                                }
                                                                                            >
                                                                                                {value.value}
                                                                                            </button>
                                                                                        );

                                                                                    }
                                                                                )
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )
                                                        }

                                                        {
                                                            variants.length > 0 &&
                                                            !selectedVariant && (
                                                                <div className="store_variant_warning">
                                                                    Esta combinación no está disponible.
                                                                </div>
                                                            )
                                                        }
                                                    </div>
                                                )
                                            }
                                        </>)}
                                {
                                    settings.content?.showStock !== false && (
                                        <div
                                            className="store_detail_stock"
                                            style={typography.stock || {}}
                                        >
                                            {
                                                stockEnabled
                                                    ? allowNegativeStock
                                                        ? `${Number(currentStock || 0)} disponible(s) · permite compra sin stock`
                                                        : Number(currentStock || 0) > 0
                                                            ? `${Number(currentStock || 0)} disponible(s)`
                                                            : "Sin stock"
                                                    : "Stock a coordinar"
                                            }
                                        </div>
                                    )
                                }

                                {
                                    settings.content?.showQuantity !== false && (
                                        <div className="store_detail_quantity_row">
                                            <span>
                                                Cantidad
                                            </span>

                                            <div className="store_detail_quantity">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setQuantity(
                                                            Math.max(1, quantity - 1)
                                                        )
                                                    }
                                                >
                                                    <FiMinus />
                                                </button>

                                                <strong>
                                                    {quantity}
                                                </strong>

                                                <button
                                                    type="button"
                                                    disabled={
                                                        maxQuantity !== null &&
                                                        quantity >= maxQuantity
                                                    }
                                                    onClick={() =>
                                                        setQuantity(
                                                            maxQuantity !== null
                                                                ? Math.min(quantity + 1, maxQuantity)
                                                                : quantity + 1
                                                        )
                                                    }
                                                >
                                                    <FiPlus />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }

                                <div className="d-grid gap-2 mt-4">
                                    {
                                        settings.content?.showBuyNowButton !== false && (
                                            <div style={buyButtonWrapperStyle}>
                                            <button
                                                type="button"
                                                style={{
                                                    ...buyButtonStyle,
                                                    ...(typography.button || {})
                                                }}
                                                className={[
                                                    "btn",
                                                    "store_btn_primary",
                                                    "store_detail_buy_button",
                                                    getButtonHoverClass("buy")
                                                ].filter(Boolean).join(" ")}
                                                disabled={
                                                    (
                                                        variants.length > 0 &&
                                                        !selectedVariant
                                                    ) ||
                                                    (
                                                        shouldLimitStock &&
                                                        maxQuantity <= 0
                                                    )
                                                }
                                                onClick={() =>
                                                    handleAddToCart({
                                                        goToCart: true
                                                    })
                                                }
                                            >
                                                Comprar ahora
                                            </button>
                                            </div>
                                        )
                                    }

                                    {
                                        settings.content?.showAddToCartButton !== false && (
                                            <button
                                                type="button"
                                                style={{
                                                    ...cartButtonStyle,
                                                    ...(typography.button || {})
                                                }}
                                                className={[
                                                    "btn",
                                                    "store_btn_secondary",
                                                    "store_detail_cart_button",
                                                    getButtonHoverClass("cart")
                                                ].filter(Boolean).join(" ")}
                                                disabled={
                                                    (
                                                        variants.length > 0 &&
                                                        !selectedVariant
                                                    ) ||
                                                    (
                                                        shouldLimitStock &&
                                                        maxQuantity <= 0
                                                    )
                                                }
                                                onClick={() =>
                                                    handleAddToCart()
                                                }
                                            >
                                                <FiShoppingCart />
                                                Agregar al carrito
                                            </button>
                                        )
                                    }

                                    {
                                        settings.content?.showWhatsappButton !== false &&
                                        whatsappUrl && (
                                            <a
                                                href={whatsappUrl}
                                                target="_blank"
                                                style={{
                                                    ...whatsappButtonStyle,
                                                    ...(typography.button || {})
                                                }}
                                                rel="noopener noreferrer"
                                                className={[
                                                    "btn",
                                                    "store_btn_whatsapp",
                                                    "store_detail_whatsapp_button",
                                                    "mt-3",
                                                    getButtonHoverClass("whatsapp")
                                                ].filter(Boolean).join(" ")}
                                            >
                                                <FiMessageCircle />
                                                Consultar por WhatsApp
                                            </a>
                                        )
                                    }
                                    {
                                        settings.content?.showShareButton !== false && (
                                            <button
                                                type="button"
                                                style={{
                                                    ...shareButtonStyle,
                                                    ...(typography.button || {})
                                                }}
                                                className={[
                                                    "btn",
                                                    "store_btn_whatsapp",
                                                    "store_detail_share_button",
                                                    getButtonHoverClass("share")
                                                ].filter(Boolean).join(" ")}
                                                onClick={handleShareProduct}
                                            >
                                                <FiShare2 />
                                                Compartir producto
                                            </button>
                                        )
                                    }
                                </div>

                                {
                                    settings.content?.showTrustInfo !== false && (
                                        <div className="store_detail_trust_list">

                                            <div>
                                                <FiTruck />
                                                <span>
                                                    Coordiná envío o retiro con la tienda.
                                                </span>
                                            </div>

                                            <div>
                                                <FiShield />
                                                <span>
                                                    Compra segura. Tu pedido queda registrado.
                                                </span>
                                            </div>

                                        </div>
                                    )
                                }

                            </aside>

                        </div>

                    </div>

                </div>
            </section>

        </main>
    );

}
