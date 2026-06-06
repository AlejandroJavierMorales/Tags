// src/app/modules/qr-page/lib/getTagsSession.js

import { cookies } from "next/headers";

export function getTagsSession() {
    const cookie =
        cookies().get("tags_session");

    if (!cookie?.value) {
        return null;
    }

    try {
        return JSON.parse(cookie.value);
    } catch {
        return null;
    }
}