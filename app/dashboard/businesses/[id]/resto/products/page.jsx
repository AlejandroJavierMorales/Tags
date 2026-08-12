// =====================================
// FILE: /dashboard/businesses/[id]/resto/products/page.jsx
// Descripción:
// Panel de administración de productos
// de Tags Resto.
// Acceso: admin o cliente dueño del business.
// =====================================

import { redirect } from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

import RestoProductsClient
    from "./pageClient";
import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Productos | Tags Resto",
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
                "products.view"
        });

    if (!access.allowed) {
        return redirect(
            access.status === 401
                ? "/resto/login"
                : `/dashboard/businesses/${businessId}/resto`
        );
    }

    return (
        <>
            <HeaderSwitcher context="resto" />

            <RestoProductsClient
                businessId={businessId}
                session={access.session}
                isAdmin={access.isOwner}
                permissions={access.permissions}
            />
        </>
    );

}
