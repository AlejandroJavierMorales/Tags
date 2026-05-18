import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import DashboardAdminClient from "./pageClient";

export const metadata = {

    robots: {

        index: false,
        follow: false,
    },
};

export default function Page() {
  const tagsSession = cookies().get("tags_session");

  // ❌ NO SESSION
  if (!tagsSession) {
    redirect("/login");
  }

  try {
    const parsed = JSON.parse(tagsSession.value);

    // ✅ ADMIN
    if (parsed?.role === "admin") {
      return <DashboardAdminClient session={parsed} />;
    }

    // ✅ BUSINESS
    if (parsed?.businessId) {
      redirect(`/dashboard/businesses/${parsed.businessId}`);
    }

  } catch (err) {
    console.error("INVALID SESSION", err);
  }

  // ❌ FALLBACK
  redirect("/login");
}