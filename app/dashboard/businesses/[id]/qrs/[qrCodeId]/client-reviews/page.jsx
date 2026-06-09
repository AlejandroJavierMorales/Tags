// =====================================
// PAGE: /dashboard/businesses/[id]/qrs/[qrCodeId]/client-reviews
// Descripción: Panel para administrar ClientsReviews de un QR.
// Acceso: admin o cliente dueño del business.
// =====================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import ClientReviewsAdminClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "ClientsReviews | Tags",
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
        qrCodeId
    } = await params;

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
        String(session?.business_id || session?.businessId || "") === String(id);

    if (!isAdmin && !isOwner) {
        return redirect("/dashboard");
    }

    return (
        <>
            <HeaderSwitcher />

            <ClientReviewsAdminClient
                businessId={id}
                qrCodeId={qrCodeId}
                session={session}
                isAdmin={isAdmin}
            />
        </>
    );
}