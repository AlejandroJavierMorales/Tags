// =====================================
// PAGE: /dashboard/businesses/[id]/subscriptions
// Descripción: Panel admin para gestionar suscripciones y pagos de un cliente.
// Acceso: solo admin.
// =====================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import SubscriptionsPageClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Suscripciones del cliente | Tags",
    robots: {
        index: false,
        follow: false
    }
};

export default async function Page({
    params
}) {

    const { id } =
        await params;

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
        return redirect(`/dashboard/businesses/${id}`);
    }

    return (
        <>
            <HeaderSwitcher />

            <SubscriptionsPageClient
                businessId={id}
                session={session}
            />
        </>
    );
}