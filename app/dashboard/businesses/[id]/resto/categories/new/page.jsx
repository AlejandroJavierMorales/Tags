import {
    redirect
} from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";
import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

import RestoCategoryEditorClient
    from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Nueva categoría | Tags Resto",
    robots: {
        index: false,
        follow: false
    }
};

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
                "categories.manage"
        });

    if (!access.allowed) {
        redirect(
            access.status === 401
                ? "/login"
                : `/dashboard/businesses/${businessId}/resto/categories`
        );
    }

    return (
        <>
            <HeaderSwitcher />

            <RestoCategoryEditorClient
                businessId={businessId}
                categoryId={null}
                session={access.session}
                isAdmin={access.isOwner}
            />
        </>
    );
}
