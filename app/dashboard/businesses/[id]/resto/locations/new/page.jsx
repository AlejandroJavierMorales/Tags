// =====================================
// FILE: /dashboard/businesses/[id]/resto/locations/new/page.jsx
// Descripción:
// Alta de sectores, mesas y ubicaciones
// para Tags Resto.
// Acceso: admin o cliente dueño del business.
// =====================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

import RestoLocationEditorClient
    from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Nueva ubicación | Tags Resto",
    robots: {
        index: false,
        follow: false
    }
};

export default async function Page({
    params
}) {

    const {
        id
    } = await params;

    const businessId =
        id;

    const cookieStore =
        await cookies();

    const cookie =
        cookieStore.get(
            "tags_session"
        );

    if (!cookie) {

        return redirect(
            "/login"
        );

    }

    let session;

    try {

        session =
            JSON.parse(
                cookie.value
            );

    } catch (err) {

        console.error(
            "INVALID SESSION:",
            err
        );

        return redirect(
            "/login"
        );

    }

    const isAdmin =
        session?.role === "admin";

    const isOwner =
        String(
            session?.business_id ||
            session?.businessId ||
            ""
        ) === String(
            businessId
        );

    if (
        !isAdmin &&
        !isOwner
    ) {

        return redirect(
            "/dashboard"
        );

    }

    return (
        <>
            <HeaderSwitcher />

            <RestoLocationEditorClient
                businessId={businessId}
                locationId={null}
                session={session}
                isAdmin={isAdmin}
            />
        </>
    );

}