// =====================================
// Archivo:
// /app/modules/store/lib/storeStyleResolver.js
//
// Descripción:
// Resolver centralizado de estilos para
// los bloques públicos de Tags Store.
//
// Prioridad:
//
// 1) Override del bloque
// 2) Variables del theme activo
// 3) Fallback opcional
//
// De esta forma un bloque puede volver
// automáticamente al Theme simplemente
// eliminando el override.
//
// =====================================

const THEME_MAP = {

    backgroundColor: [
        "--qr-bg",
        "--qr-surface"
    ],

    surfaceColor: [
        "--qr-surface"
    ],

    surfaceAltColor: [
        "--qr-surface-alt"
    ],

    textColor: [
        "--qr-text"
    ],

    mutedColor: [
        "--qr-muted"
    ],

    borderColor: [
        "--qr-border"
    ],

    primaryColor: [
        "--qr-primary"
    ],

    primaryTextColor: [
        "--qr-primary-text"
    ],

    primaryHoverColor: [
        "--qr-primary-hover"
    ]

};

function getThemeValue(themeVars, key) {

    if (!themeVars) {
        return undefined;
    }

    const vars =
        THEME_MAP[key];

    if (!vars) {
        return undefined;
    }

    for (const variable of vars) {

        if (
            themeVars[variable] !== undefined &&
            themeVars[variable] !== null &&
            themeVars[variable] !== ""
        ) {
            return themeVars[variable];
        }

    }

    return undefined;

}

export function resolveStyle({
    styles = {},
    theme = {},
    key,
    fallback
}) {

    if (
        styles &&
        Object.prototype.hasOwnProperty.call(
            styles,
            key
        ) &&
        styles[key] !== undefined &&
        styles[key] !== null &&
        styles[key] !== ""
    ) {
        return styles[key];
    }

    const themeValue =
        getThemeValue(
            theme,
            key
        );

    if (
        themeValue !== undefined &&
        themeValue !== null &&
        themeValue !== ""
    ) {
        return themeValue;
    }

    return fallback;

}

export function resolveTypography({
    styles = {},
    part
}) {

    return (
        styles?.typography?.[part] ||
        {}
    );

}

export function removeStyleOverrides(
    styles = {},
    keys = []
) {

    const next = {
        ...styles
    };

    keys.forEach(key => {
        delete next[key];
    });

    return next;

}

export function removeTypographyOverrides(
    styles = {}
) {

    const next = {
        ...styles
    };

    delete next.typography;

    return next;

}

export const STORE_APPEARANCE_KEYS = [

    "backgroundColor",
    "surfaceColor",
    "surfaceAltColor",

    "textColor",
    "mutedColor",

    "borderColor",

    "primaryColor",
    "primaryTextColor",
    "primaryHoverColor"

];