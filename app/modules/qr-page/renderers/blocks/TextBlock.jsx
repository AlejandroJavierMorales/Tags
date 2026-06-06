// src/app/modules/qr-page/renderers/blocks/TextBlock.jsx

import getTypographyStyle from "../../lib/getTypographyStyle";

export default function TextBlock({
    content,
    styles = {}
}) {

    return (
        <div className="qr_public_text_block">

            {
                content.title && (
                    <h2
                        style={
                            getTypographyStyle(
                                styles,
                                "title"
                            )
                        }
                    >
                        {content.title}
                    </h2>
                )
            }

            {
                content.text && (
                    <p
                        style={
                            getTypographyStyle(
                                styles,
                                "text"
                            )
                        }
                    >
                        {content.text}
                    </p>
                )
            }

        </div>
    );
}