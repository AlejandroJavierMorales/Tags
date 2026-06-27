// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreFooterBlock.jsx
//
// Descripción:
// Footer público de Tags Store.
//
// Contexto:
// store
// =====================================

import Image from "next/image";

export default function StoreFooterBlock({
    entity
}) {
    const whatsapp =
        entity?.whatsapp;

    return (
        <footer className="bg-dark text-white pt-5 pb-4 mt-5">
            <div className="container">

                <div className="row g-4 align-items-start text-center text-sm-start">

                    <div className="col-12 col-lg-6">
                        <div
                            className="
                                    d-flex
                                    flex-column
                                    flex-lg-row
                                    align-items-center
                                    align-items-lg-center
                                    gap-3
                                    mb-3
                                "
                        >
                            {
                                entity?.logo_url && (
                                    <Image
                                        src={entity.logo_url}
                                        alt={entity?.name || "Tienda"}
                                        width={180}
                                        height={60}
                                        className="
                                            tags_business_logo
                                            store_footer_logo
                                        "
                                    />
                                )
                            }

                            <div className="d-flex flex-column justify-content-center align-items-center">
                                <h3 className="h5 fw-bold mb-1">
                                    {entity?.name || "Mi Tienda"}
                                </h3>

                                {
                                    entity?.description && (
                                        <p className="text-white-50 mb-0">
                                            {entity.description}
                                        </p>
                                    )
                                }
                            </div>
                        </div>
                    </div>

                    <div className="col-6 col-lg-3">
                        <h4 className="h6 fw-bold mb-3">
                            Contacto
                        </h4>

                        <div className="d-flex flex-column gap-2 small text-white-50">
                            {
                                whatsapp && (
                                    <a
                                        href={`https://wa.me/54${whatsapp}`}
                                        target="_blank"
                                        className="text-white-50 text-decoration-none"
                                    >
                                        WhatsApp: {whatsapp}
                                    </a>
                                )
                            }

                            {
                                entity?.email && (
                                    <a
                                        href={`mailto:${entity.email}`}
                                        className="text-white-50 text-decoration-none"
                                    >
                                        {entity.email}
                                    </a>
                                )
                            }

                            {
                                entity?.address && (
                                    <span>
                                        {entity.address}
                                    </span>
                                )
                            }
                        </div>
                    </div>

                    <div className="col-6 col-lg-3">
                        <h4 className="h6 fw-bold mb-3">
                            Tienda
                        </h4>

                        <div className="d-flex flex-column gap-2 small">
                            <a
                                href="#store-products"
                                className="text-white-50 text-decoration-none"
                            >
                                Productos
                            </a>

                            <a
                                href="#"
                                className="text-white-50 text-decoration-none"
                            >
                                Inicio
                            </a>
                        </div>
                    </div>

                </div>

                <hr className="border-secondary my-4" />

                <div className="small text-white-50 d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                    <span>
                        © {new Date().getFullYear()} {entity?.name || "Tienda"}
                    </span>
                    <div>
                        <span>
                            {`Tienda online creada con Tags `}
                        </span>
                        <a
                            href="https://www.tags.com.ar"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="store_footer_tags_link"
                        >
                            <Image
                                src="/logo_tags_qr.webp"
                                alt="Tags"
                                width={120}
                                height={40}
                                className="store_footer_tags_logo"
                            />
                        </a>
                    </div>


                </div>

            </div>
        </footer>
    );
}