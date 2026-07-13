// =====================================
// Archivo:
// /app/modules/store/components/public/StoreReviewsCTA.jsx
//
// Descripción:
// CTA público para reseñas verificadas
// desde Tags Tienda hacia Tags Reviews.
//
// Contexto:
// store
// =====================================

"use client";

import {
    useState
}
from "react";

import showAlert
    from "@/app/components/showAlert";

export default function StoreReviewsCTA({
    store
}) {
    const [open, setOpen] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [form, setForm] =
        useState({
            orderNumber: "",
            contact: ""
        });

    if (!store?.has_reviews) {
        return null;
    }

    function updateField(field, value) {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    }

    async function handleValidate(e) {
        e.preventDefault();

        try {
            setLoading(true);

            const res =
                await fetch(
                    "/api/store/public/reviews/validate",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            storeId: store.id,
                            orderNumber: form.orderNumber,
                            contact: form.contact
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No pudimos verificar la compra."
                );
            }

            showAlert({
                title: "Compra verificada",
                text: "Te llevamos a calificar tu experiencia.",
                icon: "success",
                timer: 1200
            });

            setTimeout(() => {
                window.location.href =
                    data.reviewUrl;
            }, 900);

        } catch (err) {
            showAlert({
                title: "No pudimos verificar la compra",
                text: err.message,
                icon: "warning"
            });

        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <section className="store_reviews_cta">
                <div className="container">
                    <div className="store_reviews_cta_card">

                        <div className="store_reviews_cta_stars">
                            ★★★★★
                        </div>

                        <h2>
                            ¿Cómo fue tu experiencia?
                        </h2>

                        <p>
                            Si ya compraste en esta tienda, tu opinión ayuda a otros clientes
                            y nos permite seguir mejorando.
                        </p>

                        <button
                            type="button"
                            className="store_btn_primary store_reviews_cta_btn"
                            onClick={() => setOpen(true)}
                        >
                            Calificar mi compra
                        </button>

                    </div>
                </div>
            </section>

            {open && (
                <div className="store_review_modal_overlay">
                    <div className="store_review_modal">

                        <button
                            type="button"
                            className="store_review_modal_close"
                            onClick={() => setOpen(false)}
                        >
                            ×
                        </button>

                        <div className="store_reviews_cta_stars">
                            ★★★★★
                        </div>

                        <h3>
                            Verificá tu compra
                        </h3>

                        <p>
                            Ingresá el número de pedido y el email o teléfono usado en la compra.
                        </p>

                        <form onSubmit={handleValidate}>

                            <label>
                                Número de pedido
                            </label>

                            <input
                                value={form.orderNumber}
                                className="store_review_modal_input"
                                onChange={(e) =>
                                    updateField(
                                        "orderNumber",
                                        e.target.value
                                    )
                                }
                                placeholder="Ej: ST1-12345678"
                                required
                            />

                            <label>
                                Email o teléfono
                            </label>

                            <input
                                value={form.contact}
                                className="store_review_modal_input"
                                onChange={(e) =>
                                    updateField(
                                        "contact",
                                        e.target.value
                                    )
                                }
                                placeholder="Email o teléfono"
                                required
                            />

                            <button
                                type="submit"
                                className="store_btn_primary store_reviews_cta_btn"
                                disabled={loading}
                            >
                                {
                                    loading
                                        ? "Verificando..."
                                        : "Continuar"
                                }
                            </button>

                        </form>

                    </div>
                </div>
            )}
        </>
    );
}