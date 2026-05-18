"use client";

import { useEffect, useMemo, useState } from "react";

import { catalogue } from "../../config/catalogue";

import ImageCarousel from "../ImageCarousel";

import showAlert from "../../components/showAlert";

const STORAGE_KEY = "qr_cart";

// =========================
// COMPONENT
// =========================

export default function Products() {

    const [cart, setCart] = useState({});

    // =========================
    // LOAD CART
    // =========================

    useEffect(() => {

        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            setCart(JSON.parse(saved));
        }

    }, []);

    // =========================
    // SAVE CART
    // =========================

    useEffect(() => {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(cart)
        );

    }, [cart]);

    // =========================
    // HELPERS
    // =========================

    const hasVariants = (item) =>
        item?.variants?.material?.length > 0 ||
        item?.variants?.support?.length > 0;

    const isComplete = (item, selected) => {

        if (!hasVariants(item)) return true;

        const needMaterial =
            item?.variants?.material?.length > 0;

        const needSupport =
            item?.variants?.support?.length > 0;

        if (needMaterial && !selected.material) {
            return false;
        }

        if (needSupport && !selected.support) {
            return false;
        }

        return true;
    };

    // =========================
    // CART ACTIONS
    // =========================

    const toggleItem = (key, item, base) => {

        setCart((prev) => {

            const updated = { ...prev };

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

    const updateField = (key, field, value) => {

        setCart((prev) => ({
            ...prev,

            [key]: {
                ...prev[key],
                [field]: value,
            },
        }));
    };

    const updateQty = (key, qty) => {

        setCart((prev) => ({
            ...prev,

            [key]: {
                ...prev[key],
                quantity: Number(qty),
            },
        }));
    };

    const updateNotes = (key, value) => {

        setCart((prev) => ({
            ...prev,

            [key]: {
                ...prev[key],
                notes: value,
            },
        }));
    };

    // =========================
    // TOTAL
    // =========================

    const total = useMemo(() => {

        return Object.values(cart).reduce(
            (acc, item) =>
                acc + item.basePrice * item.quantity,
            0
        );

    }, [cart]);

    // =========================
    // SEND WHATSAPP
    // =========================

    const sendWhatsApp = () => {

        const items = Object.values(cart);

        // EMPTY
        if (items.length === 0) {

            showAlert({
                title: "No hay productos",
                text: "Seleccioná al menos un producto.",
                icon: "info",
            });

            return;
        }

        // VALIDATE VARIANTS
        for (const selected of items) {

            const item = catalogue
                .flatMap((c) => c.items)
                .find((i) => i.id === selected.id);

            if (item && !isComplete(item, selected)) {

                showAlert({
                    title: "Producto incompleto",
                    text: `Faltan opciones en ${selected.name}`,
                    icon: "warning",
                });

                return;
            }
        }

        // MESSAGE
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

            msg += `  Precio Unitario: $${p.basePrice}%0A`;

            msg += `  Subtotal: $${p.basePrice * p.quantity}%0A`;

            if (p.notes) {
                msg += `  Observaciones: ${p.notes}%0A`;
            }

            msg += `%0A`;
        });

        msg += `TOTAL: $${total}`;

        window.open(
            `https://wa.me/5493546562855?text=${msg}`,
            "_blank"
        );
    };

    // =========================
    // RENDER
    // =========================

    return (

        <section className="tags_store">

            <div className="container py-5">

                {/* ========================= */}
                {/* HEADER */}
                {/* ========================= */}

                <div className="text-center mb-5">

                    <span className="tags_store_badge">
                        Catálogo QR
                    </span>

                    <h1 className="tags_store_title">
                        Productos QR Inteligentes
                    </h1>

                    <p className="tags_store_subtitle">
                        Carteles físicos, stickers, NFC y
                        soluciones digitales diseñadas para
                        potenciar tu negocio.
                    </p>

                </div>

                {/* ========================= */}
                {/* CATEGORIES */}
                {/* ========================= */}

                {catalogue.map((category) => (

                    <div
                        key={category.category}
                        className="mb-5"
                    >

                        {/* CATEGORY HEADER */}

                        <div className="tags_store_category_header">

                            <h2 className="tags_store_category_title">
                                {category.category}
                            </h2>

                        </div>

                        {/* GRID */}

                        <div className="row g-4">

                            {category.items.map((item) => (

                                <div
                                    key={item.id}
                                    className="col-12 col-md-6 col-xl-4"
                                >

                                    <div className="tags_store_card">

                                        {/* IMAGE */}

                                        <div className="tags_store_image">

                                            <ImageCarousel
                                                images={item.images}
                                            />

                                        </div>

                                        {/* CONTENT */}

                                        <div className="tags_store_content">

                                            <div className="d-flex justify-content-between align-items-start gap-3 mb-2">

                                                <div>

                                                    <h3 className="tags_store_product_title">
                                                        {item.name}
                                                    </h3>

                                                    <p className="tags_store_product_desc">
                                                        {item.description}
                                                    </p>

                                                </div>

                                                <div className="tags_store_price">
                                                    ${item.basePrice}
                                                </div>

                                            </div>

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
                                                            className={`tags_store_option ${selected ? "tags_store_option_active" : ""
                                                                }`}
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
                                                                                typeLabel:
                                                                                    type.label,
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

                                                                            {item.variants.material.map((m) => (

                                                                                <option
                                                                                    key={m.code}
                                                                                    value={m.code}
                                                                                >
                                                                                    {m.label}
                                                                                </option>

                                                                            ))}

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

                                                                            {item.variants.support.map((s) => (

                                                                                <option
                                                                                    key={s.code}
                                                                                    value={s.code}
                                                                                >
                                                                                    {s.label}
                                                                                </option>

                                                                            ))}

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

                                        </div>

                                    </div>

                                </div>

                            ))}

                        </div>

                    </div>

                ))}

            </div>

            {/* ========================= */}
            {/* FLOAT CART */}
            {/* ========================= */}

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
                    🛒 Pedir por WhatsApp
                </button>

            </div>

        </section>
    );
}