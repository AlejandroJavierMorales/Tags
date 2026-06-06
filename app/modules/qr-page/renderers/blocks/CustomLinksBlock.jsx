import {
    FaLink,
    FaYoutube,
    FaTiktok,
    FaXTwitter,
    FaTelegram
}
from "react-icons/fa6";

import getTypographyStyle from "../../lib/getTypographyStyle";

function getIcon(icon) {

    if (icon === "youtube") {
        return <FaYoutube />;
    }

    if (icon === "tiktok") {
        return <FaTiktok />;
    }

    if (icon === "x") {
        return <FaXTwitter />;
    }

    if (icon === "telegram") {
        return <FaTelegram />;
    }

    return <FaLink />;
}

export default function CustomLinksBlock({
    content,
    styles = {}
}) {

    const titleStyle =
        getTypographyStyle(
            styles,
            "title"
        );

    const buttonStyle =
        getTypographyStyle(
            styles,
            "button"
        );

    const items =
        Array.isArray(content.items)
            ? content.items
            : [];

    if (!items.length) {
        return null;
    }

    return (
        <div className="qr_public_custom_links">

            {
                content.title && (
                    <h3 style={titleStyle}>
                        {content.title}
                    </h3>
                )
            }

            <div className="qr_public_custom_links_grid">

                {
                    items.map((item, index) => {

                        const hasUrl =
                            !!item.url;

                        if (hasUrl) {

                            return (
                                <a
                                    key={index}
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="qr_public_custom_link"
                                    style={buttonStyle}
                                >
                                    {getIcon(item.icon)}

                                    <span>
                                        {item.label}
                                    </span>

                                </a>
                            );
                        }

                        return (
                            <button
                                key={index}
                                type="button"
                                className="qr_public_custom_link disabled"
                                disabled
                                title="Pendiente de configurar"
                                style={buttonStyle}
                            >
                                {getIcon(item.icon)}

                                <span>
                                    {item.label}
                                </span>

                            </button>
                        );
                    })
                }

            </div>

        </div>
    );
}