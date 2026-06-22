// =====================================
// PAGE: /dashboard/businesses/[id]/store/orders/[orderId]
// Descripción: Detalle de pedido de Tags Tienda.
// Acceso: admin o cliente dueño del business.
// =====================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import StoreOrderDetailClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Detalle de pedido | Tags Tienda",
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
        orderId
    } = await params;

    const businessId =
        id;

    const cookieStore =
        await cookies();

    const cookie =
        cookieStore.get("tags_session");

    if (!cookie) {
        return redirect("/login");
    }

    let session;

    try {
        session =
            JSON.parse(cookie.value);
    } catch (err) {
        console.error("INVALID SESSION:", err);
        return redirect("/login");
    }

    const isAdmin =
        session?.role === "admin";

    const isOwner =
        String(
            session?.business_id ||
            session?.businessId ||
            ""
        ) === String(businessId);

    if (!isAdmin && !isOwner) {
        return redirect("/dashboard");
    }

    return (
        <>
            <HeaderSwitcher />

            <StoreOrderDetailClient
                businessId={businessId}
                orderId={orderId}
                session={session}
                isAdmin={isAdmin}
            />
        </>
    );
}