import { requireEventOwnership }
    from "@/app/modules/e-events/lib/requireEventOwnership";

import EventAssignedStaffPage
    from "./pageClient";
import { requireEventLogin } from "@/app/modules/e-events/lib/requireEventLogin";
import { getVisibleEventModules } from "@/app/modules/e-events/lib/getVisibleEventModules";

export default async function Page({
    params
}) {

    const session =
        await requireEventLogin();

    // OWNER / ADMIN
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

            eventId: params.id
        });

    return (

        <EventAssignedStaffPage

            session={session}

            eventId={params.id}

            modules={modules}
        />

    );
}