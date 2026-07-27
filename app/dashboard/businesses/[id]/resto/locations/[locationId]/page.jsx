import {
    redirect
} from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";
import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

import RestoLocationEditorClient
    from "../new/pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Editar ubicación | Tags Resto",
    robots: {
        index: false,
        follow: false
    }
};

export default async function Page({
    params
}) {
    const {
        id: businessId,
        locationId
    } = await params;

    if (!locationId) {
        redirect(
            `/dashboard/businesses/${businessId}/resto/locations`
        );
    }

    const access =
        await getRestoAccess({
            businessId,
            permission:
                "locations.manage"
        });

    if (!access.allowed) {
        redirect(
            access.status === 401
                ? "/login"
                : `/dashboard/businesses/${businessId}/resto/locations`
        );
    }

    return (
        <>
            <HeaderSwitcher />

            <RestoLocationEditorClient
                businessId={businessId}
                locationId={locationId}
                session={access.session}
                isAdmin={access.isOwner}
            />
        </>
    );
}
