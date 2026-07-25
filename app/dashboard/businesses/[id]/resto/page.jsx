// =====================================
// PAGE: /dashboard/businesses/[id]/resto
// Descripción: Pantalla de administración de Tags Resto.
// Acceso: admin o cliente dueño del business.
// =====================================

import { redirect } from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

import RestoDashboardClient
    from "./pageClient";

import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Tags Resto | Dashboard",
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

    const access =
        await getRestoAccess({
            businessId,
            permission:
                "dashboard.view"
        });

    if (!access.allowed) {
        return redirect(
            access.status === 401
                ? "/login"
                : "/dashboard"
        );
    }

    return (
        <>
            <HeaderSwitcher />

            <RestoDashboardClient
                businessId={businessId}
                session={access.session}
                isAdmin={
                    access.isOwner
                }
                isStaff={
                    access.isStaff
                }
                permissions={
                    access.permissions
                }
            />
        </>
    );

}
