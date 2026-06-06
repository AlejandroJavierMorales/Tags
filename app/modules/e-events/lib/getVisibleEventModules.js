import { cookies } from "next/headers";

export async function getVisibleEventModules({

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
            invitations: true,
            tables: true,
            menu: true,
            playlist: true,
            event: true,
            guests: true,
            checkin: true,
            scanner: true,
            companions: true,
            analytics: true,
            activity: true
        };
    }

    // =========================
    // BASE URL
    // =========================

    const base =
        process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : process.env.NEXT_PUBLIC_BASE_URL;

    // =========================
    // COOKIES
    // =========================

    const cookieStore =
        await cookies();

    const cookieHeader =
        cookieStore
            .getAll()
            .map(
                c => `${c.name}=${c.value}`
            )
            .join("; ");

    // =========================
    // GET PERMISSIONS
    // =========================

    let permissions = [];

    try {

        const res =
            await fetch(
                `${base}/api/events/staff/getPermissionsOfStaffId`,
                {
                    cache: "no-store",
                    headers: {
                        Cookie: cookieHeader
                    }
                }
            );

        const data =
            await res.json();



        if (

            res.ok
            &&
            data.ok
            &&
            Array.isArray(data.data)

        ) {

            permissions =
                data.data.flatMap(

                    module =>

                        module.permissions.map(
                            p => p.code
                        )
                );
        }

    } catch (err) {

        console.log(
            err
        );
    }


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
                "attendees.send"
            ),

        invitations:
            has(

                "invitations.create",
                "invitations.update",
                "invitations.delete",
                "invitations.send"
            ),
        tables:
            has(

                "tables.create",
                "tables.update",
                "tables.delete",
                "tables.assign"
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

        companions:
            has(

                "companions.view",
                "companions.create",
                "companions.update",
                "companions.delete"
            ),

        guests:
            has(

                "guest.photos",
                "guest.messages"
            ),

        analytics: false
    };
}