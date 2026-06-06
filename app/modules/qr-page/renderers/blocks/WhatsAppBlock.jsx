import { FaWhatsapp }
    from "react-icons/fa";

import getTypographyStyle from "../../lib/getTypographyStyle";

function cleanPhone(phone = "") {

    return phone
        .toString()
        .replace(/\D/g, "");
}

export default function WhatsAppBlock({
    content,
    page,
    styles = {}
}) {

    const phone =
        cleanPhone(
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