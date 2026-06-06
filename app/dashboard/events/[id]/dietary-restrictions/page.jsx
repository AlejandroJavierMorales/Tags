import { requireEventOwnership }
    from "@/app/modules/e-events/lib/requireEventOwnership";

import { requireEventLogin }
    from "@/app/modules/e-events/lib/requireEventLogin";

import { getVisibleEventModules }
    from "@/app/modules/e-events/lib/getVisibleEventModules";

import EventDietaryRestrictionsPageClient
    from "./pageClient";

export default async function Page({
    params
}) {

    // =========================
    // SESSION
    // =========================

    const session =
        await requireEventLogin();

    // =========================
    // OWNER / ADMIN
    // =========================

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

    // =========================
    // MODULES
    // =========================

    const modules =
        await getVisibleEventModules({

            session,

            eventId:
                params.id
        });

    // =========================
    // PAGE
    // =========================

    return (

        <EventDietaryRestrictionsPageClient

            session={session}

            eventId={params.id}

            modules={modules}
        />

    );
}