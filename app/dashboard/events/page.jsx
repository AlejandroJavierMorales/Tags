import { cookies }
    from "next/headers";

import { redirect }
    from "next/navigation";

import EventsPageClient
    from "./pageClient";

import { getStaffPermissions }
    from "@/app/modules/e-events/lib/getStaffPermissions";

export default async function EventsPage() {

    // =========================
    // SESSION
    // =========================

    const cookieStore =
        await cookies();

    const sessionCookie =
        cookieStore.get(
            "tags_session"
        );

    if (!sessionCookie) {

        redirect("/login");
    }

    let session = null;

    try {

        session =
            JSON.parse(
                sessionCookie.value
            );

    } catch (err) {

        console.log(err);

        redirect("/login");
    }

    // =========================
    // STAFF SESSION
    // =========================

    if (
        session.type ===
        "event_staff"
    ) {

        const staffPermissions =
            await getStaffPermissions(
                session.staffId
            );

        console.log('Permisos de Staff **** ' + JSON.stringify(staffPermissions, 2, null));

        return (

            <EventsPageClient
                session={session}
                isStaff={true}
                staffPermissions={
                    staffPermissions
                }
            />

        );
    }

    // =========================
    // OWNER VALIDATION
    // =========================

    const allowedRoles = [

        "admin",
        "event_client"
    ];

    if (
        !allowedRoles.includes(
            session.role
        )
    ) {

        redirect("/login");
    }

    // =========================
    // OWNER PANEL
    // =========================

    return (

        <EventsPageClient
            session={session}
            isStaff={false}
            staffPermissions={[]}
        />

    );
}