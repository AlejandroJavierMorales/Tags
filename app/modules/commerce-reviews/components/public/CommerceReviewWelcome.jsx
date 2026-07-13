// =====================================
// Archivo:
// /app/modules/commerce-reviews/components/public/CommerceReviewWelcome.jsx
//
// Descripción:
// Pantalla inicial del flujo público
// de Commerce Reviews.
//
// Contexto:
// commerce-reviews
// =====================================

export default function CommerceReviewWelcome({
    store,
    order,
    items = [],
    onStart
}) {

    const pendingItems =
        items.filter(item =>
            !item.review
        );

    const totalItems =
        items.length;

    const pendingCount =
        pendingItems.length;

    return (
        <section className="commerce_reviews_welcome">

            {
                store?.logo_url && (
                    <img
                        src={store.logo_url}
                        alt={store.name || ""}
                        className="commerce_reviews_store_logo"
                    />
                )
            }

            <p className="commerce_reviews_store_name">
                {store?.name}
            </p>

            <h1 className="commerce_reviews_title">
                ¿Cómo fue tu compra?
            </h1>

            <p className="commerce_reviews_description">
                Gracias por confiar en nosotros.
                Tu opinión nos ayuda a mejorar
                y también puede ayudar a otros clientes.
            </p>

            <div className="commerce_reviews_order">
                <span>Pedido</span>

                <strong>
                    {order?.order_number}
                </strong>
            </div>

            <p className="commerce_reviews_items_count">
                {
                    pendingCount === 0
                        ? "Ya calificaste todos los productos de este pedido."
                        : pendingCount === 1
                            ? "Tenés 1 producto para calificar."
                            : `Tenés ${pendingCount} productos para calificar.`
                }
            </p>

            {
                totalItems > 0 &&
                pendingCount === 0 && (
                    <p className="commerce_reviews_completed_note">
                        Podés revisar o actualizar tus opiniones.
                    </p>
                )
            }

            {
                totalItems > 0 && (
                    <button
                        type="button"
                        className="commerce_reviews_primary_btn"
                        onClick={onStart}
                    >
                        {
                            pendingCount === 0
                                ? "Ver mis opiniones"
                                : "Comenzar"
                        }
                    </button>
                )
            }

        </section>
    );

}