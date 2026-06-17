import {
    FaCheck,
    FaCircle,
    FaArrowRight,
    FaStar,
    FaHeart,
    FaBolt
}
from "react-icons/fa6";

function getBulletIcon(icon) {

    const icons = {
        check: <FaCheck />,
        dot: <FaCircle />,
        arrow: <FaArrowRight />,
        star: <FaStar />,
        heart: <FaHeart />,
        bolt: <FaBolt />
    };

    return icons[icon] || icons.check;
}

export default function BulletListBlock({
    content,
    styles = {}
}) {

    const items =
        Array.isArray(content.items)
            ? content.items
            : [];

    const typography =
        styles?.typography || {};

    const alignment =
        styles?.alignment || "left";

    const icon =
        content.icon || "check";

    const iconColor =
        content.iconColor ||
        "var(--qr-primary)";

    const listIndent =
        styles.listIndent || "0px";

    return (
        <div
            className="qr_bullet_list"
            style={{
                textAlign: alignment,
                paddingLeft:
                    alignment === "left"
                        ? listIndent
                        : 0,
                paddingRight:
                    alignment === "right"
                        ? listIndent
                        : 0
            }}
        >
            {
                content.title && (
                    <h3
                        style={{
                            fontSize: typography.title?.fontSize,
                            fontWeight: typography.title?.fontWeight,
                            lineHeight: typography.title?.lineHeight,
                            letterSpacing: typography.title?.letterSpacing
                        }}
                    >
                        {content.title}
                    </h3>
                )
            }

            <ul
                style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems:
                        alignment === "right"
                            ? "flex-end"
                            : "flex-start"
                }}
            >
                {
                    items.map((item, index) => (
                        <li
                            key={index}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "22px 1fr",
                                gap: "10px",
                                marginBottom: "10px",
                                fontSize: typography.text?.fontSize,
                                fontWeight: typography.text?.fontWeight,
                                lineHeight: typography.text?.lineHeight,
                                letterSpacing: typography.text?.letterSpacing
                            }}
                        >
                            <span
                                className="qr_bullet_list_icon"
                                style={{
                                    color: iconColor
                                }}
                            >
                                {getBulletIcon(icon)}
                            </span>

                            <span>
                                {item}
                            </span>
                        </li>
                    ))
                }
            </ul>
        </div>
    );
}