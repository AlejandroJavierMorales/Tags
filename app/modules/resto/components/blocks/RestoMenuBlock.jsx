"use client";

// =====================================
// Archivo:
// /app/modules/resto/components/blocks/RestoMenuBlock.jsx
//
// Descripción:
// Carta principal de Tags Resto.
//
// Renderiza los productos públicos en un
// grid responsive, permite filtrar por
// categorías jerárquicas y búsqueda,
// navegar imágenes y abrir el detalle.
//
// Emite el evento:
// resto:add-product
//
// Contexto:
// resto
// =====================================

import "../../styles/resto-public.css";

import {
    useEffect,
    useMemo,
    useRef,
    useState
}
from "react";

function normalizeImage(
    image
) {

    if (
        !image
    ) {
        return null;
    }

    if (
        typeof image === "string"
    ) {

        return (
            image.trim() ||
            null
        );

    }

    if (
        typeof image === "object"
    ) {

        return (
            image.image_url ||
            image.url ||
            image.src ||
            null
        );

    }

    return null;

}

function getProductImages(
    product
) {

    const images =
        [
            product?.primary_image_url,
            product?.image_url
        ];

    if (
        Array.isArray(
            product?.images_json
        )
    ) {

        images.push(
            ...product.images_json
        );

    }

    return [
        ...new Set(
            images
                .map(
                    normalizeImage
                )
                .filter(Boolean)
        )
    ];

}

function formatPrice(
    value
) {

    return Number(
        value ||
        0
    ).toLocaleString(
        "es-AR"
    );

}

function ProductSlider({
    product,
    images,
    activeIndex,
    onChange,
    onOpenDetail,
    detail = false
}) {

    const touchStartX =
        useRef(
            null
        );

    const touchLastX =
        useRef(
            null
        );

    const safeIndex =
        Math.min(
            activeIndex,
            Math.max(
                images.length - 1,
                0
            )
        );

    function previousImage(
        event
    ) {

        event?.stopPropagation();

        if (
            images.length <= 1
        ) {
            return;
        }

        onChange(
            safeIndex === 0
                ? images.length - 1
                : safeIndex - 1
        );

    }

    function nextImage(
        event
    ) {

        event?.stopPropagation();

        if (
            images.length <= 1
        ) {
            return;
        }

        onChange(
            safeIndex ===
            images.length - 1
                ? 0
                : safeIndex + 1
        );

    }

    function handleTouchStart(
        event
    ) {

        const clientX =
            event.touches?.[0]?.clientX;

        touchStartX.current =
            clientX ?? null;

        touchLastX.current =
            clientX ?? null;

    }

    function handleTouchMove(
        event
    ) {

        touchLastX.current =
            event.touches?.[0]?.clientX ??
            null;

    }

    function handleTouchEnd() {

        if (
            touchStartX.current === null ||
            touchLastX.current === null
        ) {
            return;
        }

        const distance =
            touchStartX.current -
            touchLastX.current;

        if (
            Math.abs(
                distance
            ) >= 45
        ) {

            if (
                distance > 0
            ) {
                nextImage();
            }
            else {
                previousImage();
            }

        }

        touchStartX.current =
            null;

        touchLastX.current =
            null;

    }

    if (
        images.length === 0
    ) {

        return (

            <button
                type="button"
                className={
                    [
                        "resto_product_media",
                        "resto_product_media_empty",
                        detail
                            ? "is_detail"
                            : ""
                    ]
                        .filter(Boolean)
                        .join(" ")
                }
                onClick={
                    onOpenDetail
                }
                aria-label={
                    `Ver detalle de ${product.title}`
                }
            >

                <span>
                    Sin imagen
                </span>

            </button>

        );

    }

    return (

        <div
            className={
                [
                    "resto_product_media",
                    detail
                        ? "is_detail"
                        : ""
                ]
                    .filter(Boolean)
                    .join(" ")
            }
            onTouchStart={
                handleTouchStart
            }
            onTouchMove={
                handleTouchMove
            }
            onTouchEnd={
                handleTouchEnd
            }
        >

            <button
                type="button"
                className="resto_product_media_button"
                onClick={
                    onOpenDetail
                }
                aria-label={
                    `Ver detalle de ${product.title}`
                }
            >

                <img
                    src={
                        images[
                            safeIndex
                        ]
                    }
                    alt={
                        product.title
                    }
                    className="resto_product_media_image"
                    draggable="false"
                />

            </button>

            {images.length > 1 && (

                <>

                    <button
                        type="button"
                        className="resto_product_slider_arrow is_previous"
                        onClick={
                            previousImage
                        }
                        aria-label="Imagen anterior"
                    >
                        ‹
                    </button>

                    <button
                        type="button"
                        className="resto_product_slider_arrow is_next"
                        onClick={
                            nextImage
                        }
                        aria-label="Imagen siguiente"
                    >
                        ›
                    </button>

                    <div className="resto_product_slider_dots">

                        {images.map(
                            (
                                image,
                                index
                            ) => (

                                <button
                                    key={
                                        `${image}-${index}`
                                    }
                                    type="button"
                                    className={
                                        [
                                            "resto_product_slider_dot",
                                            index === safeIndex
                                                ? "is_active"
                                                : ""
                                        ]
                                            .filter(Boolean)
                                            .join(" ")
                                    }
                                    onClick={
                                        event => {

                                            event.stopPropagation();

                                            onChange(
                                                index
                                            );

                                        }
                                    }
                                    aria-label={
                                        `Ver imagen ${index + 1}`
                                    }
                                />

                            )
                        )}

                    </div>

                </>

            )}

        </div>

    );

}

export default function RestoMenuBlock({
    entity,
    content = {},
    styles = {}
}) {

    const products =
        Array.isArray(
            entity?.products
        )
            ? entity.products.filter(
                product =>
                    Number(
                        product?.is_visible ??
                        1
                    ) === 1
            )
            : [];

    const categories =
        Array.isArray(
            entity?.categories
        )
            ? entity.categories
            : [];

    const [
        activeCategoryId,
        setActiveCategoryId
    ] =
        useState(
            null
        );

    const [
        search,
        setSearch
    ] =
        useState(
            ""
        );

    const [
        activeSlides,
        setActiveSlides
    ] =
        useState(
            {}
        );

    const [
        selectedProduct,
        setSelectedProduct
    ] =
        useState(
            null
        );

    const [
        detailSlide,
        setDetailSlide
    ] =
        useState(
            0
        );

    useEffect(
        () => {

            function handleCategory(
                event
            ) {

                setActiveCategoryId(
                    event?.detail?.categoryId ??
                    null
                );

            }

            function handleSearch(
                event
            ) {

                setSearch(
                    (
                        event?.detail?.value ||
                        ""
                    ).trim()
                );

            }

            window.addEventListener(
                "resto:category-change",
                handleCategory
            );

            window.addEventListener(
                "resto:search",
                handleSearch
            );

            return () => {

                window.removeEventListener(
                    "resto:category-change",
                    handleCategory
                );

                window.removeEventListener(
                    "resto:search",
                    handleSearch
                );

            };

        },
        []
    );

    useEffect(
        () => {

            if (
                !selectedProduct
            ) {
                return;
            }

            const previousOverflow =
                document.body.style.overflow;

            document.body.style.overflow =
                "hidden";

            function handleKeyDown(
                event
            ) {

                if (
                    event.key === "Escape"
                ) {

                    setSelectedProduct(
                        null
                    );

                }

            }

            window.addEventListener(
                "keydown",
                handleKeyDown
            );

            return () => {

                document.body.style.overflow =
                    previousOverflow;

                window.removeEventListener(
                    "keydown",
                    handleKeyDown
                );

            };

        },
        [
            selectedProduct
        ]
    );

    const activeCategoryIds =
        useMemo(
            () => {

                if (
                    !activeCategoryId
                ) {
                    return null;
                }

                const categoryIds =
                    new Set([
                        Number(
                            activeCategoryId
                        )
                    ]);

                let foundChildren =
                    true;

                while (
                    foundChildren
                ) {

                    foundChildren =
                        false;

                    categories.forEach(
                        category => {

                            const categoryId =
                                Number(
                                    category.id
                                );

                            const parentId =
                                Number(
                                    category.parent_id
                                );

                            if (
                                categoryIds.has(
                                    parentId
                                ) &&
                                !categoryIds.has(
                                    categoryId
                                )
                            ) {

                                categoryIds.add(
                                    categoryId
                                );

                                foundChildren =
                                    true;

                            }

                        }
                    );

                }

                return categoryIds;

            },
            [
                categories,
                activeCategoryId
            ]
        );

    const filteredProducts =
        useMemo(
            () => {

                const normalizedSearch =
                    search.toLowerCase();

                return products.filter(
                    product => {

                        if (
                            activeCategoryIds &&
                            !activeCategoryIds.has(
                                Number(
                                    product.category_id
                                )
                            )
                        ) {
                            return false;
                        }

                        if (
                            !normalizedSearch
                        ) {
                            return true;
                        }

                        const searchableText =
                            [
                                product.title,
                                product.name,
                                product.description,
                                product.short_description,
                                product.category_name
                            ]
                                .filter(Boolean)
                                .join(" ")
                                .toLowerCase();

                        return searchableText.includes(
                            normalizedSearch
                        );

                    }
                );

            },
            [
                products,
                activeCategoryIds,
                search
            ]
        );

    const selectedProductImages =
        useMemo(
            () =>
                getProductImages(
                    selectedProduct
                ),
            [
                selectedProduct
            ]
        );

    function handleSlideChange(
        productId,
        index
    ) {

        setActiveSlides(
            current => ({
                ...current,

                [productId]:
                    index
            })
        );

    }

    function handleOpenDetail(
        product
    ) {

        setSelectedProduct(
            product
        );

        setDetailSlide(
            0
        );

    }

    function handleCloseDetail() {

        setSelectedProduct(
            null
        );

        setDetailSlide(
            0
        );

    }

    function handleAddProduct(
        product
    ) {

        window.dispatchEvent(
            new CustomEvent(
                "resto:add-product",
                {
                    detail: {
                        product
                    }
                }
            )
        );

    }

    function handleAddFromDetail() {

        if (
            !selectedProduct
        ) {
            return;
        }

        handleAddProduct(
            selectedProduct
        );

        handleCloseDetail();

    }

    return (

        <>

            <section className="resto_menu">

                <div className="container">

                    {(content.title ||
                        content.subtitle) && (

                        <div className="resto_menu_header">

                            {content.title && (

                                <h2 className="resto_menu_title">
                                    {content.title}
                                </h2>

                            )}

                            {content.subtitle && (

                                <p className="resto_menu_subtitle">
                                    {content.subtitle}
                                </p>

                            )}

                        </div>

                    )}

                    <div className="resto_menu_grid">

                        {filteredProducts.map(
                            product => {

                                const images =
                                    getProductImages(
                                        product
                                    );

                                const activeSlide =
                                    Number(
                                        activeSlides[
                                            product.id
                                        ] ||
                                        0
                                    );

                                const price =
                                    product.sale_price ||
                                    product.price;

                                const hasSalePrice =
                                    Number(
                                        product.sale_price
                                    ) > 0 &&
                                    Number(
                                        product.sale_price
                                    ) <
                                    Number(
                                        product.price
                                    );

                                return (

                                    <article
                                        key={
                                            product.id
                                        }
                                        className="resto_product_card"
                                    >

                                        <ProductSlider
                                            product={
                                                product
                                            }
                                            images={
                                                images
                                            }
                                            activeIndex={
                                                activeSlide
                                            }
                                            onChange={
                                                index =>
                                                    handleSlideChange(
                                                        product.id,
                                                        index
                                                    )
                                            }
                                            onOpenDetail={
                                                () =>
                                                    handleOpenDetail(
                                                        product
                                                    )
                                            }
                                        />

                                        <div className="resto_product_body">

                                            <div className="resto_product_content">

                                                {product.category_name && (

                                                    <span className="resto_product_category">
                                                        {
                                                            product.category_name
                                                        }
                                                    </span>

                                                )}

                                                <button
                                                    type="button"
                                                    className="resto_product_title_button"
                                                    onClick={
                                                        () =>
                                                            handleOpenDetail(
                                                                product
                                                            )
                                                    }
                                                >

                                                    <h3 className="resto_product_title">
                                                        {
                                                            product.title
                                                        }
                                                    </h3>

                                                </button>

                                                {product.description && (

                                                    <p className="resto_product_description">
                                                        {
                                                            product.description
                                                        }
                                                    </p>

                                                )}

                                            </div>

                                            <div className="resto_product_footer">

                                                <div className="resto_product_prices">

                                                    {hasSalePrice && (

                                                        <span className="resto_product_old_price">
                                                            ${
                                                                formatPrice(
                                                                    product.price
                                                                )
                                                            }
                                                        </span>

                                                    )}

                                                    <strong className="resto_product_price">
                                                        ${
                                                            formatPrice(
                                                                price
                                                            )
                                                        }
                                                    </strong>

                                                </div>

                                                <button
                                                    type="button"
                                                    className="resto_product_add_btn"
                                                    onClick={
                                                        () =>
                                                            handleAddProduct(
                                                                product
                                                            )
                                                    }
                                                >
                                                    Agregar
                                                </button>

                                            </div>

                                        </div>

                                    </article>

                                );

                            }
                        )}

                        {filteredProducts.length ===
                            0 && (

                            <div className="resto_menu_empty">

                                No se encontraron productos.

                            </div>

                        )}

                    </div>

                </div>

            </section>

            {selectedProduct && (

                <div
                    className="resto_product_detail_overlay"
                    role="presentation"
                    onMouseDown={
                        event => {

                            if (
                                event.target ===
                                event.currentTarget
                            ) {

                                handleCloseDetail();

                            }

                        }
                    }
                >

                    <section
                        className="resto_product_detail_drawer"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="resto-product-detail-title"
                    >

                        <button
                            type="button"
                            className="resto_product_detail_close"
                            onClick={
                                handleCloseDetail
                            }
                            aria-label="Cerrar detalle"
                        >
                            ×
                        </button>

                        <div className="resto_product_detail_scroll">

                            <ProductSlider
                                product={
                                    selectedProduct
                                }
                                images={
                                    selectedProductImages
                                }
                                activeIndex={
                                    detailSlide
                                }
                                onChange={
                                    setDetailSlide
                                }
                                onOpenDetail={
                                    () => {}
                                }
                                detail
                            />

                            <div className="resto_product_detail_body">

                                {selectedProduct.category_name && (

                                    <span className="resto_product_detail_category">
                                        {
                                            selectedProduct.category_name
                                        }
                                    </span>

                                )}

                                <h2
                                    id="resto-product-detail-title"
                                    className="resto_product_detail_title"
                                >
                                    {
                                        selectedProduct.title
                                    }
                                </h2>

                                <strong className="resto_product_detail_price">
                                    ${
                                        formatPrice(
                                            selectedProduct.sale_price ||
                                            selectedProduct.price
                                        )
                                    }
                                </strong>

                                {selectedProduct.description && (

                                    <p className="resto_product_detail_description">
                                        {
                                            selectedProduct.description
                                        }
                                    </p>

                                )}

                            </div>

                        </div>

                        <div className="resto_product_detail_footer">

                            <button
                                type="button"
                                className="resto_product_detail_add_btn"
                                onClick={
                                    handleAddFromDetail
                                }
                            >
                                Agregar al pedido
                            </button>

                        </div>

                    </section>

                </div>

            )}

        </>

    );

}