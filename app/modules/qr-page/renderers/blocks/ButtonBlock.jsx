// src/app/modules/qr-page/renderers/blocks/ButtonBlock.jsx

import getTypographyStyle from "../../lib/getTypographyStyle";



export default function ButtonBlock({
    content,
    styles = {}
}) {

    if (!content.label) {
        return null;
    }

    return (
        <a
            className="qr_public_button"
            href={content.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={
                getTypographyStyle(
                    styles,
                    "button"
                )
            }
        >
            {content.label}
        </a>
    );
}