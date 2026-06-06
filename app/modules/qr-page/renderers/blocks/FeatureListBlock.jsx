import getTypographyStyle from "../../lib/getTypographyStyle";

export default function FeatureListBlock({
    content,
    styles = {}
}) {

    const textStyle =
        getTypographyStyle(
            styles,
            "text"
        );

    const items =
        Array.isArray(content.items)
            ? content.items
            : [];

    if (!items.length) {
        return null;
    }

    return (
        <div className="qr_public_feature_list">

            {
                items.map((item, index) => (

                    <div
                        key={index}
                        className="qr_public_feature_item"
                    >

                        <span>
                            ✓
                        </span>

                        <strong style={textStyle}>
                            {item}
                        </strong>

                    </div>

                ))
            }

        </div>
    );
}