// =====================================
// Archivo:
// /app/modules/commerce-reviews/components/public/CommerceReviewStep.jsx
//
// Descripción:
// Formulario público para calificar
// un único ítem adquirido.
//
// Contexto:
// commerce-reviews
// =====================================

"use client";

import RatingSelector
    from "./RatingSelector";

export default function CommerceReviewStep({
    item,
    value,
    onChange,
    disabled = false
}) {

    function updateField(
        field,
        fieldValue
    ) {

        onChange({
            ...value,
            [field]:
                fieldValue
        });

    }

    return (
        <article className="commerce_reviews_step">

            <div className="commerce_reviews_product">

                {
                    item?.image_url ? (
                        <img
                            src={item.image_url}
                            alt={item.title || ""}
                            className="commerce_reviews_product_image"
                        />
                    ) : (
                        <div className="commerce_reviews_product_placeholder">
                            Sin imagen
                        </div>
                    )
                }

                <div className="commerce_reviews_product_info">

                    <h2>
                        {item?.title}
                    </h2>

                    {
                        item?.variant_title && (
                            <p>
                                {item.variant_title}
                            </p>
                        )
                    }

                    {
                        Number(item?.quantity || 1) > 1 && (
                            <small>
                                Cantidad: {item.quantity}
                            </small>
                        )
                    }

                </div>

            </div>

            <div className="commerce_reviews_rating_section">

                <label>
                    ¿Cómo calificarías este producto?
                </label>

                <RatingSelector
                    value={value.rating}
                    onChange={(rating) =>
                        updateField(
                            "rating",
                            rating
                        )
                    }
                    disabled={disabled}
                />

                {
                    Number(value.rating) > 0 && (
                        <span className="commerce_reviews_rating_text">
                            {
                                Number(value.rating) === 1
                                    ? "Muy malo"
                                    : Number(value.rating) === 2
                                        ? "Malo"
                                        : Number(value.rating) === 3
                                            ? "Bueno"
                                            : Number(value.rating) === 4
                                                ? "Muy bueno"
                                                : "Excelente"
                            }
                        </span>
                    )
                }

            </div>

            <div className="commerce_reviews_field">

                <label htmlFor={`review-title-${item.product_id}`}>
                    Título
                    <small>Opcional</small>
                </label>

                <input
                    id={`review-title-${item.product_id}`}
                    type="text"
                    value={value.title}
                    onChange={(event) =>
                        updateField(
                            "title",
                            event.target.value
                        )
                    }
                    disabled={disabled}
                    maxLength={255}
                    placeholder="Ej: Excelente calidad"
                />

            </div>

            <div className="commerce_reviews_field">

                <label htmlFor={`review-comment-${item.product_id}`}>
                    Comentario
                    <small>Opcional</small>
                </label>

                <textarea
                    id={`review-comment-${item.product_id}`}
                    value={value.comment}
                    onChange={(event) =>
                        updateField(
                            "comment",
                            event.target.value
                        )
                    }
                    disabled={disabled}
                    rows={5}
                    placeholder="Contanos qué te pareció..."
                />

            </div>

            <div className="commerce_reviews_verified">
                <span>✓</span>
                Compra verificada
            </div>

        </article>
    );

}