// =====================================
// FILE: /dashboard/businesses/[id]/resto/categories/[categoryId]/page.jsx
// Descripción:
// Edición de categorías de Tags Resto.
// Acceso: admin o cliente dueño del business.
// =====================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HeaderSwitcher
    from "@/app/components/HeaderSwitcher";

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
        id,
        categoryId
    } = await params;

    const businessId =
        id;

    if (!categoryId) {

        return redirect(
            `/dashboard/businesses/${businessId}/resto/categories`
        );

    }

    const cookieStore =
        await cookies();

    const cookie =
        cookieStore.get(
            "tags_session"
        );

    if (!cookie) {

        return redirect(
            "/login"
        );

    }

    let session;

    try {

        session =
            JSON.parse(
                cookie.value
            );

    } catch (err) {

        console.error(
            "INVALID SESSION:",
            err
        );

        return redirect(
            "/login"
        );

    }

    const isAdmin =
        session?.role === "admin";

    const isOwner =
        String(
            session?.business_id ||
            session?.businessId ||
            ""
        ) === String(
            businessId
        );

    if (
        !isAdmin &&
        !isOwner
    ) {

        return redirect(
            "/dashboard"
        );

    }

    return (
        <>
            <HeaderSwitcher />

            <RestoCategoryEditorClient
                businessId={businessId}
                categoryId={categoryId}
                session={session}
                isAdmin={isAdmin}
            />
        </>
    );

}