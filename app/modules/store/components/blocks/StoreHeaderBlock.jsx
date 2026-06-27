"use client";

import Image
    from "next/image";

import Link
    from "next/link";

import {
    useEffect,
    useState
}
from "react";

import {
    FiHeart,
    FiShoppingCart
}
from "react-icons/fi";

import {
    getCartCount
}
from "../../lib/storeCart";

import {
    getStoreSessionId
}
from "../../lib/storeSession";

export default function StoreHeaderBlock({
    entity,
    content = {},
    styles = {}
}) {

    const [cartCount, setCartCount] =
        useState(0);

    const [favoriteCount, setFavoriteCount] =
        useState(0);

    useEffect(() => {
        function updateCount() {
            setCartCount(
                getCartCount()
            );
        }

        updateCount();
        updateFavoriteCount();

        window.addEventListener(
            "tags_store_cart_updated",
            updateCount
        );

        window.addEventListener(
            "tags_store_favorites_updated",
            updateFavoriteCount
        );

        return () => {
            window.removeEventListener(
                "tags_store_cart_updated",
                updateCount
            );

            window.removeEventListener(
                "tags_store_favorites_updated",
                updateFavoriteCount
            );
        };
    }, [
        entity?.id
    ]);

    async function updateFavoriteCount() {
        if (!entity?.id) {
            return;
        }

        const sessionId =
            getStoreSessionId();

        if (!sessionId) {
            return;
        }

        try {
            const res =
                await fetch(
                    `/api/store/public/favorites/list?storeId=${entity.id}&sessionId=${encodeURIComponent(sessionId)}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            setFavoriteCount(
                data.favorites?.length || 0
            );

        } catch (err) {
            console.error(err);
        }
    }

    return (
        <header className="store_header_block store_header_sticky">

            <div
                className="
                    container
                    py-3
                    d-flex
                    align-items-center
                    justify-content-between
                    gap-3
                "
            >

                <div
                    className="
                        d-flex
                        align-items-center
                        gap-3
                        min-w-0
                    "
                >

                    {
                        entity?.logo_url && (
                            <Image
                                src={entity.logo_url}
                                alt={
                                    entity?.name ||
                                    "Tienda"
                                }
                                width={220}
                                height={70}
                                priority
                                className="
                                    tags_business_logo
                                    store_header_logo
                                "
                            />
                        )
                    }

                    <div className="min-w-0">

                        <div
                            className="
                                fw-bold
                                fs-5
                                lh-sm
                                text-truncate
                            "
                        >
                            {
                                entity?.name ||
                                "Mi Tienda"
                            }
                        </div>

                        {
                            entity?.description && (
                                <div
                                    className="
                                        small
                                        text-muted
                                        text-truncate
                                        d-none
                                        d-md-block
                                    "
                                >
                                    {entity.description}
                                </div>
                            )
                        }

                    </div>

                </div>

                <div className="store_header_actions">

                    <button
                        type="button"
                        className="store_header_favorite_btn"
                        aria-label="Ver favoritos"
                        onClick={() => {
                            window.history.replaceState(
                                null,
                                "",
                                `/p/${entity?.slug}#favorites`
                            );

                            window.dispatchEvent(
                                new CustomEvent(
                                    "tags_store_catalog_filter",
                                    {
                                        detail: {
                                            category: "favorites"
                                        }
                                    }
                                )
                            );
                        }}
                    >
                        <FiHeart />

                        {favoriteCount > 0 && (
                            <strong>
                                {favoriteCount}
                            </strong>
                        )}
                    </button>

                    <Link
                        href={`/p/${entity?.slug}/cart`}
                        className="store_header_cart_btn"
                        aria-label="Ver carrito"
                    >
                        <FiShoppingCart />

                        {cartCount > 0 && (
                            <strong>
                                {cartCount}
                            </strong>
                        )}
                    </Link>

                </div>

            </div>

        </header>
    );
}