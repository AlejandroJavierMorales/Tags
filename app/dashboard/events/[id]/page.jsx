import EventDashboardPage
    from "./pageClient";

import { requireEventLogin }
    from "@/app/modules/e-events/lib/requireEventLogin";

import { requireEventOwnership }
    from "@/app/modules/e-events/lib/requireEventOwnership";

import { getVisibleEventModules }
    from "@/app/modules/e-events/lib/getVisibleEventModules";
import { requireEventClient } from "@/app/modules/e-events/lib/requireEventClient";

export default async function Page({
    params
}) {

    const session =
        await requireEventLogin();
    
/* console.log('LA SESSION ACA ES ::::::: ' + JSON.stringify(session,2,null)) */
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

    /* console.log('Modules::::::: ' + JSON.stringify(modules,2,null)) */

    return (

        <EventDashboardPage

            session={session}

            eventId={params.id}

            modules={modules}
        />

    );
}