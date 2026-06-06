import { getEventSession } from "@/app/lib/geEventSession";
import { redirect }
    from "next/navigation";



export async function requireEventLogin() {

    const session =
        await getEventSession();

    if (!session) {

        redirect("/login");
    }

    return session;
}