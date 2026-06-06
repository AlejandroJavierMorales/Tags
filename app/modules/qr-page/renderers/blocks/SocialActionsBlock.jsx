import {
    FaWhatsapp,
    FaPhone,
    FaEnvelope,
    FaGlobe,
    FaInstagram,
    FaLinkedin
}
from "react-icons/fa6";

import getTypographyStyle from "../../lib/getTypographyStyle";

export default function SocialActionsBlock({
    content,
    page,
    styles = {}
}) {

    const forceDemo =
        content.forceDemo === true;

    const buttonStyle =
        getTypographyStyle(
            styles,
            "button"
        );

    function renderAction({
        show,
        value,
        href,
        icon,
        label
    }) {

        if (show === false) {
            return null;
        }

        if (value) {
            return (
                <a
                    href={href}
                    target={
                        href?.startsWith("http")
                            ? "_blank"
                            : undefined
                    }
                    rel="noreferrer"
                    style={buttonStyle}
                >
                    {icon}
                    <span>{label}</span>
                </a>
            );
        }

        if (!forceDemo) {
            return null;
        }

        return (
            <button
                type="button"
                className="qr_public_social_action_disabled"
                disabled
                title="Pendiente de configurar"
                style={buttonStyle}
            >
                {icon}
                <span>{label}</span>
            </button>
        );
    }

    return (
        <div className="qr_public_social_actions ">

            {renderAction({
                show: content.showWhatsapp,
                value: page.whatsapp,
                href: `https://wa.me/${page.whatsapp}`,
                icon: <FaWhatsapp />,
                label: "WhatsApp"
            })}

            {renderAction({
                show: content.showPhone,
                value: page.phone,
                href: `tel:${page.phone}`,
                icon: <FaPhone />,
                label: "Llamar"
            })}

            {renderAction({
                show: content.showEmail,
                value: page.email,
                href: `mailto:${page.email}`,
                icon: <FaEnvelope />,
                label: "Email"
            })}

            {renderAction({
                show: content.showWebsite,
                value: page.website_url,
                href: page.website_url,
                icon: <FaGlobe />,
                label: "Web"
            })}

            {renderAction({
                show: content.showLinkedin,
                value: page.linkedin_url,
                href: page.linkedin_url,
                icon: <FaLinkedin />,
                label: "LinkedIn"
            })}

            {renderAction({
                show: content.showInstagram,
                value: page.instagram_url,
                href: page.instagram_url,
                icon: <FaInstagram />,
                label: "Instagram"
            })}

        </div>
    );
}