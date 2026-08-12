// =====================================
// FILE: /dashboard/businesses/[id]/resto/products/new/page.jsx
// Descripción:
// Alta de productos para Tags Resto.
// Acceso: admin o cliente dueño del business.
// =====================================

import { redirect } from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

import RestoProductEditorClient
    from "./pageClient";
import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Nuevo producto | Tags Resto",
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
    } = await params;

    const businessId =
        id;

    const access =
        await getRestoAccess({
            businessId,
            permission:
                "products.manage"
        });

    if (!access.allowed) {
        return redirect(
            access.status === 401
                ? "/resto/login"
                : `/dashboard/businesses/${businessId}/resto/products`
        );
    }

    return (
        <>
            <HeaderSwitcher context="resto" />

            <RestoProductEditorClient
                businessId={businessId}
                productId={null}
                session={access.session}
                isAdmin={access.isOwner}
            />
        </>
    );

}
