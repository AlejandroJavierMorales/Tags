import getTypographyStyle from "../../lib/getTypographyStyle";

export default function CardsBlock({
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

    const items =
        Array.isArray(content.items)
            ? content.items
            : [];

    if (!items.length) {
        return null;
    }

    return (
        <div className="qr_public_cards_grid">

            {
                items.map((item, index) => (

                    <article
                        key={index}
                        className="qr_public_card_item"
                    >

                        {
                            item.image_url && (
                                <img
                                    src={item.image_url}
                                    alt={item.title || ""}
                                />
                            )
                        }

                        <div className="qr_public_card_badge">
                            {index + 1}
                        </div>

                        <div className="qr_public_card_body">

                            {
                                item.title && (
                                    <h3 style={titleStyle}>
                                        {item.title}
                                    </h3>
                                )
                            }

                            {
                                item.text && (
                                    <p style={textStyle}>
                                        {item.text}
                                    </p>
                                )
                            }

                            {
                                item.button_url &&
                                item.button_label && (

                                    <a
                                        href={item.button_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={buttonStyle}
                                    >
                                        {item.button_label}
                                    </a>

                                )
                            }

                        </div>

                    </article>

                ))
            }

        </div>
    );
}