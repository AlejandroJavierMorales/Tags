// =====================================
// Archivo:
// /app/modules/commerce-reviews/components/public/RatingSelector.jsx
//
// Descripción:
// Selector reutilizable de calificación
// de una a cinco estrellas.
//
// Contexto:
// commerce-reviews
// =====================================

"use client";

export default function RatingSelector({
    value = 0,
    onChange,
    disabled = false
}) {

    return (
        <div
            className="commerce_reviews_rating"
            role="radiogroup"
            aria-label="Calificación"
        >
            {
                [1, 2, 3, 4, 5].map(
                    rating => {

                        const active =
                            Number(value) >= rating;

                        return (
                            <button
                                key={rating}
                                type="button"
                                className={[
                                    "commerce_reviews_star",
                                    active
                                        ? "active"
                                        : ""
                                ].filter(Boolean).join(" ")}
                                onClick={() =>
                                    onChange?.(rating)
                                }
                                disabled={disabled}
                                role="radio"
                                aria-checked={
                                    Number(value) === rating
                                }
                                aria-label={
                                    `${rating} ${
                                        rating === 1
                                            ? "estrella"
                                            : "estrellas"
                                    }`
                                }
                            >
                                ★
                            </button>
                        );

                    }
                )
            }
        </div>
    );

}