"use client";

import { FaAddressCard }
    from "react-icons/fa6";

import getTypographyStyle from "../../lib/getTypographyStyle";

export default function VCardBlock({
    content,
    page,
    styles = {}
}) {

    const href =
        page?.slug
            ? `/api/qr-page/vcard/${page.slug}`
            : null;

    if (!href) {
        return null;
    }

    return (
        <>
            <a
                href={href}
                className="qr_public_vcard_button"
                style={
                    getTypographyStyle(
                        styles,
                        "button"
                    )
                }
            >
                <FaAddressCard />

                <span>
                    {
                        content.buttonLabel ||
                        "Guardar contacto"
                    }
                </span>

            </a>
            {/* <p className="qr_public_vcard_help">
                Si se descarga un archivo, abrilo para importar el contacto.
            </p> */}
        </>
    );
}