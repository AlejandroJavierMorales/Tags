function parseSettings(value) {

    if (
        value &&
        typeof value === "object"
    ) {
        return value;
    }

    if (!value) {
        return {};
    }

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }

}

export function getRestoProductAvailability(
    product
) {
    const settings =
        parseSettings(
            product?.settings_json
        );

    return {
        settings,
        isAvailable:
            settings.resto_available !==
            false
    };
}

export function withRestoProductAvailability(
    product
) {
    const {
        settings,
        isAvailable
    } =
        getRestoProductAvailability(
            product
        );

    return {
        ...product,
        settings_json:
            settings,
        is_available:
            isAvailable
    };
}
