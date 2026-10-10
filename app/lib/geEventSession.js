import { cookies } from "next/headers";
import { verifyTagsSession } from "@/app/lib/signTagsSession";
import { businessHasEventsAddon } from "@/app/modules/e-events/lib/eventAddonAccess";

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

    if (session.role === "client") {
        const hasAddon = await businessHasEventsAddon(session.businessId);
        if (!hasAddon) return null;

        return {
            ...session,
            sourceRole: "client",
            role: "event_client"
        };
    }

    return session;
}
