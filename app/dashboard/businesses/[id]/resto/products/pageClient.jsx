// =====================================
// FILE: /dashboard/businesses/[id]/resto/products/pageClient.jsx
// Descripción:
// Administración de productos de
// Tags Resto.
// =====================================

"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter }
    from "next/navigation";

import showAlert
    from "@/app/components/showAlert";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import {
    FaArrowLeft,
    FaEye,
    FaEyeSlash,
    FaHamburger,
    FaPen,
    FaPlus,
    FaSearch,
    FaStar,
    FaTrash
} from "react-icons/fa";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";

import "../../../../../modules/resto/styles/resto-products.css";

export default function RestoProductsClient({

    businessId,

    session,

    isAdmin

}) {

    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [products, setProducts] =
        useState([]);

    const [categories, setCategories] =
        useState([]);

    const [search, setSearch] =
        useState("");

    const [categoryId, setCategoryId] =
        useState("");

    useEffect(() => {

        loadProducts();

        // eslint-disable-next-line
    }, []);

    async function loadProducts() {

        setLoading(true);

        try {

            const res =
                await fetch(
                    `/api/store/admin/products/list?businessId=${businessId}&appType=resto`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                throw new Error(
                    data.error ||
                    "Error cargando productos"
                );

            }

            setProducts(
                Array.isArray(data.products)
                    ? data.products
                    : []
            );

            setCategories(
                Array.isArray(data.categories)
                    ? data.categories
                    : []
            );

        } catch (err) {

            console.error(
                "RESTO PRODUCTS LOAD ERROR:",
                err
            );

            showAlert({
                icon: "error",
                title: "Error",
                text:
                    err.message ||
                    "No se pudieron cargar los productos"
            });

        } finally {

            setLoading(false);

        }

    }

    const filteredProducts =
        useMemo(() => {

            return products.filter(product => {

                const matchSearch =
                    !search ||

                    product.title
                        ?.toLowerCase()
                        .includes(
                            search.toLowerCase()
                        );

                const matchCategory =
                    !categoryId ||

                    String(product.category_id) ===
                    String(categoryId);

                return (
                    matchSearch &&
                    matchCategory
                );

            });

        }, [

            products,

            search,

            categoryId

        ]);

    function createProduct() {

        router.push(
            `/dashboard/businesses/${businessId}/resto/products/new`
        );

    }

    function editProduct(id) {

        router.push(
            `/dashboard/businesses/${businessId}/resto/products/${id}`
        );

    }
    async function deleteProduct(product) {

    const confirmed =
        await showAlert({
            icon: "warning",
            title: "Eliminar producto",
            text:
                `¿Querés eliminar "${product.title}"?`,
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
                "/api/store/admin/products/delete",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        businessId,
                        appType: "resto",
                        productId:
                            product.id
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
                "No se pudo eliminar el producto"
            );

        }

        await showAlert({
            icon: "success",
            title: "Producto eliminado"
        });

        await loadProducts();

    } catch (err) {

        console.error(
            "RESTO PRODUCT DELETE ERROR:",
            err
        );

        showAlert({
            icon: "error",
            title: "Error",
            text:
                err.message ||
                "No se pudo eliminar el producto"
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

            {/* HEADER */}

            <div className="qr_page_header">

                <div>

                    <h1 className="qr_page_title store_admin_title">

                        <span className="store_admin_title_icon">
                            🍽️
                        </span>

                        <span>

                            Productos

                        </span>

                    </h1>

                    <p className="qr_page_subtitle">

                        Carta gastronómica del restaurante.

                    </p>

                    <small
                        className="resto_products_email"
                    >

                        {session.email}

                    </small>

                </div>

                <div className="qr_page_actions">

                    <button

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

                        className="qr_page_btn success"

                        onClick={createProduct}

                    >

                        <FaPlus />

                        Nuevo producto

                    </button>

                </div>

            </div>

            <div className="qr_page_status">

                Total de productos:&nbsp;

                <strong>

                    {filteredProducts.length}

                </strong>

            </div>

            {/* FILTROS */}

            <div className="resto_products_filters">

                <div className="resto_products_search">

                    <FaSearch />

                    <input

                        value={search}

                        onChange={e =>
                            setSearch(
                                e.target.value
                            )
                        }

                        placeholder="Buscar producto..."

                    />

                </div>

                <select

                    value={categoryId}

                    onChange={e =>
                        setCategoryId(
                            e.target.value
                        )
                    }

                >

                    <option value="">

                        Todas las categorías

                    </option>

                    {
                        categories.map(cat => (

                            <option

                                key={cat.id}

                                value={cat.id}

                            >

                                {cat.name}

                            </option>

                        ))
                    }

                </select>

            </div>

            {/* PRODUCTOS */}

            <div className="resto_products_grid">

                {

                    filteredProducts.length === 0 && (

                        <div className="qr_page_info_box">

                            No hay productos cargados.

                        </div>

                    )

                }

                {

                    filteredProducts.map(product => (

                        <div
                            key={product.id}
                            className="resto_product_card"
                        >

                            <div className="resto_product_image">

                                {
                                    product.primary_image_url
                                        ?
                                        <img
                                            src={product.primary_image_url}
                                            alt={product.title}
                                        />
                                        :
                                        <FaHamburger />
                                }

                            </div>

                            <div className="resto_product_body">

                                <div className="resto_product_header">

                                    <h3>

                                        {product.title}

                                    </h3>

                                    <span className="resto_product_price">

                                        $

                                        {

                                            Number(
                                                product.sale_price ||
                                                product.price ||
                                                0
                                            ).toLocaleString(
                                                "es-AR"
                                            )

                                        }

                                    </span>

                                </div>

                                <div className="resto_product_category">

                                    {

                                        product.category_name ||
                                        "Sin categoría"

                                    }

                                </div>

                                <div className="resto_product_status">

                                    {

                                        product.is_visible

                                            ?

                                            <span className="visible">

                                                <FaEye />

                                                Visible

                                            </span>

                                            :

                                            <span className="hidden">

                                                <FaEyeSlash />

                                                Oculto

                                            </span>

                                    }

                                    {

                                        product.is_featured && (

                                            <span className="featured">

                                                <FaStar />

                                                Destacado

                                            </span>

                                        )

                                    }

                                </div>

                                <div className="resto_product_actions">

                                    <button
                                        className="qr_page_btn secondary"
                                        onClick={() =>
                                            editProduct(
                                                product.id
                                            )
                                        }
                                    >
                                        <FaPen />
                                        Editar
                                    </button>

                                    <button
                                        className="qr_page_btn danger"
                                        onClick={() =>
                                            deleteProduct(
                                                product
                                            )
                                        }
                                    >
                                        <FaTrash />
                                        Eliminar
                                    </button>

                                </div>

                            </div>

                        </div>

                    ))

                }

            </div>

        </div>

    );

}