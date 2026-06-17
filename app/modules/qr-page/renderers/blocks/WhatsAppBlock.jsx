import { FaWhatsapp }
    from "react-icons/fa";

import getTypographyStyle
    from "../../lib/getTypographyStyle";

import {
    normalizeArgentinaWhatsapp
}
    from "../../lib/normalizeContactFields";

export default function WhatsAppBlock({
    content = {},
    page = {},
    styles = {}
}) {

    const phone =
        normalizeArgentinaWhatsapp(
            content.phone ||
            page?.whatsapp ||
            page?.phone ||
            ""
        );

    if (!phone) {
        return null;
    }

    const message =
        encodeURIComponent(
            content.message ||
            "Hola, quiero hacer una consulta."
        );

    return (
        <a
            className="qr_public_button qr_public_whatsapp"
            href={`https://wa.me/${phone}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            style={
                getTypographyStyle(
                    styles,
                    "button"
                )
            }
        >
            <FaWhatsapp />

            <span>
                {
                    content.label ||
                    "Contactar por WhatsApp"
                }
            </span>

        </a>
    );
}