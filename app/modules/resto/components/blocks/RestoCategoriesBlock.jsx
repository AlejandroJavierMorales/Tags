"use client";

// =====================================
// Archivo:
// /app/modules/resto/components/blocks/RestoCategoriesBlock.jsx
//
// Descripción:
// Navegación pública jerárquica de categorías
// para la carta de Tags Resto.
//
// Muestra únicamente las categorías del nivel
// actual, permite ingresar en subcategorías,
// regresar al nivel anterior y comunica el
// filtro mediante el evento:
//
// "resto:category-change"
//
// Aplica la configuración visual del builder
// siguiendo el mismo patrón que los bloques
// públicos de Tags Store.
//
// Contexto:
// resto
// =====================================

import "../../styles/resto-public.css";

import {
    useEffect,
    useState
}
    from "react";

import { PiForkKnifeBold } from "react-icons/pi";
import { MdRestaurantMenu } from "react-icons/md";
import { TbToolsKitchen2 } from "react-icons/tb";


export default function RestoCategoriesBlock({
    entity,
    content = {},
    styles = {}
}) {

    const categories =
        Array.isArray(
            entity?.categories
        )
            ? entity.categories.filter(
                category =>
                    Number(
                        category?.is_visible ??
                        1
                    ) === 1
            )
            : [];

    const showAllOption =
        content?.showAllOption !==
        false;

    const title =
        content?.title ||
        "Nuestra carta";

    const allLabel =
        content?.allLabel ||
        "Todo";

    const backLabel =
        content?.backLabel ||
        "Volver";

    const [
        activeCategoryId,
        setActiveCategoryId
    ] =
        useState(null);

    const [
        currentParentId,
        setCurrentParentId
    ] =
        useState(null);


    function normalizeParentId(
        parentId
    ) {

        if (
            parentId === null ||
            parentId === undefined ||
            parentId === "" ||
            Number(parentId) === 0
        ) {
            return null;
        }

        return parentId;

    }


    function getCategoryById(
        categoryId
    ) {

        if (
            categoryId === null ||
            categoryId === undefined
        ) {
            return null;
        }

        return (
            categories.find(
                category =>
                    String(
                        category?.id
                    ) ===
                    String(
                        categoryId
                    )
            ) ||
            null
        );

    }


    function getCategoryParentId(
        category
    ) {

        return normalizeParentId(
            category?.parent_id ??
            category?.parentId ??
            null
        );

    }


    function getChildren(
        parentId
    ) {

        return categories.filter(
            category => {

                const categoryParentId =
                    getCategoryParentId(
                        category
                    );

                if (parentId === null) {

                    return (
                        categoryParentId === null
                    );

                }

                return (
                    String(
                        categoryParentId
                    ) ===
                    String(
                        parentId
                    )
                );

            }
        );

    }


    function categoryHasChildren(
        categoryId
    ) {

        return (
            getChildren(
                categoryId
            ).length > 0
        );

    }


    function getTextStyle(
        part
    ) {

        return (
            styles?.typography?.[part] ||
            {}
        );

    }


    function dispatchCategoryChange(
        categoryId
    ) {

        window.dispatchEvent(
            new CustomEvent(
                "resto:category-change",
                {
                    detail: {
                        categoryId
                    }
                }
            )
        );

    }


    function selectAllCurrentLevel() {

        const categoryId =
            currentParentId;

        setActiveCategoryId(
            categoryId
        );

        dispatchCategoryChange(
            categoryId
        );

    }


    function selectCategory(
        categoryId
    ) {

        setActiveCategoryId(
            categoryId
        );

        dispatchCategoryChange(
            categoryId
        );

        if (
            categoryHasChildren(
                categoryId
            )
        ) {

            setCurrentParentId(
                categoryId
            );

        }

    }


    function goBack() {

        const currentCategory =
            getCategoryById(
                currentParentId
            );

        const previousParentId =
            getCategoryParentId(
                currentCategory
            );

        setCurrentParentId(
            previousParentId
        );

        setActiveCategoryId(
            previousParentId
        );

        dispatchCategoryChange(
            previousParentId
        );

    }


    useEffect(
        () => {

            function handleExternalCategoryChange(
                event
            ) {

                const categoryId =
                    event?.detail?.categoryId ??
                    null;

                if (
                    categoryId === null
                ) {

                    setActiveCategoryId(
                        null
                    );

                    setCurrentParentId(
                        null
                    );

                    return;

                }

                const selectedCategory =
                    getCategoryById(
                        categoryId
                    );

                if (
                    !selectedCategory
                ) {
                    return;
                }

                setActiveCategoryId(
                    categoryId
                );

                if (
                    categoryHasChildren(
                        categoryId
                    )
                ) {

                    setCurrentParentId(
                        categoryId
                    );

                    return;

                }

                setCurrentParentId(
                    getCategoryParentId(
                        selectedCategory
                    )
                );

            }

            window.addEventListener(
                "resto:set-active-category",
                handleExternalCategoryChange
            );

            return () => {

                window.removeEventListener(
                    "resto:set-active-category",
                    handleExternalCategoryChange
                );

            };

        },
        [categories]
    );


    const currentCategory =
        getCategoryById(
            currentParentId
        );

    const visibleCategories =
        getChildren(
            currentParentId
        );

    const currentAllCategoryId =
        currentParentId;

    const isAllCurrentLevelActive =
        currentAllCategoryId === null
            ? activeCategoryId === null
            : String(
                activeCategoryId
            ) ===
            String(
                currentAllCategoryId
            );


    if (
        !showAllOption &&
        visibleCategories.length === 0
    ) {
        return null;
    }


    return (

        <section
            className="resto_categories "
            style={{
                /* background:
                    styles?.backgroundColor ||
                    "color-mix(in srgb, var(--qr-primary) 12%, white)", */

                color:
                    styles?.textColor ||
                    "var(--qr-text)",

                borderTop:
                    "1px solid var(--qr-border)",

                borderBottom:
                    "1px solid var(--qr-border)",

                textAlign:
                    styles?.alignment ||
                    undefined,

                padding:
                    styles?.padding ||
                    undefined,

                marginTop:
                    styles?.marginTop ||
                    undefined,

                marginBottom:
                    styles?.marginBottom ||
                    undefined
            }}
        >

            <div className="container">

                {title && (

                    <div className="resto_categories_header">

                        <h2 className="resto_categories_title mb-2">

                            <PiForkKnifeBold
                                className="resto_categories_title_icon"
                            />

                            <span>{title}</span>

                        </h2>

                    </div>

                )}

                <div
                    className="resto_categories_scroll"
                    role="navigation"
                    aria-label="Categorías de la carta"
                >

                    <div className="resto_categories_list mb-2">

                        {currentParentId !== null && (

                            <button
                                type="button"
                                className="resto_categories_item resto_categories_back m-1"
                                style={
                                    getTextStyle(
                                        "button"
                                    )
                                }
                                onClick={
                                    goBack
                                }
                                aria-label={
                                    backLabel
                                }
                            >
                                <span
                                    aria-hidden="true"
                                >
                                    ←
                                </span>

                                <span className="resto_categories_item_label">
                                    {backLabel}
                                </span>
                            </button>

                        )}

                        {showAllOption && (

                            <button
                                type="button"
                                className={
                                    [
                                        "resto_categories_item",
                                        isAllCurrentLevelActive
                                            ? "is_active"
                                            : ""
                                    ]
                                        .filter(Boolean)
                                        .join(" ")
                                }
                                style={
                                    getTextStyle(
                                        "button"
                                    )
                                }
                                onClick={
                                    selectAllCurrentLevel
                                }
                            >
                                <span className="resto_categories_item_label">

                                    {
                                        currentCategory
                                            ? `${allLabel} ${currentCategory?.name || currentCategory?.title || ""}`
                                            : allLabel
                                    }

                                </span>
                            </button>

                        )}

                        {visibleCategories.map(
                            category => {

                                const categoryId =
                                    category?.id;

                                const categoryName =
                                    category?.name ||
                                    category?.title ||
                                    "Categoría";

                                const isActive =
                                    String(
                                        activeCategoryId
                                    ) ===
                                    String(
                                        categoryId
                                    );

                                const hasChildren =
                                    categoryHasChildren(
                                        categoryId
                                    );

                                return (

                                    <button
                                        key={
                                            categoryId
                                        }
                                        type="button"
                                        className={
                                            [
                                                "resto_categories_item",
                                                isActive
                                                    ? "is_active"
                                                    : "",
                                                hasChildren
                                                    ? "has_children"
                                                    : ""
                                            ]
                                                .filter(Boolean)
                                                .join(" ")
                                        }
                                        style={
                                            getTextStyle(
                                                "button"
                                            )
                                        }
                                        onClick={
                                            () =>
                                                selectCategory(
                                                    categoryId
                                                )
                                        }
                                    >

                                        {category?.image_url && (

                                            <span className="resto_categories_item_image_wrap">

                                                <img
                                                    src={
                                                        category.image_url
                                                    }
                                                    alt=""
                                                    className="resto_categories_item_image"
                                                />

                                            </span>

                                        )}

                                        <span className="resto_categories_item_label">
                                            {categoryName}
                                        </span>

                                        {hasChildren && (

                                            <span
                                                className="resto_categories_item_arrow"
                                                aria-hidden="true"
                                            >
                                                ›
                                            </span>

                                        )}

                                    </button>

                                );

                            }
                        )}

                    </div>

                </div>

            </div>

        </section>

    );

}