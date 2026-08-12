import {
    redirect
} from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";
import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

import RestoReportsClient
    from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title:
        "Reportes | Tags Resto",
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
            businessId:
                id,
            permission:
                "history.view"
        });

    if (!access.allowed) {
        return redirect(
            access.status === 401
                ? "/resto/login"
                : `/dashboard/businesses/${id}/resto`
        );
    }

    return (
        <>
            <HeaderSwitcher context="resto" />
            <RestoReportsClient
                businessId={id}
            />
        </>
    );
}
