import { requireEventOwnership }
    from "@/app/modules/e-events/lib/requireEventOwnership";

import { requireEventLogin }
    from "@/app/modules/e-events/lib/requireEventLogin";

import { getVisibleEventModules }
    from "@/app/modules/e-events/lib/getVisibleEventModules";

import EventAssistantsPageClient
    from "./pageClient";

export default async function Page({
    params
}) {

    const session =
        await requireEventLogin();

    if (
        session.role === "admin"
        ||
        session.role === "event_client"
    ) {

        await requireEventOwnership(
            session,
            params.id
        );
    }

    const modules =
        await getVisibleEventModules({

            session,

            eventId:
                params.id
        });

    return (

        <EventAssistantsPageClient
            session={session}
            eventId={params.id}
            modules={modules}
        />

    );
}