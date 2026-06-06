import { getStaffPermissions }
    from "@/app/modules/e-events/lib/getStaffPermissions";

import EventStaffPageClient
    from "./pageClient";
import { getEventSession } from "@/app/modules/e-events/lib/geEventSession";
import EventDietaryRestrictionsPageClient from "./pageClient";

export default async function Page() {

    const session =
        await getEventSession();

    let staffPermissions = [];

    // =========================
    // EVENT STAFF
    // =========================

    if (
        session?.type === "event_staff"
    ) {

        staffPermissions =
            await getStaffPermissions(
                session.staffId
            );
    }

    return (

        <EventDietaryRestrictionsPageClient
            session={session}
            staffPermissions={
                staffPermissions
            }
        />
    );
}