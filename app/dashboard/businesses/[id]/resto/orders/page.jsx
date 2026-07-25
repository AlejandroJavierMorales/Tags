// =====================================
// PAGE: /dashboard/businesses/[id]/resto/orders
// Descripción:
// Administración de pedidos de Tags Resto.
// Acceso: admin o cliente dueño del business.
// =====================================

import { redirect } from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

import RestoOrdersPageClient
    from "./pageClient";

import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Tags Resto | Pedidos",
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
            permission: "orders.view"
        });

    if (!access.allowed) {
        return redirect(
            access.status === 401
                ? "/login"
                : `/dashboard/businesses/${businessId}/resto`
        );
    }

    return (
        <>
            <HeaderSwitcher />

            <RestoOrdersPageClient
                businessId={businessId}
                session={access.session}
                isAdmin={access.isOwner}
                permissions={access.permissions}
            />
        </>
    );

}
