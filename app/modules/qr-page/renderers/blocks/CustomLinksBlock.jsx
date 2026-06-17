import {
    FaLink,
    FaYoutube,
    FaTiktok,
    FaXTwitter,
    FaTelegram
}
    from "react-icons/fa6";

import getTypographyStyle from "../../lib/getTypographyStyle";

import {
    buildSocialUrl,
    normalizeWebsite
}
    from "../../lib/normalizeContactFields";

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

function normalizeCustomUrl(item) {
    const value =
        String(item.url || "").trim();

    if (!value) {
        return "";
    }

    if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("mailto:") ||
        value.startsWith("tel:")
    ) {
        return value;
    }

    if (item.icon === "youtube") {
        return buildSocialUrl(
            "youtube",
            value
        );
    }

    if (item.icon === "tiktok") {
        return buildSocialUrl(
            "tiktok",
            value
        );
    }

    if (item.icon === "telegram") {
        return `https://t.me/${value.replace(/^@/, "")}`;
    }

    if (item.icon === "x") {
        return `https://x.com/${value.replace(/^@/, "")}`;
    }

    return normalizeWebsite(value);
}

export default function CustomLinksBlock({
    content = {},
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
        Array.isArray(content?.items)
            ? content?.items
            : [];

    if (!items.length) {
        return null;
    }

    return (
        <div className="qr_public_custom_links">

            {
                content?.title && (
                    <h3 style={titleStyle}>
                        {content?.title}
                    </h3>
                )
            }

            <div className="qr_public_custom_links_grid">

                {
                    items.map((item, index) => {

                        const href =
                            normalizeCustomUrl(item);

                        if (href) {
                            return (
                                <a
                                    key={index}
                                    href={href}
                                    target={
                                        href.startsWith("http")
                                            ? "_blank"
                                            : undefined
                                    }
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