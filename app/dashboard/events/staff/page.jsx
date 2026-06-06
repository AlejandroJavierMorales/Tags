import { getStaffPermissions }
    from "@/app/modules/e-events/lib/getStaffPermissions";

import EventStaffPageClient
    from "./pageClient";
import { getEventSession } from "@/app/modules/e-events/lib/geEventSession";

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

        <EventStaffPageClient
            session={session}
            staffPermissions={
                staffPermissions
            }
        />
    );
}