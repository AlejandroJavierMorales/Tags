import { validateEventPermission }
    from "./validateEventPermission";

export async function canAccessEventModule({

    session,
    eventId,
    permission

}) {

    // OWNER TOTAL ACCESS
    if (

        session.role === "admin"
        ||
        session.role === "event_client"

    ) {

        return true;
    }

    // STAFF
    if (!session.staffId) {

        return false;
    }

    return await validateEventPermission({

        staffId:
            session.staffId,

        eventId,

        permission
    });
}