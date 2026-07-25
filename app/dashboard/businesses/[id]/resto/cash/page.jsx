import {
    redirect
} from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

import RestoCashClient
    from "./pageClient";

import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title:
        "Tags Resto | Caja",
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
            permission: "cash.view"
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
            <RestoCashClient
                businessId={id}
                permissions={access.permissions}
            />
        </>
    );

}
