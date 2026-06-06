// =====================================
// PAGE: /dashboard/businesses
// Descripción: Página admin para gestionar clientes de Tags.
// =====================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import BusinessesPageClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page() {

    const cookieStore =
        await cookies();

    const cookie =
        cookieStore.get("tags_session");

    if (!cookie) {
        return redirect("/login");
    }

    let parsed;

    try {
        parsed =
            JSON.parse(cookie.value);
    } catch (err) {
        console.error("INVALID SESSION:", err);
        return redirect("/login");
    }

    if (parsed?.role !== "admin") {
        return redirect("/login");
    }

    return (
        <>
            <HeaderSwitcher />

            <BusinessesPageClient
                session={parsed}
            />
        </>
    );
}