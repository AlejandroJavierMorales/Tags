import {
    FaWhatsapp,
    FaPhone,
    FaEnvelope,
    FaLocationDot
}
    from "react-icons/fa6";

import getTypographyStyle from "../../lib/getTypographyStyle";

import {
    normalizeArgentinaWhatsapp
}
    from "../../lib/normalizeContactFields";

export default function ContactInfoBlock({
    content = {},
    page = {},
    styles = {}
}) {

    const textStyle =
        getTypographyStyle(
            styles,
            "text"
        );

    const whatsappNumber =
        normalizeArgentinaWhatsapp(
            page.whatsapp
        );

    return (
        <div className="qr_public_contact_info">

            {
                content?.showWhatsapp !== false
                &&
                whatsappNumber
                &&
                (
                    <a
                        href={`https://wa.me/${whatsappNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="qr_public_contact_item"
                        style={textStyle}
                    >
                        <FaWhatsapp />

                        <span>
                            WhatsApp
                        </span>
                    </a>
                )
            }

            {
                content?.showPhone !== false
                &&
                page.phone
                &&
                (
                    <a
                        href={`tel:${page.phone}`}
                        className="qr_public_contact_item"
                        style={textStyle}
                    >
                        <FaPhone />

                        <span>
                            {page.phone}
                        </span>
                    </a>
                )
            }

            {
                content?.showEmail !== false
                &&
                page.email
                &&
                (
                    <a
                        href={`mailto:${page.email}`}
                        className="qr_public_contact_item"
                        style={textStyle}
                    >
                        <FaEnvelope />

                        <span>
                            {page.email}
                        </span>
                    </a>
                )
            }

            {
                content?.showAddress !== false
                &&
                page.address
                &&
                (
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(page.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="qr_public_contact_item"
                        style={textStyle}
                    >
                        <FaLocationDot />

                        <span>
                            {page.address}
                        </span>
                    </a>
                )
            }

        </div>
    );
}