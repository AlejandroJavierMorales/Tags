// =====================================
// PAGE: /dashboard/businesses/[id]/resto/orders/[orderId]
// Descripción:
// Detalle operativo de un pedido de Tags Resto.
// Acceso: admin o cliente dueño del business.
// =====================================

import {
    redirect
} from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

import RestoOrderDetailPageClient
    from "./pageClient";

import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title:
        "Tags Resto | Detalle del pedido",
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
        id,
        orderId
    } =
        await params;

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

            <RestoOrderDetailPageClient
                businessId={businessId}
                orderId={orderId}
                session={access.session}
                isAdmin={access.isOwner}
                permissions={access.permissions}
            />
        </>
    );

}
