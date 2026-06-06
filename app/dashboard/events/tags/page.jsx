// ========================================
// /events/tags/page.jsx
// ========================================

import { getStaffPermissions }
    from "@/app/modules/e-events/lib/getStaffPermissions";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import EventTagsPageClient
    from "./pageClient";

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

        <EventTagsPageClient
            session={session}
            staffPermissions={
                staffPermissions
            }
        />

    );
}