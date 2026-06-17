export function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
}

export function normalizeArgentinaWhatsapp(value) {
    let phone = onlyDigits(value);

    if (!phone) return "";

    if (phone.startsWith("549")) {
        return phone;
    }

    if (phone.startsWith("54")) {
        phone = phone.slice(2);
    }

    if (phone.startsWith("9")) {
        phone = phone.slice(1);
    }

    return `549${phone}`;
}

export function normalizeWebsite(value) {
    const url = String(value || "").trim();

    if (!url) return "";

    if (
        url.startsWith("http://") ||
        url.startsWith("https://")
    ) {
        return url;
    }

    return `https://${url}`;
}

export function cleanSocialUser(value) {
    return String(value || "")
        .trim()
        .replace(/^@/, "")
        .replace(/^https?:\/\/(www\.)?/i, "")
        .replace(/\/$/, "");
}

export function normalizeSocialUser(platform, value) {
    const clean = cleanSocialUser(value);

    if (!clean) return "";

    const map = {
        instagram: "instagram.com/",
        facebook: "facebook.com/",
        tiktok: "tiktok.com/@",
        youtube: "youtube.com/@",
        linkedin: "linkedin.com/in/"
    };

    return clean
        .replace(map[platform] || "", "")
        .replace(/^@/, "")
        .replace(/\/$/, "");
}

export function buildSocialUrl(platform, value) {
    const user = normalizeSocialUser(platform, value);

    if (!user) return "";

    const map = {
        instagram: `https://www.instagram.com/${user}`,
        facebook: `https://www.facebook.com/${user}`,
        tiktok: `https://www.tiktok.com/@${user}`,
        youtube: `https://www.youtube.com/@${user}`,
        linkedin: `https://www.linkedin.com/in/${user}`
    };

    return map[platform] || user;
}