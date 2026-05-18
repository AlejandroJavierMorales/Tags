// /app/dashboard/stats/page.jsx

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HeaderSwitcher from "@/app/components/HeaderSwitcher";

import StatsPageClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page() {

    // =====================================
    // SESSION
    // =====================================

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

        console.log(err);

        return redirect("/login");
    }

    // =====================================
    // ONLY ADMIN
    // =====================================

    if (session?.role !== "admin") {

        return redirect("/dashboard");
    }

    // =====================================
    // UI
    // =====================================

    return (
        <>
            <HeaderSwitcher />

            <StatsPageClient
                session={session}
                isAdmin={true}
            />
        </>
    );
}