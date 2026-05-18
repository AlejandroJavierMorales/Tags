export function isRequired(value) {

    return !!value?.trim();

}

export function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

}

export function normalizeEmail(email) {

    return email
        ?.trim()
        ?.toLowerCase();

}