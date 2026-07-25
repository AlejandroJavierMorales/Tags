import {
    redirect
} from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

import RestoOrdersHistoryClient
    from "./pageClient";

import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title:
        "Tags Resto | Historial de pedidos",
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
    } =
        await params;

    const access =
        await getRestoAccess({
            businessId: id,
            permission: "history.view"
        });

    if (!access.allowed) {
        redirect(
            access.status === 401
                ? "/login"
                : `/dashboard/businesses/${id}/resto`
        );
    }

    return (
        <>
            <HeaderSwitcher />

            <RestoOrdersHistoryClient
                businessId={id}
            />
        </>
    );

}
