"use client";

import Image from "next/image";
import Link from "next/link";

import { useEffect, useState } from "react";

import { FiHeart, FiShoppingCart } from "react-icons/fi";

import { getCartCount } from "../../lib/storeCart";

import { getStoreSessionId } from "../../lib/storeSession";

import { FiSearch } from "react-icons/fi";





export default function StoreHeaderBlock({
    entity,
    content = {},
    styles = {}
}) {



    const [cartCount, setCartCount] =
        useState(0);

    const [favoriteCount, setFavoriteCount] =
        useState(0);

    const [search, setSearch] =
        useState("");

    const showLogo =
        content.showLogo !== false;

    const showName =
        content.showName !== false;

    const showDescription =
        content.showDescription !== false;

    const showFavorites =
        content.showFavorites !== false;

    const showCart =
        content.showCart !== false;

    const sticky =
        content.sticky !== false;

    const logoWidth =
        Number(content.logoWidth || 220);

    const logoHeight =
        Number(content.logoHeight || 70);

    const logoPadding =
        Number(content.logoPadding || 0);

    const logoPosition =
        content.logoPosition || "left";



    function getTextStyle(part) {

        return (
            styles?.typography?.[part] ||
            {}
        );

    }

    const sectionStyle = {

        backgroundColor:
            styles.backgroundColor || undefined,

        color:
            styles.textColor || undefined,

        textAlign:
            styles.alignment || undefined,

        padding:
            styles.padding || undefined,

        marginTop:
            styles.marginTop || undefined,

        marginBottom:
            styles.marginBottom || undefined

    };



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

    }, [entity?.id]);

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

    function updateSearch(value) {

        setSearch(value);

        window.dispatchEvent(

            new CustomEvent(
                "tags_store_catalog_search",
                {
                    detail: {
                        search: value
                    }
                }
            )

        );

    }


    /*  UI  */

    return (

        <header
            className={[
                "store_header_block",
                sticky
                    ? "store_header_sticky"
                    : ""
            ].join(" ")}
            style={sectionStyle}
        >

            <div
                className={[
                    "store_header_inner",
                    logoPosition === "center"
                        ? "store_header_inner_logo_center_layout"
                        : ""
                ].join(" ")}
            >

                <Link
                    href={`/p/${entity?.slug}`}
                    className="store_header_brand"
                >

                    {
                        showLogo &&
                        logoPosition !== "center" &&
                        logoPosition !== "hidden" &&
                        entity?.logo_url && (

                            <Image
                                src={entity.logo_url}
                                alt={entity?.name || "Tienda"}
                                width={logoWidth}
                                height={logoHeight}
                                priority
                                className="store_header_logo"
                                style={{
                                    width: logoWidth,
                                    height: logoHeight,
                                    objectFit: "contain",
                                    padding: logoPadding
                                }}
                            />

                        )
                    }

                    <div className="store_header_info">

                        {showName && (
                            <div
                                className="store_header_name"
                                style={getTextStyle("title")}
                            >
                                {entity?.name || "Mi Tienda"}
                            </div>
                        )}

                        {showDescription && entity?.description && (
                            <div
                                className="store_header_description"
                                style={getTextStyle("text")}
                            >
                                {entity.description}
                            </div>
                        )}

                    </div>

                </Link>

                {
                    showLogo &&
                    logoPosition === "center" &&
                    entity?.logo_url && (

                        <Link
                            href={`/p/${entity?.slug}`}
                            className="store_header_logo_center"
                        >
                            <Image
                                src={entity.logo_url}
                                alt={entity?.name || "Tienda"}
                                width={logoWidth}
                                height={logoHeight}
                                priority
                                className="store_header_logo"
                                style={{
                                    width: logoWidth,
                                    height: logoHeight,
                                    objectFit: "contain",
                                    padding: logoPadding
                                }}
                            />
                        </Link>

                    )
                }

                <div className="store_header_right">

                    {
                        content.showSearch !== false && (
                            <div className="store_header_search_row">
                                <div className="store_header_search_box">
                                    <span className="store_header_search_icon">
                                        <FiSearch />
                                    </span>

                                    <input
                                        type="search"
                                        value={search}
                                        placeholder="Buscar productos..."
                                        className="store_header_search"
                                        onChange={(e) =>
                                            updateSearch(e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                        )
                    }

                    <div className="store_header_actions">

                        {showFavorites && (
                            <button
                                type="button"
                                className="store_header_favorite_btn"
                                aria-label="Favoritos"
                                style={getTextStyle("button")}
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
                        )}

                        {showCart && (
                            <Link
                                href={`/p/${entity?.slug}/cart`}
                                className="store_header_cart_btn"
                                style={getTextStyle("button")}
                            >
                                <FiShoppingCart />

                                {cartCount > 0 && (
                                    <strong>
                                        {cartCount}
                                    </strong>
                                )}
                            </Link>
                        )}

                    </div>

                </div>

            </div>

        </header>

    );

}