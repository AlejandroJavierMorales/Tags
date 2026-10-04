import { cookies } from "next/headers";
import { verifyTagsSession } from "@/app/lib/signTagsSession";

export async function getEventSession() {
    const cookieStore =
        cookies();

    const cookie =
        cookieStore.get(
            "tags_session"
        );

    const signature =
        cookieStore.get(
            "tags_session_sig"
        )?.value || "";

    if (
        !cookie?.value
        || !verifyTagsSession(
            cookie.value,
            signature
        )
    ) {

        return null;
    }

    let session;

    try {

        session =
            JSON.parse(
                cookie.value
            );

    } catch {

        return null;
    }

    if (
        !session
        || typeof session !== "object"
    ) {
        return null;
    }

    return session;
}
