import getTypographyStyle from "../../lib/getTypographyStyle";

export default function StatsBlock({
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

    const items =
        Array.isArray(content.items)
            ? content.items
            : [];

    if (!items.length) {
        return null;
    }

    return (
        <div className="qr_public_stats_grid">

            {
                items.map((item, index) => (

                    <div
                        key={index}
                        className="qr_public_stat_item"
                    >

                        <strong style={titleStyle}>
                            {item.value}
                        </strong>

                        <span style={textStyle}>
                            {item.label}
                        </span>

                    </div>

                ))
            }

        </div>
    );
}