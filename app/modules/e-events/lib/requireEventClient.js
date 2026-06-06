import { redirect }
    from "next/navigation";
import { requireEventLogin } from "./requireEventLogin";


export async function requireEventClient() {

    const session =
        await requireEventLogin();

    const allowed = [

        "admin",
        "event_client"
    ];

    if (
        !allowed.includes(
            session.role
        )
    ) {

        redirect("/login");
    }

    return session;
}