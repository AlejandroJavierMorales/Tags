// =====================================
// COMPONENT: StorePublicRenderer
// Descripción: Render público de Tags Tienda.
// =====================================

"use client";

import { useEffect, useMemo, useState } from "react";

import Image from "next/image";
import { FaShoppingCart } from "react-icons/fa";
import "@/app/styles/tags_store_public.css";
import StoreProductCard from "./storeProductCard";
import StoreCartDrawer
    from "./StoreCartDrawer";
import {
    getCartCount,
    getCartItems
} from "../lib/storeCart";



export default function StorePublicRenderer({
    store,
    categories = [],
    products = []
}) {
    const [query, setQuery] =
        useState("");

    const [categoryId, setCategoryId] =
        useState("");
    const [cartOpen, setCartOpen] =
        useState(false);

    const [cartCount, setCartCount] =
        useState(0);

    const styles =
        store?.styles_json || {};

    const settings =
        store?.settings_json || {};

    const filteredProducts =
        useMemo(() => {
            return products.filter(product => {
                const matchesQuery =
                    !query ||
                    String(product.title || "")
                        .toLowerCase()
                        .includes(query.toLowerCase()) ||
                    String(product.description || "")
                        .toLowerCase()
                        .includes(query.toLowerCase()) ||
                    String(product.category_name || "")
                        .toLowerCase()
                        .includes(query.toLowerCase());

                const matchesCategory =
                    !categoryId ||
                    Number(product.category_id) === Number(categoryId);

                return matchesQuery && matchesCategory;
            });
        }, [
            products,
            query,
            categoryId
        ]);

    const featuredProducts =
        products.filter(product =>
            Number(product.is_featured) === 1
        );

    const regularProducts =
        filteredProducts.filter(product =>
            Number(product.is_featured) !== 1
        );

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

            <section className="store_public_hero">

                {store.cover_url && (
                    <img
                        src={store.cover_url}
                        alt=""
                        className="store_public_cover"
                    />
                )}

                <div className="store_public_hero_content">

                    <div className="store_public_brand">

                        {store.logo_url && (
                            <div className="store_public_logo_wrap">
                                <Image
                                    src={store.logo_url}
                                    alt={store.name || "Logo de tienda"}
                                    width={300}
                                    height={300}
                                    className="store_public_logo"
                                    unoptimized
                                />
                            </div>
                        )}

                        <div className="store_public_brand_text">
                            <h1>{store.name}</h1>

                            {store.description && (
                                <p>{store.description}</p>
                            )}
                        </div>

                    </div>

                    {store.whatsapp && (
                        <a
                            className="store_public_whatsapp"
                            href={`https://wa.me/${String(store.whatsapp).replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Contactar por WhatsApp
                        </a>
                    )}

                </div>

            </section>

            <section className="store_public_controls">

                {settings.showSearch !== false && (
                    <input
                        value={query}
                        onChange={(e) =>
                            setQuery(e.target.value)
                        }
                        placeholder="Buscar productos..."
                    />
                )}

                {settings.showCategories !== false && (
                    <select
                        value={categoryId}
                        onChange={(e) =>
                            setCategoryId(e.target.value)
                        }
                    >
                        <option value="">
                            Todas las categorías
                        </option>

                        {categories.map(category => (
                            <option
                                key={category.id}
                                value={category.id}
                            >
                                {category.name}
                            </option>
                        ))}
                    </select>
                )}

            </section>

            {featuredProducts.length > 0 && (
                <section className="store_public_section">

                    <div className="store_public_section_header">
                        <h2>
                            Productos destacados
                        </h2>

                        {/* <span>
                            {featuredProducts.length}
                        </span> */}
                    </div>

                    <div className="store_public_products_grid">
                        {featuredProducts.map(product => (
                            <StoreProductCard
                                key={product.id}
                                product={product}
                                store={store}
                            />
                        ))}
                    </div>

                </section>
            )}
            {regularProducts.length > 0 && (
                <section className="store_public_section">

                    <div className="store_public_section_header">
                        <h2>
                            Productos
                        </h2>

                        {/* <span>
                            {regularProducts.length}
                        </span> */}
                    </div>

                    <div className="store_public_products_grid">
                        {regularProducts.map(product => (
                            <StoreProductCard
                                key={product.id}
                                product={product}
                                store={store}
                            />
                        ))}
                    </div>

                </section>
            )}
            <button
                type="button"
                className="store_cart_floating_btn"
                onClick={() => setCartOpen(true)}
            >
                <span className="store_cart_count m-0 p-0 mt-1">({cartCount})</span>
                <span className="store_cart_icon m-0 p-0 mb-2">
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