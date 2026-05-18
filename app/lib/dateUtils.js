export function isExpiring(expiresAt) {
    if (!expiresAt) return false;

    const expires = new Date(expiresAt);
    const now = new Date();

    const diffDays = (expires - now) / (1000 * 60 * 60 * 24);

    return diffDays <= 15 && diffDays >= 0;
}