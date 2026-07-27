// =====================================
// FILE: /dashboard/businesses/[id]/resto/products/[productId]/page.jsx
// Descripción:
// Edición de productos de Tags Resto.
// Acceso: admin o cliente dueño del business.
// =====================================

import { redirect } from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

import RestoProductEditorClient
    from "../new/pageClient";
import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Editar producto | Tags Resto",
    robots: {
        index: false,
        follow: false
    }
};

export default async function Page({
    params
}) {

    const {
        id,
        productId
    } = await params;

    const businessId =
        id;

    if (!productId) {

        return redirect(
            `/dashboard/businesses/${businessId}/resto/products`
        );

    }

    const access =
        await getRestoAccess({
            businessId,
            permission:
                "products.manage"
        });

    if (!access.allowed) {
        return redirect(
            access.status === 401
                ? "/login"
                : `/dashboard/businesses/${businessId}/resto/products`
        );
    }

    return (
        <>
            <HeaderSwitcher />

            <RestoProductEditorClient
                businessId={businessId}
                productId={productId}
                session={access.session}
                isAdmin={access.isOwner}
            />
        </>
    );

}
