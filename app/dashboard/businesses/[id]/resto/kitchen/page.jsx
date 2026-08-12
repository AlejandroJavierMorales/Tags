// =====================================
// FILE: /app/dashboard/businesses/[id]/resto/kitchen/page.jsx
// Descripción:
// Página principal del módulo Cocina de Tags Resto.
// =====================================

import KitchenPageClient
    from "./pageClient";

import {
    redirect
} from "next/navigation";

import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export default async function RestoKitchenPage({
    params
}) {

    const {
        id
    } = await params;

    const access =
        await getRestoAccess({
            businessId: id,
            permission: "kitchen.view"
        });

    if (!access.allowed) {
        redirect(
            access.status === 401
                ? "/resto/login"
                : `/dashboard/businesses/${id}/resto`
        );
    }

    return (
        <KitchenPageClient
            businessId={Number(id)}
            permissions={access.permissions}
        />
    );

}
