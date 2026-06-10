"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { catalogue }
    from "../../config/catalogue";

import ImageCarousel
    from "../ImageCarousel";

import showAlert
    from "../../components/showAlert";

const STORAGE_KEY =
    "qr_cart";

// ========================================
// COMPONENT
// ========================================

export default function Products() {

    const [cart, setCart] =
        useState({});

    const [activeCategory, setActiveCategory] =
        useState("all");

    // ========================================
    // LOAD CART
    // ========================================

    useEffect(() => {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (saved) {
            setCart(JSON.parse(saved));
        }

    }, []);

    // ========================================
    // SAVE CART
    // ========================================

    useEffect(() => {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(cart)
        );

    }, [cart]);

    // ========================================
    // HELPERS
    // ========================================

    const hasVariants = (item) =>
        item?.variants?.material?.length > 0
        ||
        item?.variants?.support?.length > 0;

    const isComplete = (
        item,
        selected
    ) => {

        if (!hasVariants(item)) {
            return true;
        }

        const needMaterial =
            item?.variants?.material?.length > 0;

        const needSupport =
            item?.variants?.support?.length > 0;

        if (
            needMaterial
            &&
            !selected.material
        ) {
            return false;
        }

        if (
            needSupport
            &&
            !selected.support
        ) {
            return false;
        }

        return true;
    };

    // ========================================
    // CART
    // ========================================

    const toggleItem = (
        key,
        item,
        base
    ) => {

        setCart((prev) => {

            const updated =
                { ...prev };

            if (updated[key]) {

                delete updated[key];

                return updated;
            }

            updated[key] = {

                ...base,

                quantity: 1,

                notes: "",
            };

            return updated;
        });
    };

    const updateField = (
        key,
        field,
        value
    ) => {

        setCart((prev) => ({

            ...prev,

            [key]: {

                ...prev[key],

                [field]: value,
            },
        }));
    };

    const updateQty = (
        key,
        qty
    ) => {

        setCart((prev) => ({

            ...prev,

            [key]: {

                ...prev[key],

                quantity:
                    Number(qty),
            },
        }));
    };

    const updateNotes = (
        key,
        value
    ) => {

        setCart((prev) => ({

            ...prev,

            [key]: {

                ...prev[key],

                notes: value,
            },
        }));
    };

    // ========================================
    // TOTAL
    // ========================================

    const total =
        useMemo(() => {

            return Object.values(cart)
                .reduce(

                    (
                        acc,
                        item
                    ) => (
                        acc +
                        (
                            item.basePrice *
                            item.quantity
                        )
                    ),

                    0
                );

        }, [cart]);

    // ========================================
    // WHATSAPP
    // ========================================

    const sendWhatsApp = () => {

        const items =
            Object.values(cart);

        if (items.length === 0) {

            showAlert({

                title:
                    "No hay productos",

                text:
                    "Seleccioná al menos un producto.",

                icon:
                    "info",
            });

            return;
        }

        for (const selected of items) {

            const item =
                catalogue
                    .flatMap(
                        (c) => c.items
                    )
                    .find(
                        (i) =>
                            i.id === selected.id
                    );

            if (
                item
                &&
                !isComplete(
                    item,
                    selected
                )
            ) {

                showAlert({

                    title:
                        "Producto incompleto",

                    text:
                        `Faltan opciones en ${selected.name}`,

                    icon:
                        "warning",
                });

                return;
            }
        }

        let msg =
            "Hola! 👋 Quiero consultar por:%0A%0A";

        items.forEach((p) => {

            msg += `• ${p.name}%0A`;

            msg += `  Tipo: ${p.typeLabel}%0A`;

            if (p.material) {
                msg += `  Material: ${p.material}%0A`;
            }

            if (p.support) {
                msg += `  Soporte: ${p.support}%0A`;
            }

            msg += `  Cantidad: ${p.quantity}%0A`;

            if (p.basePrice > 0) {

                msg += `  Precio Unitario: $${p.basePrice}%0A`;

                msg += `  Subtotal: $${p.basePrice * p.quantity}%0A`;
            }

            if (p.notes) {

                msg += `  Observaciones: ${p.notes}%0A`;
            }

            msg += `%0A`;
        });

        if (total > 0) {
            msg += `TOTAL: $${total}`;
        }

        window.open(
            `https://wa.me/5493546562855?text=${msg}`,
            "_blank"
        );
    };

    // ========================================
    // FILTERED
    // ========================================

    const filteredCatalogue =
        activeCategory === "all"
            ? catalogue
            : catalogue.filter(
                (c) =>
                    c.type === activeCategory
            );

    // ========================================
    // RENDER
    // ========================================

    return (

        <section className="tags_store_page">

            {/* ======================================== */}
            {/* HERO */}
            {/* ======================================== */}

            <section className="tags_store_hero">

                <div className="container">

                    <div className="tags_store_hero_content">

                        <div className="tags_store_badge">

                            Marketplace Tags

                        </div>

                        <h1 className="tags_store_title">

                            Soluciones QR inteligentes
                            para negocios, eventos y marcas

                        </h1>

                        <p className="tags_store_subtitle">

                            Productos Físicos, Software para gestionarlos,
                            páginas web, NFC,
                            reseñas Google,
                            identidad digital
                            y experiencias conectadas
                            en una sola plataforma.

                        </p>

                        {/* CATEGORIES */}

                        <div className="tags_store_categories">

                            <button
                                onClick={() =>
                                    setActiveCategory("all")
                                }
                                className="tags_store_category"
                            >
                                Todos
                            </button>

                            <button
                                onClick={() =>
                                    setActiveCategory("hardware")
                                }
                                className="tags_store_category"
                            >
                                Productos Físicos
                            </button>

                            <button
                                onClick={() =>
                                    setActiveCategory("software")
                                }
                                className="tags_store_category"
                            >
                                Software de Gestión
                            </button>

                            <button
                                onClick={() =>
                                    setActiveCategory("addon")
                                }
                                className="tags_store_category"
                            >
                                Funciones Adicionales
                            </button>

                        </div>

                    </div>

                </div>

            </section>

            {/* ======================================== */}
            {/* PRODUCTS */}
            {/* ======================================== */}

            <section className="tags_store_products_section">

                <div className="container">

                    {filteredCatalogue.map((category) => (

                        <section
                            key={category.category}
                            className="tags_products_category"
                        >

                            {/* CATEGORY HEADER */}

                            <div className="tags_products_category_header">

                                <h2 className="tags_products_category_title">

                                    {category.category}

                                </h2>

                                <p className="tags_products_category_subtitle">

                                    {category.description}

                                </p>

                            </div>

                            {/* GRID */}

                            <div className="row g-4">

                                {category.items.map((item) => (

                                    <div
                                        key={item.id}
                                        className="col-12 col-md-6 col-xl-4"
                                    >

                                        <article className="tags_product_card">

                                            {/* IMAGE */}

                                            <div className="tags_product_image_wrapper">

                                                <ImageCarousel
                                                    images={item.images}
                                                />

                                            </div>

                                            {/* CONTENT */}

                                            <div className="tags_product_content">

                                                {/* TITLE */}

                                                <h3 className="tags_product_title">

                                                    {item.name}

                                                </h3>

                                                {/* DESCRIPTION */}

                                                <p className="tags_product_description">

                                                    {item.description}

                                                </p>

                                                {/* FEATURES */}

                                                {
                                                    item.features
                                                    &&
                                                    (
                                                        <div className="tags_product_tags">

                                                            {
                                                                item.features.map(
                                                                    (feature) => (

                                                                        <span
                                                                            key={feature}
                                                                        >

                                                                            {feature}

                                                                        </span>
                                                                    )
                                                                )
                                                            }

                                                        </div>
                                                    )
                                                }

                                                {/* TYPES */}

                                                <div className="d-flex flex-column gap-3 mt-4">

                                                    {item.types.map((type) => {

                                                        const key =
                                                            `${item.id}_${type.code}`;

                                                        const selected =
                                                            cart[key];

                                                        return (

                                                            <div
                                                                key={key}
                                                                className={`tags_store_option ${selected ? "tags_store_option_active" : ""}`}
                                                            >

                                                                {/* CHECK */}

                                                                <label className="tags_store_checkbox">

                                                                    <input
                                                                        type="checkbox"
                                                                        checked={!!selected}
                                                                        onChange={() =>
                                                                            toggleItem(
                                                                                key,
                                                                                item,
                                                                                {
                                                                                    ...item,
                                                                                    type: type.code,
                                                                                    typeLabel: type.label,
                                                                                }
                                                                            )
                                                                        }
                                                                    />

                                                                    <span>

                                                                        {type.label}

                                                                    </span>

                                                                </label>

                                                                {/* CONFIG */}

                                                                {selected && (

                                                                    <div className="tags_store_config">

                                                                        {/* MATERIAL */}

                                                                        {item.variants?.material && (

                                                                            <select
                                                                                className="form-select"
                                                                                value={selected.material || ""}
                                                                                onChange={(e) =>
                                                                                    updateField(
                                                                                        key,
                                                                                        "material",
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                            >

                                                                                <option value="">
                                                                                    Material
                                                                                </option>

                                                                                {
                                                                                    item.variants.material.map((m) => (

                                                                                        <option
                                                                                            key={m.code}
                                                                                            value={m.code}
                                                                                        >

                                                                                            {m.label}

                                                                                        </option>
                                                                                    ))
                                                                                }

                                                                            </select>

                                                                        )}

                                                                        {/* SUPPORT */}

                                                                        {item.variants?.support && (

                                                                            <select
                                                                                className="form-select"
                                                                                value={selected.support || ""}
                                                                                onChange={(e) =>
                                                                                    updateField(
                                                                                        key,
                                                                                        "support",
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                            >

                                                                                <option value="">
                                                                                    Soporte
                                                                                </option>

                                                                                {
                                                                                    item.variants.support.map((s) => (

                                                                                        <option
                                                                                            key={s.code}
                                                                                            value={s.code}
                                                                                        >

                                                                                            {s.label}

                                                                                        </option>
                                                                                    ))
                                                                                }

                                                                            </select>

                                                                        )}

                                                                        {/* QTY */}

                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            className="form-control"
                                                                            placeholder="Cantidad"
                                                                            value={selected.quantity}
                                                                            onChange={(e) =>
                                                                                updateQty(
                                                                                    key,
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                        />

                                                                        {/* NOTES */}

                                                                        <textarea
                                                                            className="form-control"
                                                                            rows="3"
                                                                            placeholder="Observaciones..."
                                                                            value={selected.notes}
                                                                            onChange={(e) =>
                                                                                updateNotes(
                                                                                    key,
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                        />

                                                                    </div>

                                                                )}

                                                            </div>

                                                        );
                                                    })}

                                                </div>

                                                {/* FOOTER */}

                                                <div className="tags_product_footer mt-4">

                                                    <div className="tags_product_price">

                                                        {
                                                            item.priceLabel
                                                            ||
                                                            `$${item.basePrice}`
                                                        }

                                                    </div>

                                                    {
                                                        item.href
                                                            ? (
                                                                <Link
                                                                    href={item.href}
                                                                    className="tags_product_button"
                                                                >
                                                                    Ver más
                                                                </Link>
                                                            )
                                                            : (
                                                                <button
                                                                    className="tags_product_button"
                                                                    onClick={sendWhatsApp}
                                                                >
                                                                    Consultar
                                                                </button>
                                                            )
                                                    }

                                                </div>

                                            </div>

                                        </article>

                                    </div>

                                ))}

                            </div>

                        </section>

                    ))}

                </div>

            </section>

            {/* ======================================== */}
            {/* FLOAT CART */}
            {/* ======================================== */}

            <div className="tags_store_cart">

                <div>

                    <small className="d-block">

                        Total estimado

                    </small>

                    <strong className="tags_store_cart_total">

                        ${total}

                    </strong>

                </div>

                <button
                    className="tags_store_cart_btn"
                    onClick={sendWhatsApp}
                >

                    🛒 Consultar Pedido

                </button>

            </div>

        </section>
    );
}