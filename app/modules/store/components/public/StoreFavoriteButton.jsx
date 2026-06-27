// =====================================
// Archivo:
// /app/modules/store/components/public/StoreFavoriteButton.jsx
//
// Descripción:
// Botón favorito público.
//
// Función:
// - Mostrar estado favorito.
// - Toggle favorito.
// - Persistir en BD.
//
// Utilizado por:
// - StoreProductGridClient
// - StoreFeaturedProductsBlock
// - StoreProductDetailClient
//
// Contexto:
// store
// =====================================

"use client";

import {
    useEffect,
    useState
}
    from "react";

import {
    FaHeart,
    FaRegHeart
}
    from "react-icons/fa";

import {
    getStoreSessionId
}
    from "../../lib/storeSession";

export default function StoreFavoriteButton({
    storeId,
    productId
}) {

    const [loading, setLoading] =
        useState(false);

    const [isFavorite, setIsFavorite] =
        useState(false);

    useEffect(() => {

        if (!storeId || !productId) {
            return;
        }
        loadFavorite();
    }, [
        storeId,
        productId
    ]);

    async function loadFavorite() {

        try {

            const sessionId =
                getStoreSessionId();

            if (!sessionId) {
                return;
            }

            const res =
                await fetch(
                    `/api/store/public/favorites/list?storeId=${storeId}&sessionId=${encodeURIComponent(sessionId)}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            setIsFavorite(
                (data.favorites || [])
                    .map(Number)
                    .includes(
                        Number(productId)
                    )
            );


        } catch (err) {

            console.error(
                "LOAD FAVORITE ERROR:",
                err
            );

        }

    }

    async function handleToggle(e) {

        e.preventDefault();
        e.stopPropagation();

        if (loading) {
            return;
        }

        try {

            setLoading(true);

            const sessionId =
                getStoreSessionId();

            const res =
                await fetch(
                    "/api/store/public/favorites/toggle",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            storeId,
                            productId,
                            sessionId
                        })
                    }
                );

            const data =
                await res.json();

            setIsFavorite(
                data.isFavorite
            );
                        window.dispatchEvent(
                new Event("tags_store_favorites_updated")
            );

        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);

        }

    }

    return (
    <button
        type="button"
        className={
            isFavorite
                ? "store_favorite_btn is-active"
                : "store_favorite_btn"
        }
        onClick={handleToggle}
        aria-label={
            isFavorite
                ? "Quitar de favoritos"
                : "Agregar a favoritos"
        }
    >
        {
            isFavorite
                ? <FaHeart />
                : <FaRegHeart />
        }
    </button>
);

}