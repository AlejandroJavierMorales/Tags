// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreTopbarBlock.jsx
//
// Descripción:
// Barra superior pública de Tags Store.
//
// Contexto:
// store
// =====================================

export default function StoreTopbarBlock({
    entity,
    content = {}
}) {
    const text =
        content.text ||
        "Comprá online fácil, rápido y seguro";

    const whatsapp =
        entity?.whatsapp;

    return (
        <div className="bg-dark text-white small">
            <div className="container py-2 d-flex justify-content-between align-items-center gap-3">
                <span className="text-truncate">
                    {text}
                </span>

                {
                    whatsapp && (
                        <a
                            href={`https://wa.me/54${whatsapp}`}
                            target="_blank"
                            className="text-white text-decoration-none fw-semibold"
                        >
                            WhatsApp
                        </a>
                    )
                }
            </div>
        </div>
    );
}