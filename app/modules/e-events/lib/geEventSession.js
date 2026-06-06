import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";

export async function getEventSession() {

    const cookieStore =
        cookies();

    const cookie =
        cookieStore.get(
            "tags_session"
        );

    if (!cookie) {

        return null;
    }

    let session;

    try {

        session =
            JSON.parse(cookie.value);

    } catch {

        return null;
    }

    return session;
}