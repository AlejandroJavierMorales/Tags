export default function getTypographyStyle(
    styles = {},
    part = "text"
) {

    const typography =
        styles.typography || {};

    const partStyle =
        typography[part] || {};

    return {
        fontSize:
            partStyle.fontSize || undefined,
        fontWeight:
            partStyle.fontWeight || undefined,
        fontStyle:
            partStyle.fontStyle || undefined,
        textDecoration:
            partStyle.textDecoration || undefined,
        lineHeight:
            partStyle.lineHeight || undefined,
        letterSpacing:
            partStyle.letterSpacing || undefined,
        textTransform:
            partStyle.textTransform || undefined
    };
}