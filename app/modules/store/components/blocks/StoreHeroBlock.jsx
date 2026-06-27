// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreHeroBlock.jsx
//
// Descripción:
// Hero principal público de Tags Store.
// Usa cover_url como imagen de fondo.
//
// Contexto:
// store
// =====================================

import Image
    from "next/image";

export default function StoreHeroBlock({
    entity,
    content = {}
}) {
    const title =
        content.title ||
        entity?.name ||
        "Tienda Online";

    const subtitle =
        content.subtitle ||
        entity?.description ||
        "Conocé nuestros productos y comprá de forma simple.";

    const cover =
        content.imageUrl ||
        entity?.cover_url;

    const whatsapp =
        entity?.whatsapp;

    return (
        <section className={`store_hero_block position-relative overflow-hidden ${cover ? "store_hero_with_cover" : "bg-light border-bottom"}`}>

            {
                cover && (
                    <Image
                        src={cover}
                        alt={title}
                        fill
                        priority
                        sizes="100vw"
                        className="store_hero_bg"
                    />
                )
            }

            {
                cover && (
                    <div className="store_hero_overlay" />
                )
            }

            <div className="container position-relative">
                <div className="row">
                    <div className="col-12 col-lg-7 col-xl-6">

                        <div className="store_hero_content">

                            <span className={`badge rounded-pill mb-3 ${cover ? "text-bg-light" : "text-bg-success"}`}>
                                Tienda Online
                            </span>

                            <h1 className={`display-5 fw-bold mb-3 ${cover ? "text-white" : ""}`}>
                                {title}
                            </h1>

                            <p className={`lead mb-4 ${cover ? "text-white-75" : "text-muted"}`}>
                                {subtitle}
                            </p>

                            <div className="d-flex flex-wrap gap-2">
                                <a
                                    href="#store-products"
                                    className="btn btn-success rounded-pill px-4"
                                >
                                    Ver productos
                                </a>

                                {
                                    whatsapp && (
                                        <a
                                            href={`https://wa.me/54${whatsapp}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`btn rounded-pill px-4 ${cover ? "btn-light" : "btn-outline-dark"}`}
                                        >
                                            Consultar
                                        </a>
                                    )
                                }
                            </div>

                        </div>

                    </div>
                </div>
            </div>

        </section>
    );
}