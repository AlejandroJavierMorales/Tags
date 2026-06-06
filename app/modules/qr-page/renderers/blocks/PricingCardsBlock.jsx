import getTypographyStyle from "../../lib/getTypographyStyle";

export default function PricingCardsBlock({
    content,
    styles = {}
}) {

    const titleStyle =
        getTypographyStyle(styles, "title");

    const subtitleStyle =
        getTypographyStyle(styles, "subtitle");

    const textStyle =
        getTypographyStyle(styles, "text");

    const priceStyle =
        getTypographyStyle(styles, "price");

    const oldPriceStyle =
        getTypographyStyle(styles, "oldPrice");

    const metaStyle =
        getTypographyStyle(styles, "meta");

    const buttonStyle =
        getTypographyStyle(styles, "button");

    const items =
        Array.isArray(content.items)
            ? content.items
            : [];

    if (!items.length) {
        return null;
    }

    return (
        <div className="qr_public_pricing_grid">
            {items.map((item, index) => (
                <article
                    key={index}
                    className="qr_public_pricing_item"
                >
                    {item.title && (
                        <h3 style={titleStyle}>
                            {item.title}
                        </h3>
                    )}

                    {item.subtitle && (
                        <p
                            className="qr_public_pricing_subtitle"
                            style={subtitleStyle}
                        >
                            {item.subtitle}
                        </p>
                    )}

                    {item.description && (
                        <p
                            className="qr_public_pricing_description"
                            style={textStyle}
                        >
                            {item.description}
                        </p>
                    )}

                    {(item.old_price || item.discount_label) && (
                        <div className="qr_public_pricing_discount_row">
                            {item.old_price && (
                                <span
                                    className="qr_public_pricing_old_price"
                                    style={oldPriceStyle}
                                >
                                    {item.old_price}
                                </span>
                            )}

                            {item.discount_label && (
                                <span
                                    className="qr_public_pricing_discount"
                                    style={metaStyle}
                                >
                                    {item.discount_label}
                                </span>
                            )}
                        </div>
                    )}

                    {item.price && (
                        <strong
                            className="qr_public_pricing_price"
                            style={priceStyle}
                        >
                            {item.price}
                        </strong>
                    )}

                    {Array.isArray(item.features) && item.features.length > 0 && (
                        <ul>
                            {item.features.map((feature, i) => (
                                <li
                                    key={i}
                                    style={textStyle}
                                >
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    )}

                    {item.button_url && item.button_label && (
                        <a
                            href={item.button_url}
                            target="_blank"
                            rel="noreferrer"
                            style={buttonStyle}
                        >
                            {item.button_label}
                        </a>
                    )}
                </article>
            ))}
        </div>
    );
}