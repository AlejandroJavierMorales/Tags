import getTypographyStyle from "../../lib/getTypographyStyle";

import {
    normalizeWebsite
}
from "../../lib/normalizeContactFields";

function normalizeHref(value) {
    const url =
        String(value || "").trim();

    if (!url) {
        return "";
    }

    if (
        url.startsWith("#") ||
        url.startsWith("mailto:") ||
        url.startsWith("tel:") ||
        url.startsWith("https://") ||
        url.startsWith("http://")
    ) {
        return url;
    }

    return normalizeWebsite(url);
}

export default function CTABlock({
    content = {},
    styles = {}
}) {

    const titleStyle =
        getTypographyStyle(
            styles,
            "title"
        );

    const textStyle =
        getTypographyStyle(
            styles,
            "text"
        );

    const buttonStyle =
        getTypographyStyle(
            styles,
            "button"
        );

    const buttonHref =
        normalizeHref(
             content?.buttonUrl
        );

    return (
        <div className="qr_public_cta">

            {
                 content?.title && (
                    <h2 style={titleStyle}>
                        { content?.title}
                    </h2>
                )
            }

            {
                 content?.text && (
                    <p style={textStyle}>
                        { content?.text}
                    </p>
                )
            }

            {
                 content?.buttonLabel &&
                buttonHref && (
                    <a
                        href={buttonHref}
                        target={
                            buttonHref.startsWith("http")
                                ? "_blank"
                                : undefined
                        }
                        rel="noreferrer"
                        className="qr_public_cta_button"
                        style={buttonStyle}
                    >
                        { content?.buttonLabel}
                    </a>
                )
            }

        </div>
    );
}