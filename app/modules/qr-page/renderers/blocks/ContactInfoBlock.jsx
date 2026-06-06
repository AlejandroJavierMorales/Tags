import {
    FaWhatsapp,
    FaPhone,
    FaEnvelope,
    FaLocationDot
}
from "react-icons/fa6";

import getTypographyStyle from "../../lib/getTypographyStyle";

export default function ContactInfoBlock({
    content,
    page,
    styles = {}
}) {

    const textStyle =
        getTypographyStyle(
            styles,
            "text"
        );

    return (
        <div className="qr_public_contact_info">

            {
                content.showWhatsapp !== false
                &&
                page.whatsapp
                &&
                (
                    <a
                        href={`https://wa.me/${page.whatsapp}`}
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
                content.showPhone !== false
                &&
                page.phone
                &&
                (
                    <div
                        className="qr_public_contact_item"
                        style={textStyle}
                    >
                        <FaPhone />

                        <span>
                            {page.phone}
                        </span>

                    </div>
                )
            }

            {
                content.showEmail !== false
                &&
                page.email
                &&
                (
                    <div
                        className="qr_public_contact_item"
                        style={textStyle}
                    >
                        <FaEnvelope />

                        <span>
                            {page.email}
                        </span>

                    </div>
                )
            }

            {
                content.showAddress !== false
                &&
                page.address
                &&
                (
                    <div
                        className="qr_public_contact_item"
                        style={textStyle}
                    >
                        <FaLocationDot />

                        <span>
                            {page.address}
                        </span>

                    </div>
                )
            }

        </div>
    );
}