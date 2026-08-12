import { redirect } from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

import RestoTablesClient
    from "./pageClient";

import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Tags Resto | Mesas",
    robots: {
        index: false,
        follow: false
    }
};

export default async function Page({
    params
}) {

    const { id } =
        await params;

    const access =
        await getRestoAccess({
            businessId: id,
            permission: "tables.view"
        });

    if (!access.allowed) {
        redirect(
            access.status === 401
                ? "/resto/login"
                : `/dashboard/businesses/${id}/resto`
        );
    }

    return (
        <>
            <HeaderSwitcher context="resto" />

            <RestoTablesClient
                businessId={id}
                permissions={access.permissions}
            />
        </>
    );

}
