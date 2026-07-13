// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreFooterBlock.jsx
//
// Descripción:
// Footer público de Tags Store.
// Sin Bootstrap y compatible con themes --qr-*.
//
// Contexto:
// store
// =====================================

import Image
    from "next/image";

import {
    FaWhatsapp,
    FaEnvelope,
    FaMapMarkerAlt,
    FaBoxOpen
}
from "react-icons/fa";

export default function StoreFooterBlock({
    entity
}) {

    const whatsapp =
        entity?.whatsapp;

    const cleanWhatsapp =
        String(
            whatsapp || ""
        ).replace(/\D/g, "");

    return (

        <footer className="store_footer">

            <div className="store_footer_inner">

                <div className="store_footer_brand">

                    {

                        entity?.logo_url && (

                            <Image
                                src={entity.logo_url}
                                alt={
                                    entity?.name ||
                                    "Tienda"
                                }
                                width={180}
                                height={60}
                                className="store_footer_logo"
                            />

                        )

                    }

                    <div>

                        <h3 className="store_footer_title">

                            {
                                entity?.name ||
                                "Mi Tienda"
                            }

                        </h3>

                        {

                            entity?.description && (

                                <p className="store_footer_description">

                                    {entity.description}

                                </p>

                            )

                        }

                    </div>

                </div>

                <div className="store_footer_column">

                    <h4>

                        Contacto

                    </h4>

                    {

                        whatsapp && (

                            <a
                                href={`https://wa.me/54${cleanWhatsapp}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >

                                <FaWhatsapp />

                                <span>

                                    {whatsapp}

                                </span>

                            </a>

                        )

                    }

                    {

                        entity?.email && (

                            <a
                                href={`mailto:${entity.email}`}
                            >

                                <FaEnvelope />

                                <span>

                                    {entity.email}

                                </span>

                            </a>

                        )

                    }

                    {

                        entity?.address && (

                            <div>

                                <FaMapMarkerAlt />

                                <span>

                                    {entity.address}

                                </span>

                            </div>

                        )

                    }

                </div>

                <div className="store_footer_column">

                    <h4>

                        Tienda

                    </h4>

                    <a
                        href="#store-products"
                    >

                        <FaBoxOpen />

                        <span>

                            Productos

                        </span>

                    </a>

                    <a
                        href="#top"
                    >

                        Inicio

                    </a>

                </div>

            </div>

            <div className="store_footer_bottom">

                <span>

                    © {new Date().getFullYear()}{" "}

                    {entity?.name || "Mi Tienda"}

                </span>

                <a
                    href="https://www.tags.com.ar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="store_footer_tags"
                >

                    <span>

                        Tienda creada con

                    </span>

                    <Image
                        src="/logo_tags_qr.webp"
                        alt="Tags"
                        width={110}
                        height={34}
                        className="store_footer_tags_logo"
                    />

                </a>

            </div>

        </footer>

    );

}