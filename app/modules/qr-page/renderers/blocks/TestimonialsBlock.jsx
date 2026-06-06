import getTypographyStyle from "../../lib/getTypographyStyle";

export default function TestimonialsBlock({
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
        <div className="qr_public_testimonials_grid">

            {
                items.map((item, index) => (

                    <article
                        key={index}
                        className="qr_public_testimonial_item"
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
                            item.text && (
                                <p style={textStyle}>
                                    “{item.text}”
                                </p>
                            )
                        }

                        {
                            item.name && (
                                <strong style={titleStyle}>
                                    {item.name}
                                </strong>
                            )
                        }

                        {
                            item.role && (
                                <span style={subtitleStyle}>
                                    {item.role}
                                </span>
                            )
                        }

                    </article>

                ))
            }

        </div>
    );
}