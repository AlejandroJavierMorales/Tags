import {
    redirect
} from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";
import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

import RestoCategoryEditorClient
    from "../new/pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Editar categoría | Tags Resto",
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
        categoryId
    } = await params;

    if (!categoryId) {
        redirect(
            `/dashboard/businesses/${businessId}/resto/categories`
        );
    }

    const access =
        await getRestoAccess({
            businessId,
            permission:
                "categories.manage"
        });

    if (!access.allowed) {
        redirect(
            access.status === 401
                ? "/resto/login"
                : `/dashboard/businesses/${businessId}/resto/categories`
        );
    }

    return (
        <>
            <HeaderSwitcher context="resto" />

            <RestoCategoryEditorClient
                businessId={businessId}
                categoryId={categoryId}
                session={access.session}
                isAdmin={access.isOwner}
            />
        </>
    );
}
