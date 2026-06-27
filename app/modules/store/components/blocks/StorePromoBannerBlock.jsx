// =====================================
// Archivo:
// /app/modules/store/components/blocks/StorePromoBannerBlock.jsx
//
// Descripción:
// Banner promocional público de Tags Store.
//
// Contexto:
// store
// =====================================

export default function StorePromoBannerBlock({
    entity,
    content = {}
}) {
    const title =
        content.title ||
        "Promociones especiales";

    const subtitle =
        content.subtitle ||
        "Consultá ofertas, combos y beneficios disponibles.";

    const whatsapp =
        entity?.whatsapp;

    return (
        <section className="py-4 bg-white">
            <div className="container">
                <div className="rounded-4 bg-dark text-white p-4 p-md-5 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                    <div>
                        <span className="badge rounded-pill text-bg-success mb-3">
                            Oferta
                        </span>

                        <h2 className="h3 fw-bold mb-2">
                            {title}
                        </h2>

                        <p className="text-white-50 mb-0">
                            {subtitle}
                        </p>
                    </div>

                    {
                        whatsapp && (
                            <a
                                href={`https://wa.me/54${whatsapp}`}
                                target="_blank"
                                className="btn btn-success rounded-pill px-4 flex-shrink-0"
                            >
                                Consultar
                            </a>
                        )
                    }
                </div>
            </div>
        </section>
    );
}