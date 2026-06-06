export function getVisibleEventModules({

    session,
    eventId

}) {

    // =========================
    // OWNER / ADMIN
    // =========================

    if (

        session.role === "admin"
        ||
        session.role === "event_client"

    ) {

        return {

            staff: true,
            attendees: true,
            menu:true,
            playlist:true,
            event:true,
            guests: true,
            checkin: true,
            scanner: true,
            analytics: true,
            activity: true
        };
    }

    // =========================
    // NORMALIZE PERMISSIONS
    // =========================

    let permissions = [];

    try {

        permissions =
            Array.isArray(session.permissions)
                ? session.permissions
                : JSON.parse(
                    session.permissions || "[]"
                );

    } catch {

        permissions = [];
    }

    console.log(
        "permissions =>",
        permissions
    );

    // =========================
    // HELPER
    // =========================

    const has = (...required) =>

        required.some(
            p => permissions.includes(p)
        );

    // =========================
    // MODULES
    // =========================

    return {

        staff:
            has(

                "staff.create",
                "staff.update",
                "staff.delete",
                "staff.assign"
            ),

        attendees:
            has(

                "attendees.create",
                "attendees.update",
                "attendees.delete",
                "attendees.send",
            ),

        checkin:
            has(

                "checkin.scan",
                "checkin.vip"
            ),

        scanner:
            has(

                "checkin.scan",
                "checkin.vip"
            ),

        activity:
            has(

                "event.timeline",
                "event.images",
                "event.videos"
            ),
        gastronomia:
            has(

                "menu.create",
                "menu.update"
            ),
        music:
            has(
                "playlist.view",
                "playlist.create",
                "playlist.update"
            ),
        guests:
            has(

                "guest.photos",
                "guest.messages",
            ),
        analytics: false
    };
}