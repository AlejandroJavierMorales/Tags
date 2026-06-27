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

import StoreFavoriteButton
    from "./StoreFavoriteButton";

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
    hasProductSale
}
    from "../../lib/formatStorePrice";

export default function StoreProductDetailClient({
    store,
    product,
    images = [],
    variants = [],
    variantOptions = []
}) {

    const [imageIndex, setImageIndex] =
        useState(0);

    const [quantity, setQuantity] =
        useState(1);

    const [selectedOptions, setSelectedOptions] =
        useState(() => {

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
                `/p/${store.slug}/cart`;

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
                    `/p/${store.slug}/cart`;
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


    /*  UI  */

    return (
        <main className="store_product_detail_page">

            <StoreHeaderBlock
                entity={store}
            />

            <div className="store_detail_breadcrumb">
                <div className="container">
                    <Link
                        href={`/p/${store.slug}`}
                        className="store_detail_back_link"
                    >
                        <FiArrowLeft />
                        Volver a la tienda
                    </Link>
                </div>
            </div>

            <section className="store_detail_shell">
                <div className="container">

                    <div className="row g-4 align-items-start">

                        <div className="col-12 col-lg-8">
                            <div className="store_detail_gallery_panel">
                                <StoreFavoriteButton
                                    storeId={store.id}
                                    productId={product.id}
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
                                product.description && (
                                    <div className="store_detail_description_panel mt-4">
                                        <h2>
                                            Descripción
                                        </h2>

                                        <p>
                                            {product.description}
                                        </p>
                                    </div>
                                )
                            }

                        </div>

                        <div className="col-12 col-lg-4">

                            <aside className="store_detail_buy_panel">

                                <div className="d-flex flex-wrap gap-2 mb-3">
                                    {
                                        Number(product.is_featured) === 1 && (
                                            <span className="store_detail_badge success">
                                                Destacado
                                            </span>
                                        )
                                    }

                                    {
                                        product.category_name && (
                                            <span className="store_detail_badge">
                                                {product.category_name}
                                            </span>
                                        )
                                    }
                                </div>

                                <h1 className="store_detail_title">
                                    {product.title}
                                </h1>

                                <div className="store_detail_price_box">
                                    <div className="store_detail_price">
                                        {
                                            formatStorePrice(
                                                finalPrice,
                                                product.currency
                                            )
                                        }
                                    </div>

                                    {
                                        productHasSale && (
                                            <div className="store_detail_old_price">
                                                {
                                                    formatStorePrice(
                                                        regularPrice,
                                                        product.currency
                                                    )
                                                }
                                            </div>
                                        )
                                    }
                                </div>

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

                                <div className="store_detail_stock">
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

                                <div className="d-grid gap-2 mt-4">
                                    <button
                                        type="button"
                                        className="btn store_btn_primary"
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

                                    <button
                                        type="button"
                                        className="btn store_btn_secondary"
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

                                    {
                                        whatsappUrl && (
                                            <a
                                                href={whatsappUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn store_btn_whatsapp mt-3"
                                            >
                                                <FiMessageCircle />
                                                Consultar por WhatsApp
                                            </a>
                                        )
                                    }
                                    <button
                                        type="button"
                                        className="btn store_btn_whatsapp"
                                        onClick={handleShareProduct}
                                    >
                                        <FiShare2 />
                                        Compartir producto
                                    </button>
                                </div>

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

                            </aside>

                        </div>

                    </div>

                </div>
            </section>

        </main>
    );

}