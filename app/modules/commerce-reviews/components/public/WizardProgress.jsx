// =====================================
// Archivo:
// /app/modules/commerce-reviews/components/public/WizardProgress.jsx
//
// Descripción:
// Indicador de avance del wizard
// público de Commerce Reviews.
//
// Contexto:
// commerce-reviews
// =====================================

export default function WizardProgress({
    current,
    total
}) {

    const safeTotal =
        Math.max(
            Number(total) || 1,
            1
        );

    const safeCurrent =
        Math.min(
            Math.max(
                Number(current) || 1,
                1
            ),
            safeTotal
        );

    const percentage =
        Math.round(
            (
                safeCurrent /
                safeTotal
            ) * 100
        );

    return (
        <div className="commerce_reviews_progress">

            <div className="commerce_reviews_progress_head">
                <span>
                    Producto {safeCurrent} de {safeTotal}
                </span>

                <strong>
                    {percentage}%
                </strong>
            </div>

            <div className="commerce_reviews_progress_track">
                <div
                    className="commerce_reviews_progress_value"
                    style={{
                        width:
                            `${percentage}%`
                    }}
                />
            </div>

        </div>
    );

}