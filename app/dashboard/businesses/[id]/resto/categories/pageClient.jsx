// =====================================
// FILE: /dashboard/businesses/[id]/resto/categories/pageClient.jsx
// Descripción:
// Administración de categorías de Tags Resto.
// Reutiliza el backend de categorías de Tags Store
// con una interfaz adaptada a gastronomía.
// =====================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import showAlert
    from "@/app/components/showAlert";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import {
    FaArrowLeft,
    FaEye,
    FaEyeSlash,
    FaFolderOpen,
    FaPen,
    FaPlus,
    FaSearch,
    FaTrash
} from "react-icons/fa";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";

import "../../../../../modules/resto/styles/resto-categories.css";

export default function RestoCategoriesClient({
    businessId,
    session
}) {

    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [categories, setCategories] =
        useState([]);

    const [search, setSearch] =
        useState("");

    useEffect(() => {

        loadCategories();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId]);

    async function loadCategories() {

        setLoading(true);

        try {

            const res =
                await fetch(
                    `/api/store/admin/categories/list?businessId=${businessId}&appType=resto`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json().catch(() => null);

            if (!res.ok) {

                throw new Error(
                    data?.error ||
                    "Error cargando categorías"
                );

            }

            setCategories(
                Array.isArray(data?.categories)
                    ? data.categories
                    : []
            );

        } catch (err) {

            console.error(
                "RESTO CATEGORIES LOAD ERROR:",
                err
            );

            showAlert({
                icon: "error",
                title: "Error",
                text:
                    err.message ||
                    "No se pudieron cargar las categorías"
            });

        } finally {

            setLoading(false);

        }

    }

    const filteredCategories =
        useMemo(() => {

            const normalizedSearch =
                search
                    .trim()
                    .toLowerCase();

            if (!normalizedSearch) {

                return categories;

            }

            return categories.filter(category => {

                return String(
                    category.name || ""
                )
                    .toLowerCase()
                    .includes(
                        normalizedSearch
                    );

            });

        }, [
            categories,
            search
        ]);

    function createCategory() {

        router.push(
            `/dashboard/businesses/${businessId}/resto/categories/new`
        );

    }

    function editCategory(categoryId) {

        router.push(
            `/dashboard/businesses/${businessId}/resto/categories/${categoryId}`
        );

    }

    async function deleteCategory(category) {

    const confirmed =
        await showAlert({
            title: "Eliminar categoría",
            text:
                `¿Querés eliminar "${category.name}"?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar"
        });

    if (!confirmed) {
        return;
    }

    try {

        const res =
            await fetch(
                "/api/store/admin/categories/delete",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        businessId,
                        appType: "resto",
                        categoryId:
                            category.id
                    })
                }
            );

        const data =
            await res
                .json()
                .catch(() => null);

        if (!res.ok) {

            throw new Error(
                data?.error ||
                "No se pudo eliminar la categoría"
            );

        }

        await showAlert({
            icon: "success",
            title: "Categoría eliminada"
        });

        await loadCategories();

    } catch (err) {

        console.error(
            "RESTO CATEGORY DELETE ERROR:",
            err
        );

        showAlert({
            icon: "error",
            title: "Error",
            text:
                err.message ||
                "No se pudo eliminar la categoría"
        });

    }

}

    if (loading) {

        return (
            <div className="qr_page_builder">

                <TagsSpinner />

            </div>
        );

    }

    return (
        <div className="qr_page_builder">

            {/* =====================================
                ENCABEZADO
            ===================================== */}

            <div className="qr_page_header">

                <div>

                    <h1 className="qr_page_title store_admin_title">

                        <span className="store_admin_title_icon">
                            🍽️
                        </span>

                        <span>
                            Categorías
                        </span>

                    </h1>

                    <p className="qr_page_subtitle">
                        Organizá la carta gastronómica del restaurante.
                    </p>

                    <small className="resto_categories_email">
                        {session?.email || ""}
                    </small>

                </div>

                <div className="qr_page_actions">

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/resto`
                            )
                        }
                    >

                        <FaArrowLeft />

                        Volver

                    </button>

                    <button
                        type="button"
                        className="qr_page_btn success"
                        onClick={createCategory}
                    >

                        <FaPlus />

                        Nueva categoría

                    </button>

                </div>

            </div>

            <div className="qr_page_status">

                Total de categorías:&nbsp;

                <strong>
                    {filteredCategories.length}
                </strong>

            </div>

            {/* =====================================
                FILTROS
            ===================================== */}

            <div className="resto_categories_filters">

                <div className="resto_categories_search">

                    <FaSearch />

                    <input
                        type="search"
                        value={search}
                        onChange={(e) =>
                            setSearch(
                                e.target.value
                            )
                        }
                        placeholder="Buscar categoría..."
                    />

                </div>

            </div>

            {/* =====================================
                LISTADO
            ===================================== */}

            <div className="resto_categories_grid">

                {filteredCategories.length === 0 && (

                    <div className="qr_page_info_box resto_categories_empty">

                        No hay categorías cargadas.

                    </div>

                )}

                {filteredCategories.map(category => (

                    <article
                        key={category.id}
                        className="resto_category_card"
                    >

                        <div className="resto_category_icon">

                            <FaFolderOpen />

                        </div>

                        <div className="resto_category_content">

                            <div className="resto_category_top">

                                <div>

                                    <h3>
                                        {category.name}
                                    </h3>

                                    <p>
                                        {
                                            category.description ||
                                            "Sin descripción"
                                        }
                                    </p>

                                </div>

                                <span
                                    className={
                                        Number(category.is_visible) === 1
                                            ? "resto_category_status visible"
                                            : "resto_category_status hidden"
                                    }
                                >

                                    {
                                        Number(category.is_visible) === 1
                                            ? <FaEye />
                                            : <FaEyeSlash />
                                    }

                                    {
                                        Number(category.is_visible) === 1
                                            ? "Visible"
                                            : "Oculta"
                                    }

                                </span>

                            </div>

                            <div className="resto_category_meta">

                                <span>
                                    Orden:{" "}
                                    <strong>
                                        {Number(category.sort_order || 0)}
                                    </strong>
                                </span>

                                {
                                    category.parent_name && (
                                        <span>
                                            Principal:{" "}
                                            <strong>
                                                {category.parent_name}
                                            </strong>
                                        </span>
                                    )
                                }

                            </div>

                            <div className="resto_category_actions">

                                <button
                                    type="button"
                                    className="qr_page_btn secondary"
                                    onClick={() =>
                                        editCategory(
                                            category.id
                                        )
                                    }
                                >

                                    <FaPen />

                                    Editar

                                </button>

                                <button
                                    type="button"
                                    className="resto_category_delete"
                                    onClick={() =>
                                        deleteCategory(
                                            category
                                        )
                                    }
                                >

                                    <FaTrash />

                                    Eliminar

                                </button>

                            </div>

                        </div>

                    </article>

                ))}

            </div>

        </div>
    );

}