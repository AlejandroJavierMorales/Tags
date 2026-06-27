// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreHelpBarBlock.jsx
//
// Descripción:
// Bloque de ayuda y contacto de Tags Store.
//
// Contexto:
// store
// =====================================

export default function StoreHelpBarBlock({
    entity,
    content = {}
}) {
    const whatsapp =
        entity?.whatsapp;

    const title =
        content.title ||
        "¿Necesitás ayuda para comprar?";

    const text =
        content.text ||
        "Escribinos y te asesoramos antes de hacer tu pedido.";

    if (!whatsapp) {
        return null;
    }

    return (
        <section className="py-5 bg-light">
            <div className="container">
                <div className="rounded-4 bg-white border p-4 p-md-5 text-center">
                    <h2 className="h3 fw-bold mb-2">
                        {title}
                    </h2>

                    <p className="text-muted mb-4">
                        {text}
                    </p>

                    <a
                        href={`https://wa.me/54${whatsapp}`}
                        target="_blank"
                        className="btn btn-success rounded-pill px-4"
                    >
                        Hablar por WhatsApp
                    </a>
                </div>
            </div>
        </section>
    );
}