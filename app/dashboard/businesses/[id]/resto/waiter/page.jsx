// =====================================
// PAGE: /dashboard/businesses/[id]/resto/waiter
// Descripción:
// Pantalla operativa temporal de Mozo.
// Acceso: administrador o propietario.
// =====================================

import {
    redirect
} from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

import RestoWaiterPageClient
    from "./pageClient";

import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title:
        "Tags Resto | Mozo",
    robots: {
        index:
            false,
        follow:
            false
    }
};

export default async function Page({
    params
}) {

    const {
        id
    } =
        await params;

    const access =
        await getRestoAccess({
            businessId: id,
            permission: "waiter.view"
        });

    if (!access.allowed) {
        return redirect(
            access.status === 401
                ? "/login"
                : `/dashboard/businesses/${id}/resto`
        );
    }

    return (
        <>
            <HeaderSwitcher />

            <RestoWaiterPageClient
                businessId={id}
                permissions={access.permissions}
            />
        </>
    );

}
