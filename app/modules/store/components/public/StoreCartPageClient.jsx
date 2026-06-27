// =====================================
// Archivo:
// /app/modules/store/components/public/StoreCartPageClient.jsx
//
// Descripción:
// Página pública de carrito de Tags Store.
// Muestra productos, cantidades y resumen.
// No incluye checkout.
//
// Contexto:
// store
// =====================================

"use client";

import { useEffect, useState }
    from "react";

import Image
    from "next/image";

import Link
    from "next/link";

import {
    FiArrowLeft,
    FiMinus,
    FiPlus,
    FiTrash2
}
    from "react-icons/fi";

import StoreHeaderBlock
    from "../blocks/StoreHeaderBlock";

import { useRouter } from "next/navigation";



import {
    getCartItems,
    getCartTotal,
    removeCartItem,
    updateCartItemQuantity
}
    from "../../lib/storeCart";

import {
    formatStorePrice
}
    from "../../lib/formatStorePrice";
import showAlert from "@/app/components/showAlert";

export default function StoreCartPageClient({
    store
}) {
    const [items, setItems] = useState([]);

    const router = useRouter();

    useEffect(() => {
        setItems(
            getCartItems()
        );
    }, []);

    const subtotal =
        getCartTotal(
            items
        );

    function handleQuantity(
        index,
        quantity
    ) {
        const nextItems =
            updateCartItemQuantity(
                index,
                Math.max(
                    1,
                    Number(quantity || 1)
                )
            );

        setItems(
            nextItems
        );
    }

    function handleRemove(index) {
        const nextItems =
            removeCartItem(
                index
            );

        setItems(
            nextItems
        );
    }

    async function handleContinue() {

        if (!items.length) {
            return;
        }

        try {

            const res =
                await fetch(
                    "/api/store/public/cart/validate",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            storeId:
                                store.id,

                            items:
                                items.map(item => ({
                                    product_id:
                                        item.product_id,

                                    variant_id:
                                        item.variant_id,

                                    quantity:
                                        item.quantity
                                }))
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title:
                        "Stock insuficiente",

                    text:
                        data.error ||
                        "No hay stock suficiente.",

                    icon:
                        "warning"
                });

                return;
            }

            router.push(
                `/p/${store.slug}/checkout`
            );

        } catch (err) {

            showAlert({
                title:
                    "Error",

                text:
                    err.message,

                icon:
                    "error"
            });

        }

    }



    /*  UI  */

    return (
        <main className="store_cart_page">

            <StoreHeaderBlock
                entity={store}
            />

            <section className="store_cart_page_shell">
                <div className="container">

                    <div className="mb-4">
                        <Link
                            href={`/p/${store.slug}`}
                            className="store_detail_back_link"
                        >
                            <FiArrowLeft />
                            Seguir comprando
                        </Link>
                    </div>

                    <div className="row g-4 align-items-start">

                        <div className="col-12 col-lg-8">

                            <div className="store_cart_page_panel">

                                <div className="store_cart_page_header">
                                    <h1>
                                        Carrito
                                    </h1>

                                    <span>
                                        {items.length} producto(s)
                                    </span>
                                </div>

                                {
                                    !items.length && (
                                        <div className="store_cart_page_empty">
                                            Tu carrito está vacío.
                                        </div>
                                    )
                                }

                                {
                                    items.map(
                                        (item, index) => (
                                            <div
                                                key={`${item.product_id}-${item.variant_id || "base"}-${index}`}
                                                className="store_cart_page_item"
                                            >

                                                <div className="store_cart_page_product">

                                                    <div className="store_cart_page_image_wrap">
                                                        {
                                                            item.image_url ? (
                                                                <Image
                                                                    src={item.image_url}
                                                                    alt={item.product_title}
                                                                    fill
                                                                    sizes="96px"
                                                                    className="store_cart_page_image"
                                                                />
                                                            ) : (
                                                                <div className="store_cart_page_image_placeholder">
                                                                    Sin imagen
                                                                </div>
                                                            )
                                                        }
                                                    </div>

                                                    <div>
                                                        <h2>
                                                            {item.product_title}
                                                        </h2>

                                                        {
                                                            item.variant_title && (
                                                                <p>
                                                                    {item.variant_title}
                                                                </p>
                                                            )
                                                        }

                                                        <button
                                                            type="button"
                                                            className="store_cart_page_remove"
                                                            onClick={() =>
                                                                handleRemove(index)
                                                            }
                                                        >
                                                            <FiTrash2 />
                                                            Quitar
                                                        </button>
                                                    </div>

                                                </div>

                                                <div className="store_cart_page_qty">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            Number(item.quantity) <= 1
                                                        }
                                                        onClick={() =>
                                                            handleQuantity(
                                                                index,
                                                                Number(item.quantity) - 1
                                                            )
                                                        }
                                                    >
                                                        <FiMinus />
                                                    </button>

                                                    <strong>
                                                        {item.quantity}
                                                    </strong>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleQuantity(
                                                                index,
                                                                Number(item.quantity) + 1
                                                            )
                                                        }
                                                    >
                                                        <FiPlus />
                                                    </button>
                                                </div>

                                                <div className="store_cart_page_price">
                                                    <span>
                                                        {
                                                            formatStorePrice(
                                                                item.unit_price,
                                                                item.currency || store.currency || "ARS"
                                                            )
                                                        }
                                                    </span>

                                                    <strong>
                                                        {
                                                            formatStorePrice(
                                                                item.total_price,
                                                                item.currency || store.currency || "ARS"
                                                            )
                                                        }
                                                    </strong>
                                                </div>

                                            </div>
                                        )
                                    )
                                }

                            </div>

                        </div>

                        <div className="col-12 col-lg-4">

                            <aside className="store_cart_summary_panel">

                                <h2>
                                    Resumen de compra
                                </h2>

                                <div className="store_cart_summary_row">
                                    <span>
                                        Productos
                                    </span>

                                    <strong>
                                        {
                                            formatStorePrice(
                                                subtotal,
                                                store.currency || "ARS"
                                            )
                                        }
                                    </strong>
                                </div>

                                <div className="store_cart_summary_total">
                                    <span>
                                        Total
                                    </span>

                                    <strong>
                                        {
                                            formatStorePrice(
                                                subtotal,
                                                store.currency || "ARS"
                                            )
                                        }
                                    </strong>
                                </div>

                                <button
                                    type="button"
                                    className="btn store_btn_primary w-100 mt-3"
                                    disabled={!items.length}
                                    onClick={handleContinue}
                                >
                                    Continuar
                                </button>

                            </aside>

                        </div>

                    </div>

                </div>
            </section>

        </main>
    );
}