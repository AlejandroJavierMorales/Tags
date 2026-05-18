// /dashboard/businesses/stats/page.jsx

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import BusinessStatsPageClient from "./pageClient";

import { getBusinessStatus } from "@/app/lib/getBusinessStatus";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }) {

  const businessId = searchParams?.business_id;

  // =====================================
  // ❌ NO BUSINESS ID
  // =====================================

  if (!businessId) {
    return redirect("/login");
  }

  // =====================================
  // 🔐 COOKIE SESSION
  // =====================================

  const cookie = cookies().get("tags_session");

  if (!cookie) {
    return redirect("/login");
  }

  let parsed;

  try {

    parsed = JSON.parse(cookie.value);

  } catch (err) {

    console.error("INVALID SESSION:", err);

    return redirect("/login");
  }

  // =====================================
  // ✅ ADMIN ACCESS
  // =====================================

  if (parsed?.role === "admin") {

    const businessStatus =
      await getBusinessStatus(businessId);

    if (!businessStatus) {
      return redirect("/login");
    }

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
    String(parsed?.businessId) !== String(businessId)
  ) {
    return redirect("/login");
  }

  // =====================================
  // 🔥 BUSINESS STATUS
  // =====================================

  const businessStatus =
    await getBusinessStatus(businessId);

  if (!businessStatus) {
    return redirect("/login");
  }

  // =====================================
  // ✅ CLIENT ACCESS
  // =====================================

  return (
    <>
      <BusinessStatsPageClient
        session={businessStatus}
        isAdmin={false}
      />
    </>
  );
}