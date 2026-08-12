import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import DomainsPageClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page() {
    const cookie = (await cookies()).get("tags_session");
    if (!cookie) return redirect("/login");
    let session;
    try { session = JSON.parse(cookie.value); } catch { return redirect("/login"); }
    if (session?.role !== "admin") return redirect("/login");
    return <><HeaderSwitcher /><DomainsPageClient /></>;
}
