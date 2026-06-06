// src/app/modules/qr-page/renderers/blocks/MapBlock.jsx

import getTypographyStyle from "../../lib/getTypographyStyle";

export default function MapBlock({
    content,
    styles = {}
}) {

    const textStyle =
        getTypographyStyle(
            styles,
            "text"
        );

    if (content.embed_url) {
        return (
            <div className="qr_public_map">

                <iframe
                    src={content.embed_url}
                    loading="lazy"
                    allowFullScreen
                />

            </div>
        );
    }

    if (content.address) {
        return (
            <p
                className="qr_public_address"
                style={textStyle}
            >
                {content.address}
            </p>
        );
    }

    return null;
}