import {
    redirect
} from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";
import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

import RestoCategoriesClient
    from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({
    params
}) {
    const {
        id: businessId
    } = await params;

    const access =
        await getRestoAccess({
            businessId,
            permission:
                "categories.view"
        });

    if (!access.allowed) {
        redirect(
            access.status === 401
                ? "/login"
                : `/dashboard/businesses/${businessId}/resto`
        );
    }

    return (
        <>
            <HeaderSwitcher />

            <RestoCategoriesClient
                businessId={businessId}
                session={access.session}
                isAdmin={access.isOwner}
            />
        </>
    );
}
