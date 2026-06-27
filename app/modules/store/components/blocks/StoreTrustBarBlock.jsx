// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreTrustBarBlock.jsx
//
// Descripción:
// Barra de beneficios comerciales de Tags Store.
//
// Contexto:
// store
// =====================================

export default function StoreTrustBarBlock({
    content = {}
}) {
    const items =
        content.items?.length
            ? content.items
            : [
                {
                    title: "Compra segura",
                    text: "Tus pedidos quedan registrados."
                },
                {
                    title: "Atención directa",
                    text: "Consultá antes de comprar."
                },
                {
                    title: "Envíos y retiro",
                    text: "Coordinamos la entrega."
                }
            ];

    return (
        <section className="py-4 bg-white">
            <div className="container">
                <div className="row g-3">
                    {
                        items.map(
                            (item, index) => (
                                <div
                                    className="col-12 col-sm-6 col-md-4"
                                    key={index}
                                >
                                    <div className="h-100 p-4 rounded-4 border bg-light">
                                        <div className="fw-bold mb-1">
                                            ✓ {item.title}
                                        </div>

                                        <div className="small text-muted">
                                            {item.text}
                                        </div>
                                    </div>
                                </div>
                            )
                        )
                    }
                </div>
            </div>
        </section>
    );
}