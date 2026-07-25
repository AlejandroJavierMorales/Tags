import {
    redirect
} from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

import RestoStaffClient
    from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Tags Resto | Personal",
    robots: {
        index: false,
        follow: false
    }
};

export default async function Page({
    params
}) {
    const { id } = await params;

    const access =
        await getRestoAccess({
            businessId: id,
            permission: "staff.view"
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
            <RestoStaffClient
                businessId={id}
            />
        </>
    );
}
