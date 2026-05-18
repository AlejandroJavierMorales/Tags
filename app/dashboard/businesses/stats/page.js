// /dashboard/businesses/stats/page.jsx

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HeaderSwitcher from "@/app/components/HeaderSwitcher";

import BusinessStatsPageClient from "./pageClient";

import { getBusinessStatus } from "@/app/lib/getBusinessStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }) {

    // =====================================
    // 🔥 NEXT 15
    // =====================================

    const params =
        await searchParams;

    const businessId =
        params?.business_id;

    // =====================================
    // ❌ NO BUSINESS ID
    // =====================================

    if (!businessId) {

        return redirect("/login");
    }

    // =====================================
    // 🔐 COOKIE SESSION
    // =====================================

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

        console.error(
            "INVALID SESSION:",
            err
        );

        return redirect("/login");
    }

    // =====================================
    // 🔥 BUSINESS STATUS
    // =====================================

    const businessStatus =
        await getBusinessStatus(
            businessId
        );

    if (!businessStatus) {

        return redirect("/login");
    }

    // =====================================
    // ✅ ADMIN ACCESS
    // =====================================

    if (parsed?.role === "admin") {

        return (
            <>
                <HeaderSwitcher />

                <BusinessStatsPageClient
                    session={businessStatus}
                    isAdmin={true}
                />
            </>
        );
    }

    // =====================================
    // 🔒 CLIENT VALIDATION
    // =====================================

    if (
        String(parsed?.businessId)
        !== String(businessId)
    ) {

        return redirect("/login");
    }

    // =====================================
    // ✅ CLIENT ACCESS
    // =====================================

    return (
        <BusinessStatsPageClient
            session={businessStatus}
            isAdmin={false}
        />
    );
}