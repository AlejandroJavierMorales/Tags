// =====================================
// PAGE: /dashboard/businesses/subscriptions
// Descripción: Vista admin global de suscripciones de clientes.
// =====================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import BusinessSubscriptionsGlobalClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Suscripciones | Tags",
    robots: {
        index: false,
        follow: false
    }
};



export default async function Page() {

    const cookieStore =
        await cookies();

    const cookie =
        cookieStore.get("tags_session");

    if (!cookie) {
        return redirect("/login");
    }

    let session;

    try {
        session =
            JSON.parse(cookie.value);
    } catch (err) {
        console.error("INVALID SESSION:", err);
        return redirect("/login");
    }

    if (session?.role !== "admin") {
        return redirect("/login");
    }

    return (
        <>
            <HeaderSwitcher />

            <BusinessSubscriptionsGlobalClient
                session={session}
            />
        </>
    );
}
