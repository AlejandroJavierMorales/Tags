"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
    formatStorePrice
} from "../../lib/formatStorePrice";

import StoreFavoriteButton from "./StoreFavoriteButton";

import {
    getStoreSessionId
}
    from "../../lib/storeSession";
import StoreShareButton from "./StoreShareButton";

import "../../styles/store-public.css";
import TagsSelect from "@/app/components/ui/TagsSelect";

export default function StoreProductGridClient({
    store,
    products = [],
    settings = {}
}) {

    const [page, setPage] =
        useState(1);
    const [query, setQuery] =
        useState("");

    const [category, setCategory] =
        useState("all");

    const [mobileCategoriesOpen, setMobileCategoriesOpen] =
        useState(false);

    const [mobileMenuOpen, setMobileMenuOpen] =
        useState(false);

    const [sortBy, setSortBy] =
        useState("recent");

    const [favoriteIds, setFavoriteIds] =
        useState([]);

    /* Define Paginacion - Productos por Página */
    const allowedPageSizes =
        [12, 24, 36];

    const pageSize =
        allowedPageSizes.includes(
            Number(settings?.productsPerPage)
        )
            ? Number(settings.productsPerPage)
            : 12;
    /*  const pageSize = 1; */
    /* ---------------------------------------------- */

    useEffect(() => {
        setPage(1);
    }, [
        query,
        category,
        sortBy
    ]);

    useEffect(() => {
        loadFavorites();

        function handleFavoritesUpdate() {
            loadFavorites();
        }

        window.addEventListener(
            "tags_store_favorites_updated",
            handleFavoritesUpdate
        );

        return () => {
            window.removeEventListener(
                "tags_store_favorites_updated",
                handleFavoritesUpdate
            );
        };
    }, [
        store?.id
    ]);

    useEffect(() => {

        function applyFavoritesFilter() {
            setCategory("favorites");

            setTimeout(() => {
                document
                    .getElementById("store-products")
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
            }, 80);
        }

        function handleCatalogFilter(event) {
            if (event?.detail?.category === "favorites") {
                applyFavoritesFilter();
            }
        }

        window.addEventListener(
            "tags_store_catalog_filter",
            handleCatalogFilter
        );

        if (window.location.hash === "#favorites") {
            applyFavoritesFilter();
        }

        return () => {
            window.removeEventListener(
                "tags_store_catalog_filter",
                handleCatalogFilter
            );
        };

    }, []);

    useEffect(() => {

        function handleCatalogSearch(event) {

            setQuery(
                event.detail?.search || ""
            );

        }

        window.addEventListener(
            "tags_store_catalog_search",
            handleCatalogSearch
        );

        return () => {

            window.removeEventListener(
                "tags_store_catalog_search",
                handleCatalogSearch
            );

        };

    }, []);

    const categories =
        useMemo(() => {
            const map =
                new Map();

            products.forEach(product => {
                if (
                    product.category_id &&
                    product.category_name
                ) {
                    map.set(
                        product.category_id,
                        product.category_name
                    );
                }
            });

            return [
                {
                    id: "all",
                    name: "Todos los productos"
                },
                {
                    id: "favorites",
                    name: "Favoritos"
                },
                {
                    id: "featured",
                    name: "Destacados"
                },
                ...Array.from(map.entries()).map(([id, name]) => ({
                    id,
                    name
                }))
            ];
        }, [
            products
        ]);

    const filteredProducts =
        useMemo(() => {
            const cleanQuery =
                query.trim().toLowerCase();

            return products.filter(product => {
                let matchesCategory =
                    true;

                if (category === "favorites") {
                    matchesCategory =
                        favoriteIds.includes(
                            Number(product.id)
                        );
                }
                else if (category === "featured") {
                    matchesCategory =
                        Number(product.is_featured) === 1;
                }
                else if (category !== "all") {
                    matchesCategory =
                        String(product.category_id) === String(category);
                }

                const searchable =
                    [
                        product.title,
                        product.description,
                        product.sku,
                        product.category_name
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                const matchesQuery =
                    !cleanQuery ||
                    searchable.includes(cleanQuery);

                return matchesCategory && matchesQuery;
            });
        }, [products, query, category, favoriteIds]);


    const sortedProducts =
        useMemo(() => {

            const list =
                [...filteredProducts];

            switch (sortBy) {

                case "price_asc":
                    return list.sort(
                        (a, b) =>
                            Number(a.sale_price || a.price || 0) -
                            Number(b.sale_price || b.price || 0)
                    );

                case "price_desc":
                    return list.sort(
                        (a, b) =>
                            Number(b.sale_price || b.price || 0) -
                            Number(a.sale_price || a.price || 0)
                    );

                case "name_asc":
                    return list.sort(
                        (a, b) =>
                            a.title.localeCompare(b.title)
                    );

                case "name_desc":
                    return list.sort(
                        (a, b) =>
                            b.title.localeCompare(a.title)
                    );

                case "featured":
                    return list.sort(
                        (a, b) =>
                            Number(b.is_featured) -
                            Number(a.is_featured)
                    );

                default:
                    return list.sort(
                        (a, b) =>
                            Number(b.id) -
                            Number(a.id)
                    );
            }

        }, [
            filteredProducts,
            sortBy
        ]);


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                sortedProducts.length / pageSize
            )
        );

    const paginatedProducts =
        sortedProducts.slice(
            (page - 1) * pageSize,
            page * pageSize
        );


    async function loadFavorites() {
        const sessionId =
            getStoreSessionId();

        if (!sessionId || !store?.id) {
            return;
        }

        const res =
            await fetch(
                `/api/store/public/favorites/list?storeId=${store.id}&sessionId=${encodeURIComponent(sessionId)}`,
                {
                    cache: "no-store"
                }
            );

        const data =
            await res.json();

        setFavoriteIds(
            data.favorites || []
        );
    }


    /*  UI */
    return (
        <>
            <div className="store_product_filters">

                {
                    settings?.showSearch !== true && (

                        <input
                            value={query}
                            onChange={(e) =>
                                setQuery(e.target.value)
                            }
                            placeholder="Buscar productos..."
                            className="store_product_search"
                        />

                    )
                }

                <div className="store_category_bar">

                    <button
                        type="button"
                        className="store_category_bar_trigger"
                        onClick={() => setMobileMenuOpen(true)}
                    >
                        <span className="store_mobile_hamburger">
                            <i />
                            <i />
                            <i />
                        </span>

                        <span>Categorías</span>
                    </button>

                    <TagsSelect
                        value={sortBy}
                        className="store_catalog_sort"
                        onChange={setSortBy}
                        options={[
                            { value: "recent", label: "Más recientes" },
                            { value: "price_asc", label: "Menor precio" },
                            { value: "price_desc", label: "Mayor precio" },
                            { value: "name_asc", label: "A-Z" },
                            { value: "name_desc", label: "Z-A" },
                            { value: "featured", label: "Destacados" }
                        ]}
                        maxWidth="180px"
                    />

                </div>

                <div className="store_category_current_pill">
                    {
                        category === "all"
                            ? "Todos los productos"
                            : categories.find(item =>
                                String(item.id) === String(category)
                            )?.name
                    }
                </div>

                {mobileMenuOpen && (
                    <div className="store_mobile_drawer_overlay">
                        <aside className="store_mobile_drawer">
                            <div className="store_mobile_drawer_head">
                                <div>
                                    <small>Catálogo</small>
                                    <strong>Categorías</strong>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    ×
                                </button>
                            </div>

                            <nav className="store_mobile_drawer_nav">

                                <nav className="store_mobile_drawer_nav">

                                    {categories.map(item => (
                                        <a
                                            key={item.id}
                                            href="#store-products"
                                            className={
                                                String(category) === String(item.id)
                                                    ? "active"
                                                    : ""
                                            }
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setCategory(item.id);
                                                setMobileMenuOpen(false);
                                            }}
                                        >
                                            <span>{item.name}</span>
                                            <strong>›</strong>
                                        </a>
                                    ))}

                                </nav>
                            </nav>
                        </aside>
                    </div>
                )}

            </div>

            {
                filteredProducts.length === 0 ? (
                    <div className="store_catalog_empty">
                        No encontramos productos con ese filtro.
                    </div>
                ) : (
                    <div className="row g-4">
                        {
                            paginatedProducts.map(product => (
                                <div
                                    className="col-12 col-sm-6 col-md-4 col-lg-3"
                                    key={product.id}
                                >
                                    <Link
                                        href={`/p/${store.slug}/products/${product.id}`}
                                        className="store_product_card_link"
                                    >
                                        <div className="store_product_card">
                                            <StoreFavoriteButton
                                                storeId={store.id}
                                                productId={product.id}
                                            />
                                            <StoreShareButton
                                                store={store}
                                                product={product}
                                            />
                                            {
                                                product.image_url ? (
                                                    <div className="store_product_image_wrap">
                                                        <Image
                                                            src={product.image_url}
                                                            alt={product.title}
                                                            fill
                                                            sizes="
                                                                (max-width: 575px) 100vw,
                                                                (max-width: 767px) 50vw,
                                                                (max-width: 991px) 33vw,
                                                                25vw
                                                            "
                                                            className="store_product_image"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="store_product_image_placeholder">
                                                        Sin imagen
                                                    </div>
                                                )
                                            }

                                            <div className="store_product_card_body">

                                                <h3 className="store_product_card_title">
                                                    {product.title}
                                                </h3>

                                                <div className="store_product_card_footer">
                                                    {
                                                        product.sale_price ? (
                                                            <>
                                                                <div className="store_product_price">
                                                                    {formatStorePrice(product.sale_price, product.currency)}
                                                                </div>

                                                                <div className="store_product_old_price">
                                                                    {formatStorePrice(product.price, product.currency)}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="fw-bold">
                                                                {formatStorePrice(product.price, product.currency)}
                                                            </div>
                                                        )
                                                    }

                                                    <span className="store_product_card_btn">
                                                        Ver producto
                                                    </span>
                                                </div>

                                            </div>

                                        </div>
                                    </Link>
                                </div>

                            ))
                        }
                        {
                            totalPages > 1 && (
                                <div className="store_catalog_pagination">
                                    {
                                        Array.from({
                                            length: totalPages
                                        }).map((_, index) => {
                                            const pageNumber =
                                                index + 1;

                                            return (
                                                <button
                                                    key={pageNumber}
                                                    type="button"
                                                    className={
                                                        page === pageNumber
                                                            ? "store_catalog_page_btn active"
                                                            : "store_catalog_page_btn"
                                                    }
                                                    onClick={() =>
                                                        setPage(pageNumber)
                                                    }
                                                >
                                                    {pageNumber}
                                                </button>
                                            );
                                        })
                                    }
                                </div>
                            )
                        }
                    </div>
                )
            }
        </>
    );
}