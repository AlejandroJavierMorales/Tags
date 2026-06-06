import getTypographyStyle from "../../lib/getTypographyStyle";


export default function CTABlock({
    content,
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

    return (
        <div className="qr_public_cta">

            {
                content.title && (
                    <h2 style={titleStyle}>
                        {content.title}
                    </h2>
                )
            }

            {
                content.text && (
                    <p style={textStyle}>
                        {content.text}
                    </p>
                )
            }

            {
                content.buttonLabel &&
                content.buttonUrl && (

                    <a
                        href={content.buttonUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="qr_public_cta_button"
                        style={buttonStyle}
                    >
                        {content.buttonLabel}
                    </a>

                )
            }

        </div>
    );
}