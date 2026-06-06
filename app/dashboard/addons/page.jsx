// =====================================
// PAGE: /dashboard/addons
// Descripción: Página admin para gestionar el catálogo global de complementos.
// =====================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import AddonsPageClient from "./pageClient.jsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Complementos | Tags",
    robots: {
        index: false,
        follow: false
    }
};



export default async function Page() {

    const cookieStore = await cookies();

    const cookie = cookieStore.get("tags_session");

    if (!cookie) {
        return redirect("/login");
    }

    let parsed;

    try {
        parsed = JSON.parse(cookie.value);
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

            <AddonsPageClient
                session={parsed}
            />
        </>
    );
}