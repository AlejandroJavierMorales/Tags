import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import UsersAdminPageClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
    const cookie = (await cookies()).get("tags_session");
    if (!cookie) redirect("/login");
    let session = null;
    try { session = JSON.parse(cookie.value); } catch { redirect("/login"); }
    if (session?.role !== "admin") redirect("/login");
    return <><HeaderSwitcher /><UsersAdminPageClient /></>;
}
