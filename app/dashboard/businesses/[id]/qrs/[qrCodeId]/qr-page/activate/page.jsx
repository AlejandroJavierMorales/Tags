// =====================================
// PAGE: /dashboard/businesses/[id]/qrs/[qrCodeId]/qr-page/activate
// Descripción: Pantalla intermedia para activar QR-Page y definir slug.
// =====================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import QRPageActivateClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    let parsed;

    try {
        parsed =
            JSON.parse(cookie.value);
    } catch (err) {
        console.error("INVALID SESSION:", err);
        return redirect("/login");
    }

    if (
        parsed?.role !== "admin" &&
        String(parsed?.businessId) !== String(id)
    ) {
        return redirect("/login");
    }

    return (
        <>
            <HeaderSwitcher />

            <QRPageActivateClient
                businessId={id}
                qrCodeId={qrCodeId}
                session={parsed}
            />
        </>
    );
}