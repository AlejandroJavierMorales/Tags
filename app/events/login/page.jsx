// /events/login/page.jsx

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import EventLoginClient from "./pageClient";

export default function EventLoginPage() {

    const session =
        cookies().get("tags_session");

    console.log('Cookie Leventada en la session en Login: ' + JSON.stringify(session,2,null))

    if (!session) {

        return <EventLoginClient />;
    }

    let parsed = null;

    try {

        parsed =
            JSON.parse(session.value);

    } catch {

        
        /* return <EventLoginClient />; */
    }

    // STAFF YA LOGUEADO
    if (
        parsed?.staffId &&
        parsed?.eventId
    ) {

        redirect(
            `dashboard/events`
        );
    }

    return <EventLoginClient />;
}