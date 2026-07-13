// =====================================
// Archivo:
// /app/modules/commerce-reviews/components/public/CommerceReviewThanks.jsx
//
// Descripción:
// Pantalla final del flujo público
// de Commerce Reviews.
// Puede invitar a Google cuando el promedio
// de productos alcanza el umbral configurado.
//
// Contexto:
// commerce-reviews
// =====================================

import Link
    from "next/link";

export default function CommerceReviewThanks({
    store,
    items = [],
    tagsReviewsConfig = null
}) {

    const ratings =
        items
            .map(item =>
                Number(
                    item?.review?.rating || 0
                )
            )
            .filter(rating =>
                rating >= 1 &&
                rating <= 5
            );

    const averageRating =
        ratings.length
            ? ratings.reduce(
                (
                    total,
                    rating
                ) =>
                    total + rating,
                0
            ) /
            ratings.length
            : 0;

    const form =
        tagsReviewsConfig?.form ||
        null;

    const positiveThreshold =
        Number(
            form?.positive_threshold || 4
        );

    const googleReviewUrl =
        form?.google_review_url ||
        null;

    const showGoogleCTA =
        Boolean(
            googleReviewUrl &&
            averageRating >= positiveThreshold
        );

    function handleGoogleClick() {

        if (!googleReviewUrl) {
            return;
        }

        window.open(
            googleReviewUrl,
            "_blank",
            "noopener,noreferrer"
        );

    }

    return (
        <section className="commerce_reviews_thanks">

            <div className="commerce_reviews_thanks_icon">
                ✓
            </div>

            <h1>
                Muchas gracias
            </h1>

            <p>
                Tus opiniones fueron recibidas correctamente.
                Nos ayudan a mejorar y también pueden ayudar
                a otros clientes.
            </p>

            {
                showGoogleCTA && (
                    <div className="commerce_reviews_google_cta">

                        <h2>
                            {
                                form?.google_cta_title ||
                                "¿Nos ayudás compartiendo tu experiencia en Google?"
                            }
                        </h2>

                        <p>
                            {
                                form?.google_cta_text ||
                                "Tu reseña pública ayuda a que más personas nos conozcan."
                            }
                        </p>

                        <button
                            type="button"
                            className="commerce_reviews_primary_btn"
                            onClick={
                                handleGoogleClick
                            }
                        >
                            {
                                form?.google_cta_button_label ||
                                "Dejar reseña en Google"
                            }
                        </button>

                    </div>
                )
            }

            {
                store?.slug && (
                    <Link
                        href={
                            `/p/${store.slug}`
                        }
                        className="commerce_reviews_secondary_btn"
                    >
                        Volver a {
                            store.name ||
                            "la tienda"
                        }
                    </Link>
                )
            }

        </section>
    );

}