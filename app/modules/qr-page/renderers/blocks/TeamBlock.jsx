import getTypographyStyle from "../../lib/getTypographyStyle";

export default function TeamBlock({
    content,
    styles = {}
}) {

    const titleStyle =
        getTypographyStyle(
            styles,
            "title"
        );

    const subtitleStyle =
        getTypographyStyle(
            styles,
            "subtitle"
        );

    const items =
        Array.isArray(content.items)
            ? content.items
            : [];

    if (!items.length) {
        return null;
    }

    return (
        <div className="qr_public_team_grid">

            {
                items.map((item, index) => (

                    <article
                        key={index}
                        className="qr_public_team_item"
                    >

                        {
                            item.image_url && (
                                <img
                                    src={item.image_url}
                                    alt={item.name || ""}
                                />
                            )
                        }

                        {
                            item.name && (
                                <h3 style={titleStyle}>
                                    {item.name}
                                </h3>
                            )
                        }

                        {
                            item.role && (
                                <p style={subtitleStyle}>
                                    {item.role}
                                </p>
                            )
                        }

                    </article>

                ))
            }

        </div>
    );
}