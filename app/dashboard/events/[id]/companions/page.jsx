// ========================================
// /events/[id]/companions/page.jsx
// ========================================

import { requireEventOwnership }
    from "@/app/modules/e-events/lib/requireEventOwnership";

import { requireEventLogin }
    from "@/app/modules/e-events/lib/requireEventLogin";

import { getVisibleEventModules }
    from "@/app/modules/e-events/lib/getVisibleEventModules";
import EventCompanionsPageClient from "./pageClients";



export default async function Page({
    params,
    searchParams
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

       <EventCompanionsPageClient

    session={session}

    eventId={params.id}

    attendeeId={searchParams?.attendee_id || null}

    modules={modules}
/>

    );
}